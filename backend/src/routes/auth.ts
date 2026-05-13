import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { query } from '../config/db';
import { hashPassword, verifyPassword, signToken, signPasswordResetToken, verifyPasswordResetToken } from '../utils/security';
import { requireAuth } from '../middleware/auth';
import { audit } from '../services/audit';
import { env } from '../config/env';
import { sendPasswordResetEmail } from '../services/mailer';

const r = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.nodeEnv === 'production' ? 20 : 200,
  message: { error: 'Too many attempts, please try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const phoneSchema = z.string().regex(/^(\+?234|0)[0-9]{10}$/, 'Invalid Nigerian phone number');

r.post('/register', authLimiter, async (req, res) => {
  // Accept both camelCase (fullName) and snake_case (full_name)
  const body = { ...req.body, fullName: req.body.fullName ?? req.body.full_name };
  const s = z.object({
    fullName: z.string().min(2).max(100),
    email: z.string().email().max(200),
    phone: phoneSchema,
    password: z.string().min(8).max(128),
  }).parse(body);

  const email = s.email.toLowerCase().trim();
  const phone = s.phone.trim();

  const exists = await query('select id from users where email=$1 or phone=$2', [email, phone]);
  if (exists.rowCount) return res.status(409).json({ error: 'User already exists' });

  const hp = await hashPassword(s.password);
  const u = await query(
    'insert into users(full_name,email,phone,password_hash,role) values($1,$2,$3,$4,$5) returning id,email,phone,full_name,role',
    [s.fullName.trim(), email, phone, hp, 'MEMBER']
  );
  await audit(u.rows[0].id, 'USER_REGISTERED', 'USER', u.rows[0].id, {
    details: `User registered with email ${email}`,
    email,
  }, req);
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
  await audit(u.rows[0].id, 'USER_LOGIN', 'USER', u.rows[0].id, {
    details: `User logged in with email ${email}`,
    email,
  }, req);
  res.json({
    user: { id: u.rows[0].id, email: u.rows[0].email, full_name: u.rows[0].full_name, role: u.rows[0].role },
    token: signToken({ id: u.rows[0].id, email: u.rows[0].email, role: u.rows[0].role }),
  });
});

r.post('/forgot-password', authLimiter, async (req, res) => {
  const s = z.object({ email: z.string().email() }).parse(req.body);
  const email = s.email.toLowerCase().trim();
  const u = await query('select id,email from users where email=$1', [email]);

  // Always return a generic success message to prevent email enumeration.
  if (!u.rowCount) {
    return res.json({ message: 'If an account exists for this email, password reset instructions have been sent.' });
  }

  const token = signPasswordResetToken({ id: u.rows[0].id, email: u.rows[0].email });
  await audit(u.rows[0].id, 'PASSWORD_RESET_REQUESTED', 'USER', u.rows[0].id, {
    details: `Password reset requested for ${email}`,
    email,
  }, req);

  try {
    await sendPasswordResetEmail(u.rows[0].email, token);
  } catch {
    // Do not fail reset request response because of transient mail provider issues.
  }

  // In non-production we return token for QA/testing when no email provider is wired yet.
  if (env.nodeEnv !== 'production') {
    return res.json({
      message: 'Password reset requested. Use the reset token below for testing.',
      resetToken: token,
    });
  }

  return res.json({ message: 'If an account exists for this email, password reset instructions have been sent.' });
});

r.post('/reset-password', authLimiter, async (req, res) => {
  const s = z.object({ token: z.string().min(10), password: z.string().min(8).max(128) }).parse(req.body);
  let payload: { id: string; email: string };
  try {
    payload = verifyPasswordResetToken(s.token);
  } catch {
    return res.status(400).json({ error: 'Invalid or expired reset token' });
  }

  const u = await query('select id,email from users where id=$1 and email=$2', [payload.id, payload.email]);
  if (!u.rowCount) return res.status(404).json({ error: 'Account not found' });

  const hp = await hashPassword(s.password);
  await query('update users set password_hash=$1, updated_at=now() where id=$2', [hp, payload.id]);
  await audit(payload.id, 'PASSWORD_RESET_COMPLETED', 'USER', payload.id, {
    details: `Password reset completed for ${payload.email}`,
    email: payload.email,
  }, req);
  res.json({ message: 'Password reset successful. You can now sign in.' });
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
