import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';
import { query } from '../config/db';
import { audit, createNotification } from '../services/audit';

const r = Router();
r.use(requireAuth, requireRole('COMPLIANCE_ADMIN', 'SUPER_ADMIN'));

// ─── Dashboard ───────────────────────────────────────────────────────────────

r.get('/dashboard', async (_, res) => {
  const [users, groups, txs, payouts, volume, fees, pendingKyc] = await Promise.all([
    query('select count(*) from users'),
    query("select count(*) from savings_groups where status='ACTIVE'"),
    query('select count(*) from contributions'),
    query("select count(*) from payouts where status='PENDING_REVIEW'"),
    query("select coalesce(sum(amount_kobo),0) as total from contributions where status='SUCCESS'"),
    query("select coalesce(sum(amount_kobo),0) as total from ledger_entries where type='PLATFORM_FEE'"),
    query("select count(*) from kyc_submissions where status='PENDING'"),
  ]);
  res.json({
    users: Number(users.rows[0].count),
    activeGroups: Number(groups.rows[0].count),
    transactions: Number(txs.rows[0].count),
    pendingPayouts: Number(payouts.rows[0].count),
    totalVolumeKobo: Number(volume.rows[0].total),
    platformFeesKobo: Number(fees.rows[0].total),
    pendingKycCount: Number(pendingKyc.rows[0].count),
  });
});

// ─── Users ───────────────────────────────────────────────────────────────────

r.get('/users', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const rows = await query(
    'select id,full_name,email,phone,role,kyc_status,status,created_at from users order by created_at desc limit $1 offset $2',
    [limit, offset]
  );
  const total = await query('select count(*) from users');
  res.json({ users: rows.rows, total: Number(total.rows[0].count), limit, offset });
});

r.get('/users/:id', async (req, res) => {
  const [user, bankAccounts, contributions, kyc] = await Promise.all([
    query('select id,full_name,email,phone,role,kyc_status,status,created_at from users where id=$1', [req.params.id]),
    query('select id,bank_name,bank_code,account_name,is_primary,created_at from bank_accounts where user_id=$1', [req.params.id]),
    query('select c.*,g.name as group_name from contributions c join savings_groups g on g.id=c.group_id where c.user_id=$1 order by c.created_at desc limit 20', [req.params.id]),
    query('select id,status,rejection_reason,created_at from kyc_submissions where user_id=$1', [req.params.id]),
  ]);
  if (!user.rowCount) return res.status(404).json({ error: 'User not found' });
  res.json({ user: user.rows[0], bankAccounts: bankAccounts.rows, contributions: contributions.rows, kyc: kyc.rows[0] ?? null });
});

r.post('/users/:id/freeze', async (req, res) => {
  await query("update users set status='FROZEN', updated_at=now() where id=$1", [req.params.id]);
  await audit(req.user!.id, 'USER_FROZEN', 'USER', req.params.id, {
    details: `Admin ${req.user!.id} froze user ${req.params.id}`,
    targetUserId: req.params.id,
  }, req);
  res.json({ message: 'User frozen' });
});

r.post('/users/:id/unfreeze', async (req, res) => {
  await query("update users set status='ACTIVE', updated_at=now() where id=$1", [req.params.id]);
  await audit(req.user!.id, 'USER_UNFROZEN', 'USER', req.params.id, {
    details: `Admin ${req.user!.id} unfroze user ${req.params.id}`,
    targetUserId: req.params.id,
  }, req);
  res.json({ message: 'User unfrozen' });
});

r.patch('/users/:id/role', async (req, res) => {
  const s = z.object({ role: z.enum(['MEMBER', 'GROUP_ADMIN', 'COMPLIANCE_ADMIN', 'SUPER_ADMIN']) }).parse(req.body);
  await query('update users set role=$1, updated_at=now() where id=$2', [s.role, req.params.id]);
  await audit(req.user!.id, 'USER_ROLE_CHANGED', 'USER', req.params.id, {
    details: `Admin ${req.user!.id} changed role for user ${req.params.id} to ${s.role}`,
    targetUserId: req.params.id,
    newRole: s.role,
  }, req);
  res.json({ message: 'Role updated' });
});

// ─── KYC ─────────────────────────────────────────────────────────────────────

r.get('/kyc', async (req, res) => {
  const status = (req.query.status as string) || 'PENDING';
  const rows = await query(
    `select k.*, u.full_name, u.email from kyc_submissions k
     join users u on u.id=k.user_id
     where k.status=$1
     order by k.created_at asc limit 100`,
    [status]
  );
  res.json(rows.rows);
});

