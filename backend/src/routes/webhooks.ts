import { Router } from 'express';
import { tx } from '../config/db';
import { verifyPaystackSignature } from '../services/paystack';
import { createLedgerEntry, reverseLedgerEntry } from '../services/ledger';
import { audit, createNotification } from '../services/audit';
import { env } from '../config/env';

const r = Router();

r.post('/paystack', async (req: any, res) => {
  const raw = req.rawBody || JSON.stringify(req.body);
  if (!verifyPaystackSignature(raw, req.headers['x-paystack-signature'] as string)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  // --- charge.success: contribution payment confirmed ---
  if (event.event === 'charge.success') {
    const ref = event.data.reference;
    await tx(async (c) => {
      const contrib = await c.query(
        `select c.*, g.wallet_id from contributions c
         join savings_groups g on g.id=c.group_id
         where c.payment_reference=$1 for update`,
        [ref]
      );
      if (!contrib.rowCount) return;
      const row = contrib.rows[0];
      if (row.status === 'SUCCESS') return; // idempotency guard

      await c.query(
        "update contributions set status='SUCCESS', paid_at=now(), provider_payload=$1 where id=$2",
        [JSON.stringify(event.data), row.id]
      );

      // Platform fee deduction
      const feeBps = env.platformFeeBps;
      const feeKobo = Math.floor((row.amount_kobo * feeBps) / 10000);
      const netKobo = row.amount_kobo - feeKobo;

      // Credit full amount to group wallet then debit fee
      await createLedgerEntry(c, {
        walletId: row.wallet_id,
        type: 'CONTRIBUTION',
        direction: 'CREDIT',
        amountKobo: netKobo,
        reference: ref,
        meta: { contributionId: row.id, userId: row.user_id, grossKobo: row.amount_kobo, feeKobo },
      });

      if (feeKobo > 0) {
        await createLedgerEntry(c, {
          walletId: row.wallet_id,
          type: 'PLATFORM_FEE',
          direction: 'DEBIT',
          amountKobo: feeKobo,
          reference: ref + '_FEE',
          meta: { contributionId: row.id, feeBps },
        });
      }
    });

    // Notify user outside of transaction
    try {
      const contribRow = await import('../config/db').then(db =>
        db.query(`select c.user_id, c.amount_kobo, g.name from contributions c join savings_groups g on g.id=c.group_id where c.payment_reference=$1`, [ref])
      );
      if (contribRow.rows[0]) {
        const r = contribRow.rows[0];
        await createNotification(r.user_id, 'CONTRIBUTION_SUCCESS', 'Contribution Successful', `₦${(r.amount_kobo / 100).toLocaleString()} credited to ${r.name}.`);
      }
    } catch { /* notification failure must not break response */ }

    await audit(null, 'PAYSTACK_CHARGE_SUCCESS', 'PAYMENT', ref, { event: event.event });
  }

  // --- transfer.success: payout sent to recipient ---
  if (event.event === 'transfer.success') {
    const transferCode = event.data.transfer_code;
    const ref = event.data.reference;
    await tx(async (c) => {
      const payout = await c.query(
        `select p.*, g.wallet_id from payouts p join savings_groups g on g.id=p.group_id
         where p.transfer_reference=$1 for update`,
        [ref]
      );
      if (!payout.rowCount) return;
      const row = payout.rows[0];
      if (row.status === 'PAID') return;

      await c.query(
        "update payouts set status='PAID', transfer_code=$1, provider_payload=$2 where id=$3",
        [transferCode, JSON.stringify(event.data), row.id]
      );

      await createLedgerEntry(c, {
        walletId: row.wallet_id,
        type: 'PAYOUT_COMPLETED',
        direction: 'CREDIT',
        amountKobo: 0, // informational — debit already done at approve step
        reference: ref + '_PAID',
        meta: { payoutId: row.id, transferCode },
      }).catch(() => {
        // Zero-amount entries may fail balance check; record as metadata only
      });
    });

    try {
      const payoutRow = await import('../config/db').then(db =>
        db.query(`select recipient_user_id, amount_kobo from payouts where transfer_reference=$1`, [ref])
      );
      if (payoutRow.rows[0]) {
        const p = payoutRow.rows[0];
        await createNotification(p.recipient_user_id, 'PAYOUT_PAID', 'Payout Sent!', `₦${(p.amount_kobo / 100).toLocaleString()} has been sent to your bank account.`);
      }
    } catch { /* notification failure must not break response */ }

    await audit(null, 'TRANSFER_SUCCESS', 'PAYOUT', ref, { transferCode });
  }

  // --- transfer.failed: payout failed, reverse the ledger debit ---
  if (event.event === 'transfer.failed' || event.event === 'transfer.reversed') {
    const ref = event.data.reference;
    await tx(async (c) => {
      const payout = await c.query(
        `select p.*, g.wallet_id from payouts p join savings_groups g on g.id=p.group_id
         where p.transfer_reference=$1 for update`,
        [ref]
      );
      if (!payout.rowCount) return;
      const row = payout.rows[0];
      if (row.status === 'FAILED') return;

      await c.query(
        "update payouts set status='FAILED', provider_payload=$1 where id=$2",
        [JSON.stringify(event.data), row.id]
      );

      // Reverse the DEBIT that was created at approval
      await reverseLedgerEntry(c, {
        walletId: row.wallet_id,
        type: 'PAYOUT_REVERSAL',
        originalDirection: 'DEBIT',
        amountKobo: row.amount_kobo,
        originalReference: ref,
        meta: { payoutId: row.id, reason: event.event },
      });
    });

    try {
      const payoutRow = await import('../config/db').then(db =>
        db.query(`select recipient_user_id, amount_kobo from payouts where transfer_reference=$1`, [ref])
      );
      if (payoutRow.rows[0]) {
        const p = payoutRow.rows[0];
        await createNotification(p.recipient_user_id, 'PAYOUT_FAILED', 'Payout Failed', `Your payout of ₦${(p.amount_kobo / 100).toLocaleString()} failed. Our team is reviewing it.`);
      }
    } catch { /* notification failure must not break response */ }

    await audit(null, 'TRANSFER_FAILED', 'PAYOUT', ref, { event: event.event });
  }

  res.json({ received: true });
});

export default r;
