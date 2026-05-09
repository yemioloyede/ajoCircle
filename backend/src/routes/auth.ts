import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { query } from '../config/db';
import { hashPassword, verifyPassword, signToken } from '../utils/security';
import { requireAuth } from '../middleware/auth';
import { audit } from '../services/audit';

const r = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const phoneSchema = z.string().regex(/^(\+?234|0)[0-9]{10}$/, 'Invalid Nigerian phone number');

r.post('/register', authLimiter, async (req, res) => {
  const s = z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email().max(200),
    phone: phoneSchema,
    password: z.string().min(8).max(128),
  }).parse(req.body);

  const email = s.email.toLowerCase().trim();
  const phone = s.phone.trim();

  const exists = await query('select id from users where email=$1 or phone=$2', [email, phone]);
  if (exists.rowCount) return res.status(409).json({ error: 'User already exists' });

  const hp = await hashPassword(s.password);
  const u = await query(
    'insert into users(full_name,email,phone,password_hash,role) values($1,$2,$3,$4,$5) returning id,email,phone,full_name,role',
    [s.fullName.trim(), email, phone, hp, 'MEMBER']
  );
  await audit(u.rows[0].id, 'USER_REGISTERED', 'USER', u.rows[0].id, {}, req);
  res.json({ user: u.rows[0], token: signToken({ id: u.rows[0].id, email: u.rows[0].email, role: u.rows[0].role }) });
});

r.post('/login', authLimiter, async (req, res) => {
  const s = z.object({ email: z.string().email(), password: z.string() }).parse(req.body);
  const email = s.email.toLowerCase().trim();
  const u = await query('select * from users where email=$1 and status is distinct from $2', [email, 'FROZEN']);
  if (!u.rowCount) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await verifyPassword(s.password, u.rows[0].password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  if (u.rows[0].status === 'FROZEN') return res.status(403).json({ error: 'Account is frozen. Contact support.' });
  await audit(u.rows[0].id, 'USER_LOGIN', 'USER', u.rows[0].id, {}, req);
  res.json({
    user: { id: u.rows[0].id, email: u.rows[0].email, full_name: u.rows[0].full_name, role: u.rows[0].role },
    token: signToken({ id: u.rows[0].id, email: u.rows[0].email, role: u.rows[0].role }),
  });
});

r.get('/me', requireAuth, async (req, res) => {
  const u = await query(
    'select id,email,phone,full_name,role,kyc_status,created_at from users where id=$1',
    [req.user!.id]
  );
  if (!u.rowCount) return res.status(404).json({ error: 'User not found' });
  res.json(u.rows[0]);
});

export default r;