r.post('/kyc/:id/approve', async (req, res) => {
  const row = await query('select * from kyc_submissions where id=$1', [req.params.id]);
  if (!row.rowCount) return res.status(404).json({ error: 'KYC submission not found' });
  await query(
    "update kyc_submissions set status='VERIFIED', reviewed_by=$1, reviewed_at=now(), updated_at=now() where id=$2",
    [req.user!.id, req.params.id]
  );
  await query("update users set kyc_status='VERIFIED', updated_at=now() where id=$1", [row.rows[0].user_id]);
  await audit(req.user!.id, 'KYC_APPROVED', 'USER', row.rows[0].user_id, {
    details: `Admin ${req.user!.id} approved KYC submission ${req.params.id} for user ${row.rows[0].user_id}`,
    submissionId: req.params.id,
    targetUserId: row.rows[0].user_id,
  }, req);
  await createNotification(row.rows[0].user_id, 'KYC_APPROVED', 'KYC Verified', 'Your identity has been verified. You now have full access to AjoCircle.');
  res.json({ message: 'KYC approved' });
});

r.post('/kyc/:id/reject', async (req, res) => {
  const s = z.object({ reason: z.string().min(5).max(500) }).parse(req.body);
  const row = await query('select * from kyc_submissions where id=$1', [req.params.id]);
  if (!row.rowCount) return res.status(404).json({ error: 'KYC submission not found' });
  await query(
    "update kyc_submissions set status='REJECTED', reviewed_by=$1, reviewed_at=now(), rejection_reason=$2, updated_at=now() where id=$3",
    [req.user!.id, s.reason, req.params.id]
  );
  await query("update users set kyc_status='REJECTED', updated_at=now() where id=$1", [row.rows[0].user_id]);
  await audit(req.user!.id, 'KYC_REJECTED', 'USER', row.rows[0].user_id, {
    details: `Admin ${req.user!.id} rejected KYC submission ${req.params.id} for user ${row.rows[0].user_id}`,
    submissionId: req.params.id,
    reason: s.reason,
    targetUserId: row.rows[0].user_id,
  }, req);
  await createNotification(row.rows[0].user_id, 'KYC_REJECTED', 'KYC Rejected', `Your KYC was not approved. Reason: ${s.reason}`);
  res.json({ message: 'KYC rejected' });
});

// ─── Groups ──────────────────────────────────────────────────────────────────

r.get('/groups', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const rows = await query(
    'select * from savings_groups order by created_at desc limit $1 offset $2',
    [limit, offset]
  );
  const total = await query('select count(*) from savings_groups');
  res.json({ groups: rows.rows, total: Number(total.rows[0].count) });
});

r.post('/groups/:id/freeze', async (req, res) => {
  await query("update savings_groups set status='FROZEN', updated_at=now() where id=$1", [req.params.id]);
  await audit(req.user!.id, 'GROUP_FROZEN', 'GROUP', req.params.id, {
    details: `Admin ${req.user!.id} froze group ${req.params.id}`,
    targetGroupId: req.params.id,
  }, req);
  res.json({ message: 'Group frozen' });
});

r.post('/groups/:id/close', async (req, res) => {
  await query("update savings_groups set status='CLOSED', updated_at=now() where id=$1", [req.params.id]);
  await audit(req.user!.id, 'GROUP_CLOSED', 'GROUP', req.params.id, {
    details: `Admin ${req.user!.id} closed group ${req.params.id}`,
    targetGroupId: req.params.id,
  }, req);
  res.json({ message: 'Group closed' });
});

// ─── Transactions ─────────────────────────────────────────────────────────────

r.get('/transactions', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const rows = await query(
    `select c.*, u.full_name, g.name as group_name
     from contributions c
     join users u on u.id=c.user_id
     join savings_groups g on g.id=c.group_id
     order by c.created_at desc limit $1 offset $2`,
    [limit, offset]
  );
  const total = await query('select count(*) from contributions');
  res.json({ transactions: rows.rows, total: Number(total.rows[0].count) });
});

// ─── Audit Logs ──────────────────────────────────────────────────────────────

r.get('/audit', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;
  const rows = await query(
    `select a.*, u.full_name as actor_name, u.email as actor_email
     from audit_logs a
     left join users u on u.id=a.actor_id
     order by a.created_at desc limit $1 offset $2`,
    [limit, offset]
  );
  const total = await query('select count(*) from audit_logs');
  const logs = rows.rows.map((row) => {
    let metadata = row.metadata;
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        metadata = { raw: row.metadata };
      }
    }
    return { ...row, metadata };
  });
  res.json({ logs, total: Number(total.rows[0].count) });
});

export default r;
