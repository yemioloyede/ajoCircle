import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { query } from '../config/db';
import { encrypt } from '../utils/security';
import { resolveBank, createTransferRecipient, listBanks } from '../services/paystack';
import { audit, createNotification } from '../services/audit';
import { getCountryConfigService } from '../services/country-config';
import { getPaymentProviderSelector } from '../services/payment-provider-selector';

const r = Router();
r.use(requireAuth);

// ─── KYC ────────────────────────────────────────────────────────────────────

r.post('/kyc', async (req, res) => {
  const s = z.object({
    bvn: z.string().regex(/^\d{11}$/, 'BVN must be 11 digits'),
    nin: z.string().regex(/^\d{11}$/, 'NIN must be 11 digits').optional(),
  }).parse(req.body);

  // Upsert: one submission per user
  const existing = await query('select id from kyc_submissions where user_id=$1', [req.user!.id]);
  if (existing.rowCount) {
    const prev = await query("select status from kyc_submissions where user_id=$1", [req.user!.id]);
    if (prev.rows[0].status === 'VERIFIED') {
      return res.status(409).json({ error: 'KYC already verified' });
    }
  }

  const bvnEnc = encrypt(s.bvn);
  const ninEnc = s.nin ? encrypt(s.nin) : null;

  if (existing.rowCount) {
    await query(
      `update kyc_submissions set bvn_encrypted=$1, bvn_iv=$2, nin_encrypted=$3, nin_iv=$4, status='PENDING', updated_at=now() where user_id=$5`,
      [bvnEnc.encrypted, bvnEnc.iv, ninEnc?.encrypted ?? null, ninEnc?.iv ?? null, req.user!.id]
    );
  } else {
    await query(
      'insert into kyc_submissions(user_id,bvn_encrypted,bvn_iv,nin_encrypted,nin_iv) values($1,$2,$3,$4,$5)',
      [req.user!.id, bvnEnc.encrypted, bvnEnc.iv, ninEnc?.encrypted ?? null, ninEnc?.iv ?? null]
    );
  }

  await query("update users set kyc_status='PENDING' where id=$1", [req.user!.id]);
  await audit(req.user!.id, 'KYC_SUBMITTED', 'USER', req.user!.id, {
    details: `KYC submitted by user ${req.user!.id}`,
    hasNin: Boolean(s.nin),
  }, req);
  res.json({ message: 'KYC submitted for review', status: 'PENDING' });
});

r.get('/kyc', async (req, res) => {
  const row = await query(
    'select id, status, rejection_reason, created_at, updated_at from kyc_submissions where user_id=$1',
    [req.user!.id]
  );
  res.json({ kyc: row.rows[0] ?? null });
});

// ─── Bank Accounts ───────────────────────────────────────────────────────────

const payoutAccountSchema = z.object({
  countryCode: z.string().length(2).default('NG'),
  currencyCode: z.string().length(3).optional(),
  payoutMethodType: z.enum(['BANK_ACCOUNT', 'MOBILE_MONEY']).default('BANK_ACCOUNT'),
  providerName: z.string().min(2).max(50).optional(),
  bankCode: z.string().min(2).max(20).optional(),
  bankName: z.string().min(2).max(100).optional(),
  accountNumber: z.string().min(6).max(34),
  accountName: z.string().min(2).max(120).optional(),
  makePrimary: z.boolean().default(true),
});

r.get('/bank-accounts', async (req, res) => {
  const rows = await query(
    `select id, country_code, currency_code, payout_method_type, provider_name,
            bank_name, bank_code, account_name, is_primary, created_at
     from bank_accounts
     where user_id=$1
     order by is_primary desc, created_at desc`,
    [req.user!.id]
  );
  res.json({ accounts: rows.rows });
});

r.get('/banks', async (req, res) => {
  const countryCode = String(req.query.countryCode || 'NG').toUpperCase();
  if (countryCode !== 'NG') {
    res.json({
      banks: [],
      countryCode,
      supportsDirectory: false,
      message: 'Live bank directory lookup is only available for Nigeria right now. Enter the routing code manually for this country.',
    });
    return;
  }

  const banks = await listBanks();
  res.json({ banks, countryCode, supportsDirectory: true });
});

