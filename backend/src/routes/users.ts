import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { query } from '../config/db';
import { encrypt, decrypt } from '../utils/security';
import { resolveBank, createTransferRecipient } from '../services/paystack';
import { audit, createNotification } from '../services/audit';

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
  res.json(row.rows[0] ?? null);
});

// ─── Bank Accounts ───────────────────────────────────────────────────────────

r.get('/bank-accounts', async (req, res) => {
  const rows = await query(
    'select id, bank_name, bank_code, account_name, is_primary, created_at from bank_accounts where user_id=$1 order by is_primary desc, created_at desc',
    [req.user!.id]
  );
  res.json(rows.rows);
});

r.post('/bank-accounts', async (req, res) => {
  const s = z.object({
    bankCode: z.string().min(3).max(10),
    bankName: z.string().min(2).max(100),
    accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
    makePrimary: z.boolean().default(true),
  }).parse(req.body);

  // Resolve account with Paystack
  let resolved: any;
  try {
    resolved = await resolveBank(s.accountNumber, s.bankCode);
  } catch (e: any) {
    return res.status(400).json({ error: 'Could not resolve bank account: ' + e.message });
  }

  // Create Paystack transfer recipient
  let recipient: any;
  try {
    recipient = await createTransferRecipient(resolved.account_name, s.accountNumber, s.bankCode);
  } catch (e: any) {
    return res.status(400).json({ error: 'Could not create transfer recipient: ' + e.message });
  }

  const acctEnc = encrypt(s.accountNumber);

  // Optionally demote other primary accounts
  if (s.makePrimary) {
    await query('update bank_accounts set is_primary=false where user_id=$1', [req.user!.id]);
  }

  const row = await query(
    `insert into bank_accounts(user_id,bank_name,bank_code,account_number_encrypted,account_number_iv,account_name,paystack_recipient_code,is_primary)
     values($1,$2,$3,$4,$5,$6,$7,$8) returning id,bank_name,bank_code,account_name,is_primary,created_at`,
    [req.user!.id, s.bankName, s.bankCode, acctEnc.encrypted, acctEnc.iv, resolved.account_name, recipient.recipient_code, s.makePrimary]
  );

  await audit(req.user!.id, 'BANK_ACCOUNT_ADDED', 'USER', req.user!.id, {
    details: `Bank account added (${s.bankName})`,
    bankName: s.bankName,
    bankCode: s.bankCode,
    accountEnding: s.accountNumber.slice(-4),
  }, req);
  res.json(row.rows[0]);
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
