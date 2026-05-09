import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { z } from 'zod';
import { query } from '../config/db';
import { initializePayment } from '../services/paystack';
import { v4 as uuid } from 'uuid';
import { audit } from '../services/audit';

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

export default r;