r.post('/bank-accounts', async (req, res) => {
  const s = payoutAccountSchema.parse(req.body);
  const countryService = getCountryConfigService();
  const selector = getPaymentProviderSelector();

  const countryCode = s.countryCode.toUpperCase();
  const country = await countryService.getCountry(countryCode);
  if (!country) return res.status(404).json({ error: 'Unsupported payout country' });

  const currencyCode = (s.currencyCode || country.primaryCurrencyCode).toUpperCase();
  const accountNumber = s.accountNumber.trim();
  const bankCode = s.bankCode?.trim();

  if (s.payoutMethodType === 'BANK_ACCOUNT' && !bankCode) {
    return res.status(400).json({ error: 'bankCode is required for bank account payouts' });
  }

  const provider = s.providerName
    ? await selector.getProviderByName(s.providerName.toLowerCase(), countryCode, currencyCode)
    : await selector.selectProvider({
      countryCode,
      currencyCode,
      operationType: 'PAYOUT',
    });
  const providerMeta = provider.getProviderMeta();

  let resolved: { account_name?: string; bank_name?: string; account_number?: string } = {};
  try {
    if (providerMeta.name === 'paystack' && countryCode === 'NG' && bankCode) {
      resolved = await resolveBank(accountNumber, bankCode);
    } else {
      const verification = await provider.verifyAccountDetails(accountNumber, bankCode);
      if (!verification.isValid) {
        return res.status(400).json({ error: verification.message || 'Could not verify payout destination' });
      }
      resolved = {
        account_name: verification.accountName,
        bank_name: verification.bankName,
        account_number: verification.accountNumber,
      };
    }
  } catch (e: any) {
    return res.status(400).json({ error: 'Could not verify payout destination: ' + e.message });
  }

  let recipientId = '';
  let recipientDetails: Record<string, any> | undefined;
  try {
    if (providerMeta.name === 'paystack' && countryCode === 'NG' && bankCode) {
      const recipient = await createTransferRecipient(resolved.account_name || s.accountName || 'Recipient', accountNumber, bankCode);
      recipientId = recipient.recipient_code;
      recipientDetails = recipient;
    } else {
      const recipient = await provider.createPaymentRecipient(
        accountNumber,
        s.accountName?.trim() || resolved.account_name || 'Recipient',
        bankCode,
        s.payoutMethodType,
        { countryCode, currencyCode, payoutMethodType: s.payoutMethodType }
      );
      if (!recipient.success) {
        return res.status(400).json({ error: recipient.message || 'Could not create payout recipient' });
      }
      recipientId = recipient.recipientId;
      recipientDetails = recipient.details;
    }
  } catch (e: any) {
    return res.status(400).json({ error: 'Could not create payout recipient: ' + e.message });
  }

  const acctEnc = encrypt(accountNumber);
  const bankName = s.bankName?.trim() || resolved.bank_name || (s.payoutMethodType === 'MOBILE_MONEY' ? 'Mobile Money' : 'Bank');
  const accountName = s.accountName?.trim() || resolved.account_name || 'Recipient';

  // Optionally demote other primary accounts
  if (s.makePrimary) {
    await query('update bank_accounts set is_primary=false where user_id=$1', [req.user!.id]);
  }

  const row = await query(
    `insert into bank_accounts(
        user_id,country_code,currency_code,payout_method_type,provider_name,
        bank_name,bank_code,account_number_encrypted,account_number_iv,account_name,
        provider_recipient_id,provider_metadata,paystack_recipient_code,is_primary
      )
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      returning id,country_code,currency_code,payout_method_type,provider_name,bank_name,bank_code,account_name,is_primary,created_at`,
    [
      req.user!.id,
      countryCode,
      currencyCode,
      s.payoutMethodType,
      providerMeta.name,
      bankName,
      bankCode || 'MANUAL',
      acctEnc.encrypted,
      acctEnc.iv,
      accountName,
      recipientId,
      JSON.stringify({
        verification: resolved,
        recipient: recipientDetails || {},
      }),
      providerMeta.name === 'paystack' ? recipientId : null,
      s.makePrimary,
    ]
  );

  await audit(req.user!.id, 'BANK_ACCOUNT_ADDED', 'USER', req.user!.id, {
    details: `Payout account added (${bankName})`,
    countryCode,
    currencyCode,
    payoutMethodType: s.payoutMethodType,
    providerName: providerMeta.name,
    bankName,
    bankCode: bankCode || 'MANUAL',
    accountEnding: accountNumber.slice(-4),
  }, req);
  res.json({ account: row.rows[0] });
});

r.delete('/bank-accounts/:id', async (req, res) => {
  const row = await query('select id from bank_accounts where id=$1 and user_id=$2', [req.params.id, req.user!.id]);
  if (!row.rowCount) return res.status(404).json({ error: 'Bank account not found' });
  await query('delete from bank_accounts where id=$1', [req.params.id]);
  await audit(req.user!.id, 'BANK_ACCOUNT_REMOVED', 'USER', req.user!.id, {
    details: `Bank account removed (${req.params.id})`,
    accountId: req.params.id,
  }, req);
  res.json({ message: 'Bank account removed' });
});

r.patch('/bank-accounts/:id/primary', async (req, res) => {
  const row = await query('select id from bank_accounts where id=$1 and user_id=$2', [req.params.id, req.user!.id]);
  if (!row.rowCount) return res.status(404).json({ error: 'Bank account not found' });
  await query('update bank_accounts set is_primary=false where user_id=$1', [req.user!.id]);
  await query('update bank_accounts set is_primary=true where id=$1', [req.params.id]);
  res.json({ message: 'Primary bank account updated' });
});

export default r;
