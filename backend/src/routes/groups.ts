import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { query, tx } from '../config/db';
import { audit } from '../services/audit';
import { v4 as uuid } from 'uuid';

const r = Router();
r.use(requireAuth);

r.post('/', async (req, res) => {
  const s = z.object({
    name: z.string().min(2).max(100),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    contributionAmountKobo: z.number().int().min(100, 'Minimum contribution is ₦1'),
    maxMembers: z.number().int().min(3).max(100),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'),
  }).parse(req.body);

  const start = new Date(s.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start <= today) return res.status(400).json({ error: 'startDate must be in the future' });

  const invite = Math.random().toString(36).slice(2, 8).toUpperCase();
  const out = await tx(async (c) => {
    const g = await c.query(
      'insert into savings_groups(name,frequency,contribution_amount_kobo,max_members,start_date,created_by,invite_code,status) values($1,$2,$3,$4,$5,$6,$7,$8) returning *',
      [s.name, s.frequency, s.contributionAmountKobo, s.maxMembers, s.startDate, req.user!.id, invite, 'ACTIVE']
    );
    const wallet = await c.query(
      "insert into wallets(owner_type, owner_id, currency) values($1,$2,$3) returning *",
      ['GROUP', g.rows[0].id, 'NGN']
    );
    await c.query('update savings_groups set wallet_id=$1 where id=$2', [wallet.rows[0].id, g.rows[0].id]);
    await c.query(
      'insert into group_members(group_id,user_id,role,payout_position,status) values($1,$2,$3,$4,$5)',
      [g.rows[0].id, req.user!.id, 'GROUP_ADMIN', 1, 'ACTIVE']
    );
    return g.rows[0];
  });
  await audit(req.user!.id, 'GROUP_CREATED', 'GROUP', out.id, out, req);
  res.json(out);
});

r.post('/join', async (req, res) => {
  const s = z.object({ inviteCode: z.string().min(4).max(20) }).parse(req.body);
  const g = await query('select * from savings_groups where invite_code=$1 and status=$2', [s.inviteCode.toUpperCase(), 'ACTIVE']);
  if (!g.rowCount) return res.status(404).json({ error: 'Invalid invite code or group is not active' });
  const count = await query('select count(*) from group_members where group_id=$1 and status=$2', [g.rows[0].id, 'ACTIVE']);
  if (Number(count.rows[0].count) >= g.rows[0].max_members) return res.status(400).json({ error: 'Group is full' });
  const exists = await query('select id from group_members where group_id=$1 and user_id=$2', [g.rows[0].id, req.user!.id]);
  if (exists.rowCount) return res.status(409).json({ error: 'Already a member of this group' });
  const pos = Number(count.rows[0].count) + 1;
  await query(
    'insert into group_members(group_id,user_id,role,payout_position,status) values($1,$2,$3,$4,$5)',
    [g.rows[0].id, req.user!.id, 'MEMBER', pos, 'ACTIVE']
  );
  await audit(req.user!.id, 'GROUP_JOINED', 'GROUP', g.rows[0].id, { position: pos }, req);
  res.json({ message: 'Joined group', group: g.rows[0], payoutPosition: pos });
});

