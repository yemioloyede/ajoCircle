import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { query, tx } from '../config/db';
import { initializePayment, verifyTransaction } from '../services/paystack';
import { createLedgerEntry } from '../services/ledger';
import { audit, createNotification } from '../services/audit';
import { env } from '../config/env';
import { v4 as uuid } from 'uuid';

const r = Router();
r.use(requireAuth);

const MIN_CONTRIBUTION_KOBO = 100; // ₦1 minimum

r.post('/initialize', async (req, res) => {
  const s = z.object({ groupId: z.string().uuid() }).parse(req.body);

  const g = await query(
    `select g.* from savings_groups g
     join group_members gm on gm.group_id=g.id
     where g.id=$1 and gm.user_id=$2 and gm.status=$3 and g.status=$4`,
    [s.groupId, req.user!.id, 'ACTIVE', 'ACTIVE']
  );
  if (!g.rowCount) return res.status(404).json({ error: 'Group not found, not active, or you are not an active member' });

  const amount = g.rows[0].contribution_amount_kobo;
  if (amount < MIN_CONTRIBUTION_KOBO) {
    return res.status(400).json({ error: 'Contribution amount is below the minimum allowed' });
  }

  const ref = 'AJO_' + uuid().replace(/-/g, '');
  const c = await query(
    'insert into contributions(group_id,user_id,amount_kobo,status,payment_reference) values($1,$2,$3,$4,$5) returning *',
    [s.groupId, req.user!.id, amount, 'PENDING', ref]
  );
  const user = await query('select email,full_name from users where id=$1', [req.user!.id]);
  const pay = await initializePayment(user.rows[0].email, amount, ref, {
    contributionId: c.rows[0].id,
    groupId: s.groupId,
    userId: req.user!.id,
  });
  await audit(req.user!.id, 'CONTRIBUTION_INITIALIZED', 'CONTRIBUTION', c.rows[0].id, { reference: ref }, req);
  res.json({ contribution: c.rows[0], payment: pay });
});

r.get('/mine', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before as string | undefined;

  let rows;
  if (before) {
    rows = await query(
      `select c.*, g.name as group_name from contributions c
       join savings_groups g on g.id=c.group_id
       where c.user_id=$1 and c.created_at < $2
       order by c.created_at desc limit $3`,
      [req.user!.id, before, limit]
    );
  } else {
    rows = await query(
      `select c.*, g.name as group_name from contributions c
       join savings_groups g on g.id=c.group_id
       where c.user_id=$1
       order by c.created_at desc limit $2`,
      [req.user!.id, limit]
    );
  }
  res.json({ contributions: rows.rows, nextCursor: rows.rows[rows.rows.length - 1]?.created_at ?? null });
});

// Manually verify a payment with Paystack — used by mobile after returning from the payment URL
r.post('/verify', async (req, res, next) => {
  try {
    const { reference } = z.object({ reference: z.string().min(1) }).parse(req.body);

    // Only allow the owner to verify their own contribution
    const existing = await query(
      `select c.*, g.wallet_id from contributions c
       join savings_groups g on g.id=c.group_id
       where c.payment_reference=$1 and c.user_id=$2`,
      [reference, req.user!.id]
    );
    if (!existing.rowCount) return res.status(404).json({ error: 'Contribution not found for this account' });
    const row = existing.rows[0];

    if (row.status === 'SUCCESS') {
      return res.json({ success: true, status: 'SUCCESS', message: 'Already confirmed — your contribution is recorded.' });
    }

    // Ask Paystack directly
    let paystackData: any;
    try {
      paystackData = await verifyTransaction(reference);
    } catch (e: any) {
      return res.status(502).json({ error: 'Could not reach Paystack: ' + e.message });
    }

    if (paystackData.status !== 'success') {
      return res.status(402).json({ error: `Paystack status is "${paystackData.status}" — payment may still be processing. Please wait a moment and try again.` });
    }

    if (!row.wallet_id) {
      return res.status(500).json({ error: 'Group wallet not configured. Contact support.' });
    }

    // Run the same ledger logic as the webhook handler — all inside try-catch so errors reach the client
    await tx(async (c) => {
      const contrib = await c.query(
        `select c.*, g.wallet_id from contributions c
         join savings_groups g on g.id=c.group_id
         where c.payment_reference=$1 for update`,
        [reference]
      );
      if (!contrib.rowCount) return;
      const r = contrib.rows[0];
      if (r.status === 'SUCCESS') return; // idempotency

      await c.query(
        "update contributions set status='SUCCESS', paid_at=now(), provider_payload=$1 where id=$2",
        [JSON.stringify(paystackData), r.id]
      );

      const feeBps = env.platformFeeBps;
      const feeKobo = Math.floor((r.amount_kobo * feeBps) / 10000);
      const netKobo = r.amount_kobo - feeKobo;

      // Use a unique reference suffix to avoid clashes with the webhook if it also fires
      const ledgerRef = reference + '_VERIFY';
      // Check if ledger entry already exists (webhook may have beaten us to it)
      const existingLedger = await c.query(
        `select id from ledger_entries where reference=$1 or reference=$2`,
        [reference, ledgerRef]
      );
      if (!existingLedger.rowCount) {
        await createLedgerEntry(c, {
          walletId: r.wallet_id,
          type: 'CONTRIBUTION',
          direction: 'CREDIT',
          amountKobo: netKobo,
          reference: ledgerRef,
          meta: { contributionId: r.id, userId: r.user_id, grossKobo: r.amount_kobo, feeKobo, source: 'manual_verify' },
        });

        if (feeKobo > 0) {
          await createLedgerEntry(c, {
            walletId: r.wallet_id,
            type: 'PLATFORM_FEE',
            direction: 'DEBIT',
            amountKobo: feeKobo,
            reference: ledgerRef + '_FEE',
            meta: { contributionId: r.id, feeBps },
          });
        }
      }
    });

    try {
      await createNotification(
        req.user!.id,
        'CONTRIBUTION_SUCCESS',
        'Contribution Confirmed',
        `₦${(row.amount_kobo / 100).toLocaleString()} has been credited to your group.`
      );
    } catch { /* non-critical */ }

    await audit(req.user!.id, 'CONTRIBUTION_VERIFIED', 'CONTRIBUTION', row.id, { reference }, req);
    res.json({ success: true, status: 'SUCCESS', message: 'Payment confirmed — your contribution has been recorded.' });
  } catch (err) {
    next(err);
  }
});
export default r;
