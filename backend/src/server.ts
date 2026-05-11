import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import auth from './routes/auth';
import groups from './routes/groups';
import contributions from './routes/contributions';
import webhooks from './routes/webhooks';
import payouts from './routes/payouts';
import admin from './routes/admin';
import users from './routes/users';
import notifications from './routes/notifications';
import ledger from './routes/ledger';
import payments from './routes/payments';
import { pool } from './config/db';
import { initCountryConfigService } from './services/country-config';
import { initPaymentProviderSelector } from './services/payment-provider-selector';
import UnifiedWebhookHandler from './middleware/unified-webhook-handler';

const app = express();

// Initialize Phase 1 services once at boot so singleton-based APIs can use them safely.
initCountryConfigService(pool);
initPaymentProviderSelector(pool);
const unifiedWebhookHandler = new UnifiedWebhookHandler(pool);

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = [
  env.appOrigin,
  'https://ajo-circle.vercel.app',
  'http://localhost:3000',
  'http://localhost:19006',
  'http://localhost:8081',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
      return;
    }
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Global rate limit (burst protection — per-route limits handle auth)
app.use(rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Request body + raw body capture for webhook signature verification
app.use(express.json({
  verify: (req: any, _, buf) => { req.rawBody = buf.toString(); },
}));

// Structured request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(JSON.stringify({
      level,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms,
      ip: req.ip,
      ua: req.headers['user-agent']?.slice(0, 100),
    }));
  });
  next();
});

// Health check (also at /api/health for Render)
app.get('/health', (_, res) => res.json({ ok: true, service: 'AjoCircle API', env: env.nodeEnv }));
app.get('/api/health', (_, res) => res.json({ ok: true, service: 'AjoCircle API', env: env.nodeEnv }));

// Routes
app.use('/api/auth', auth);
app.use('/api/groups', groups);
app.use('/api/contributions', contributions);
app.use('/api/webhooks', webhooks);
app.use('/api', unifiedWebhookHandler.getRouter());
app.use('/api/payouts', payouts);
app.use('/api/admin', admin);
app.use('/api/users', users);
app.use('/api/notifications', notifications);
app.use('/api/ledger', ledger);
app.use('/api/payments', payments);

// Global error handler
app.use((err: any, req: any, res: any, _next: any) => {
  const isZodError = err?.name === 'ZodError';
  const status = isZodError ? 422 : err.status || 500;
  if (!isZodError) console.error(JSON.stringify({ level: 'ERROR', path: req.path, error: err.message, stack: err.stack }));
  const zodMsg = isZodError ? (err.issues?.[0]?.message || err.errors?.[0]?.message || 'Validation failed') : null;
  res.status(status).json({ error: isZodError ? zodMsg : err.message || 'Request failed' });
});

app.listen(env.port, () => console.log(JSON.stringify({ level: 'INFO', message: `AjoCircle API running on port ${env.port}`, env: env.nodeEnv })));
