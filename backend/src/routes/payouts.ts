import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';
import { query, tx } from '../config/db';
import { createLedgerEntry } from '../services/ledger';
import { initiateTransfer } from '../services/paystack';
import { v4 as uuid } from 'uuid';
import { audit, createNotification } from '../services/audit';

const r = Router();
r.use(requireAuth);

r.post('/request', async (req, res) => {
  const s = z.object({
    groupId: z.string().uuid(),
    recipientUserId: z.string().uuid(),
    amountKobo: z.number().int().positive().optional(),
  }).parse(req.body);

  const g = await query(
    'select id, contribution_amount_kobo from savings_groups where id=$1 and status=$2',
    [s.groupId, 'ACTIVE']
  );
  if (!g.rowCount) return res.status(404).json({ error: 'Group not found or not active' });

  const admin = await query(
    `select id from group_members
     where group_id=$1 and user_id=$2 and role=$3 and status=$4`,
    [s.groupId, req.user!.id, 'GROUP_ADMIN', 'ACTIVE']
  );
  if (!admin.rowCount) return res.status(403).json({ error: 'Only group admins can request payouts' });

  const recipient = await query(
    `select id from group_members
     where group_id=$1 and user_id=$2 and status=$3`,
    [s.groupId, s.recipientUserId, 'ACTIVE']
  );
  if (!recipient.rowCount) return res.status(400).json({ error: 'Recipient must be an active member of the group' });

  const pending = await query(
    `select id from payouts
     where group_id=$1 and status='PENDING_REVIEW'
     order by created_at desc limit 1`,
    [s.groupId]
  );
  if (pending.rowCount) return res.status(409).json({ error: 'A payout request is already pending review for this group' });

  const activeMembers = await query(
    `select count(*) from group_members
     where group_id=$1 and status='ACTIVE'`,
    [s.groupId]
  );
  const memberCount = Math.max(Number(activeMembers.rows[0].count || 0), 1);
  const computedAmount = Number(g.rows[0].contribution_amount_kobo) * memberCount;
  const amountKobo = s.amountKobo ?? computedAmount;

  const p = await query(
    "insert into payouts(group_id,recipient_user_id,amount_kobo,status,requested_by) values($1,$2,$3,$4,$5) returning *",
    [s.groupId, s.recipientUserId, amountKobo, 'PENDING_REVIEW', req.user!.id]
  );
  await audit(req.user!.id, 'PAYOUT_REQUESTED', 'PAYOUT', p.rows[0].id, {
    ...s,
    amountKobo,
    details: `Group admin ${req.user!.id} requested payout for group ${s.groupId}`,
  }, req);
  res.json(p.rows[0]);
});

r.post('/:id/approve', requireRole('COMPLIANCE_ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const id = String(req.params.id);
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
    if (!bankAccount.rows[0].paystack_recipient_code) throw new Error('Recipient bank account has no Paystack transfer code');

    const ref = 'PAYOUT_' + uuid().replace(/-/g, '');
    await createLedgerEntry(c, {
      walletId: p.rows[0].wallet_id, type: 'PAYOUT', direction: 'DEBIT',
      amountKobo: p.rows[0].amount_kobo, reference: ref,
      meta: { payoutId: id, recipient: p.rows[0].recipient_user_id },
    });

    const transfer = await initiateTransfer(
      p.rows[0].amount_kobo, bankAccount.rows[0].paystack_recipient_code,
      'AjoCircle rotational payout', ref
    );

    const transferCode = transfer?.transfer_code ?? null;
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