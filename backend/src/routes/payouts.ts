import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';
import { query, tx } from '../config/db';
import { createLedgerEntry } from '../services/ledger';
import { v4 as uuid } from 'uuid';
import { audit, createNotification } from '../services/audit';
import { getPaymentProviderSelector } from '../services/payment-provider-selector';

const r = Router();
r.use(requireAuth);

r.post('/request', async (req, res) => {
  const s = z.object({ groupId: z.string().uuid(), amount: z.number().int().positive() }).parse(req.body);

  const g = await query(
    `select g.* from savings_groups g
     join group_members gm on gm.group_id=g.id
     where g.id=$1 and gm.user_id=$2 and gm.status=$3 and g.status=$4`,
    [s.groupId, req.user!.id, 'ACTIVE', 'ACTIVE']
  );
  if (!g.rowCount) return res.status(404).json({ error: 'Group not found, not active, or you are not an active member' });

  const group = g.rows[0];
  const currency = group.currency || 'NGN';
  const amount = s.amount;

  // Enforce group currency and payout logic
  if (amount < 1000) {
    return res.status(400).json({ error: 'Payout amount is below the minimum allowed' });
  }

  const ref = 'AJO_PAYOUT_' + uuid().replace(/-/g, '');
  const payout = await query(
    'insert into payouts(group_id,user_id,amount_kobo,status,payment_reference,currency) values($1,$2,$3,$4,$5,$6) returning *',
    [s.groupId, req.user!.id, amount, 'PENDING', ref, currency]
  );

  // Provider selection (multi-currency aware)
  const selector = getPaymentProviderSelector();
  // For MVP, use user's country/currency or default to NG/NGN
  const provider = await selector.selectProvider({
    countryCode: group.country_code || 'NG',
    currencyCode: currency,
    operationType: 'PAYOUT',
    amount,
  });

  // For MVP, assume recipientId is userId (should be bank account/provider-recipient in production)
  const recipientId = String(req.user!.id);
  const pay = await provider.initiatePayout(amount / 100, currency, recipientId, 'AjoCircle payout', {
    payoutId: payout.rows[0].id,
    groupId: s.groupId,
    userId: req.user!.id,
  });

  await audit(req.user!.id, 'PAYOUT_REQUESTED', 'PAYOUT', payout.rows[0].id, { reference: ref }, req);
  res.json({ payout: payout.rows[0], payment: pay });
});

r.post('/:id/approve', requireRole('COMPLIANCE_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const id = String(req.params.id);
  const selector = getPaymentProviderSelector();
  const result = await tx(async (c) => {
    const p = await c.query(
      `select p.*, g.wallet_id from payouts p join savings_groups g on g.id=p.group_id where p.id=$1 for update`,
      [id]
    );
    if (!p.rowCount) throw new Error('Payout not found');
    if (p.rows[0].status !== 'PENDING_REVIEW') throw new Error('Payout is not in PENDING_REVIEW state');

    const bankAccount = await c.query(
      "select * from bank_accounts where user_id=$1 and is_primary=true limit 1",
      [p.rows[0].recipient_user_id]
    );
    if (!bankAccount.rowCount) throw new Error('Recipient has no primary bank account set up');
    const payoutAccount = bankAccount.rows[0];
    const providerRecipientId = payoutAccount.provider_recipient_id || payoutAccount.paystack_recipient_code;
    if (!providerRecipientId) throw new Error('Recipient payout account has no provider recipient id');

    const provider = payoutAccount.provider_name
      ? await selector.getProviderByName(
        payoutAccount.provider_name,
        payoutAccount.country_code || 'NG',
        payoutAccount.currency_code || 'NGN'
      )
      : await selector.selectProvider({
        countryCode: payoutAccount.country_code || 'NG',
        currencyCode: payoutAccount.currency_code || 'NGN',
        operationType: 'PAYOUT',
      });

    const ref = 'PAYOUT_' + uuid().replace(/-/g, '');
    await createLedgerEntry(c, {
      walletId: p.rows[0].wallet_id, type: 'PAYOUT', direction: 'DEBIT',
      amountKobo: p.rows[0].amount_kobo, reference: ref,
      meta: { payoutId: id, recipient: p.rows[0].recipient_user_id },
    });

    const transfer = await provider.initiatePayout(
      p.rows[0].amount_kobo / 100,
      payoutAccount.currency_code || 'NGN',
      providerRecipientId,
      'AjoCircle rotational payout',
      { payoutId: id, reference: ref }
    );

    const transferCode = transfer?.providerReference ?? null;
    const upd = await c.query(
      "update payouts set status='APPROVED', approved_by=$1, approved_at=now(), transfer_reference=$2, transfer_code=$3, provider_payload=$4 where id=$5 returning *",
      [req.user!.id, ref, transferCode, JSON.stringify(transfer), id]
    );
    return upd.rows[0];
  });

  await audit(req.user!.id, 'PAYOUT_APPROVED', 'PAYOUT', id, {
    details: `Admin ${req.user!.id} approved payout ${id}`,
    payoutId: id,
    approvedBy: req.user!.id,
  }, req);
  try {
    const payoutRow = await query('select recipient_user_id, amount_kobo from payouts where id=$1', [id]);
    if (payoutRow.rows[0]) {
      await createNotification(payoutRow.rows[0].recipient_user_id, 'PAYOUT_APPROVED', 'Payout Approved',
        `Your payout of N${(payoutRow.rows[0].amount_kobo / 100).toLocaleString()} has been approved and is being processed.`);
    }
  } catch { /* non-blocking */ }
  res.json(result);
});

r.get('/mine', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before as string | undefined;

  const rows = before
    ? await query(
      `select p.*, g.name as group_name from payouts p
       join savings_groups g on g.id=p.group_id
       where p.recipient_user_id=$1 and p.created_at < $2
       order by p.created_at desc limit $3`,
      [req.user!.id, before, limit]
    )
    : await query(
      `select p.*, g.name as group_name from payouts p
       join savings_groups g on g.id=p.group_id
       where p.recipient_user_id=$1
       order by p.created_at desc limit $2`,
      [req.user!.id, limit]
    );

  res.json({ payouts: rows.rows, nextCursor: rows.rows[rows.rows.length - 1]?.created_at ?? null });
});

r.get('/', requireRole('COMPLIANCE_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const [data, count] = await Promise.all([
    query(
      `select p.*, u.full_name as recipient_name, u.email as recipient_email, g.name as group_name
       from payouts p
       join users u on u.id=p.recipient_user_id
       join savings_groups g on g.id=p.group_id
       order by p.created_at desc limit $1 offset $2`,
      [limit, offset]
    ),
    query('select count(*) from payouts'),
  ]);
  res.json({ payouts: data.rows, total: Number(count.rows[0].count), limit, offset });
});

export default r;