r.post('/:id/members', async (req, res) => {
  const id = req.params.id;
  const s = z.object({
    email: z.string().email().optional(),
    phone: z.string().min(10).max(20).optional(),
  }).parse(req.body);

  const email = s.email?.toLowerCase().trim();
  const phone = s.phone?.trim();
  if (!email && !phone) return res.status(400).json({ error: 'Provide email or phone' });

  const group = await query('select id,max_members,status from savings_groups where id=$1', [id]);
  if (!group.rowCount) return res.status(404).json({ error: 'Group not found' });
  if (group.rows[0].status !== 'ACTIVE') return res.status(400).json({ error: 'Group is not active' });

  const admin = await query(
    `select id from group_members
     where group_id=$1 and user_id=$2 and role=$3 and status=$4`,
    [id, req.user!.id, 'GROUP_ADMIN', 'ACTIVE']
  );
  if (!admin.rowCount) return res.status(403).json({ error: 'Only group admins can add members' });

  const user = email
    ? await query('select id,email,full_name,phone from users where lower(email)=lower($1)', [email])
    : await query('select id,email,full_name,phone from users where phone=$1', [phone]);
  if (!user.rowCount) return res.status(404).json({ error: 'User not found. Ask them to create an account, then use the invite link/code.' });

  const activeCount = await query('select count(*) from group_members where group_id=$1 and status=$2', [id, 'ACTIVE']);
  if (Number(activeCount.rows[0].count) >= group.rows[0].max_members) return res.status(400).json({ error: 'Group is full' });

  const exists = await query('select id from group_members where group_id=$1 and user_id=$2', [id, user.rows[0].id]);
  if (exists.rowCount) return res.status(409).json({ error: 'User is already in this group' });

  const pos = Number(activeCount.rows[0].count) + 1;
  await query(
    'insert into group_members(group_id,user_id,role,payout_position,status) values($1,$2,$3,$4,$5)',
    [id, user.rows[0].id, 'MEMBER', pos, 'ACTIVE']
  );

  await audit(req.user!.id, 'GROUP_MEMBER_ADDED', 'GROUP', id, { addedUserId: user.rows[0].id, position: pos }, req);
  res.json({
    message: 'Member added successfully',
    member: {
      id: user.rows[0].id,
      email: user.rows[0].email,
      full_name: user.rows[0].full_name,
      phone: user.rows[0].phone,
      payout_position: pos,
      role: 'MEMBER',
      status: 'ACTIVE',
    },
  });
});

r.get('/', async (req, res) => {
  const data = await query(
    `select g.*, gm.role as member_role, gm.payout_position
     from savings_groups g
     join group_members gm on gm.group_id=g.id
     where gm.user_id=$1
     order by g.created_at desc`,
    [req.user!.id]
  );
  res.json(data.rows);
});

r.get('/:id', async (req, res) => {
  const id = req.params.id;
  const g = await query('select * from savings_groups where id=$1', [id]);
  if (!g.rowCount) return res.status(404).json({ error: 'Not found' });
  const members = await query(
    'select gm.*, u.full_name,u.email,u.phone from group_members gm join users u on u.id=gm.user_id where gm.group_id=$1 order by gm.payout_position',
    [id]
  );
  const ledger = await query(
    'select * from ledger_entries where wallet_id=$1 order by created_at desc limit 50',
    [g.rows[0].wallet_id]
  );
  res.json({ group: g.rows[0], members: members.rows, ledger: ledger.rows });
});

r.get('/:id/analytics', async (req, res) => {
  const id = req.params.id;
  const g = await query('select * from savings_groups where id=$1', [id]);
  if (!g.rowCount) return res.status(404).json({ error: 'Not found' });

  const [totalContrib, memberCount, successfulPayouts] = await Promise.all([
    query(`select coalesce(sum(amount_kobo),0) as total, count(*) as count from contributions where group_id=$1 and status='SUCCESS'`, [id]),
    query(`select count(*) from group_members where group_id=$1 and status='ACTIVE'`, [id]),
    query(`select count(*) from payouts where group_id=$1 and status='PAID'`, [id]),
  ]);

  const expectedContributions = Number(memberCount.rows[0].count);
  const successCount = Number(totalContrib.rows[0].count);
  const completionRate = expectedContributions > 0 ? Math.min(successCount / expectedContributions, 1) : 0;

  res.json({
    groupId: id,
    totalContributionsKobo: Number(totalContrib.rows[0].total),
    contributionCount: successCount,
    activeMemberCount: expectedContributions,
    completionRate: Math.round(completionRate * 100),
    successfulPayouts: Number(successfulPayouts.rows[0].count),
  });
});

export default r;
