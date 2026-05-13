# AjoCircle v2.0 - Deployment Guide

**Target Environment:** Staging → Production  
**Database:** Neon PostgreSQL 18  
**Backend:** Node.js 20+ / Express.js  

---

## Phase 1: Pre-Deployment Checklist

- [ ] All Phase 1 code merged to `master` branch (commit 0090fdb baseline)
- [ ] Neon migrations executed (001, 002, 003 all applied)
- [ ] Database: `migration_readiness` view returns all TRUE
- [ ] Backend: `npm run build` passes with 0 errors
- [ ] Backend: `npm test` passes (4/4 tests)
- [ ] Environment variables collected (see Section 2)
- [ ] Git workspace clean (no uncommitted changes)

---

## Phase 2: Environment Setup

### 2.1 Staging Environment Variables

Create `.env.staging` in backend root:

```env
# Database
DATABASE_URL=postgresql://<user>:<password>@<host>/<dbname>

# Payment Providers
PAYSTACK_SECRET_KEY=<your-paystack-secret-key>
PAYSTACK_PUBLIC_KEY=<your-paystack-public-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>
STRIPE_PUBLIC_KEY=<your-stripe-public-key>

# Service Keys
JWT_SECRET=your-long-random-jwt-secret-min-32-chars
WEBHOOK_SECRET=your-webhook-signing-secret-min-32-chars
ADMIN_SECRET=your-admin-api-secret-min-32-chars

# Server Config
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info

# Notification (placeholder)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# KYC (placeholder)
SMILE_ID_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SMILE_ID_PARTNER_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Data Encryption (placeholder for AWS Secrets Manager)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Notes:**
- `DATABASE_URL`: Already provided (Neon branch br-tiny-water-apbtuvki)
- Payment provider keys: Use test/sandbox credentials
- Secrets: Generate with `openssl rand -base64 32`

### 2.2 Production Environment Variables

Create `.env.production` (same structure as staging, but with:)
- Production payment provider credentials (PAYSTACK_SECRET_KEY, STRIPE_SECRET_KEY)
- Production database: Use Neon production branch (not br-tiny-water-apbtuvki)
- NODE_ENV=production
- LOG_LEVEL=warn

---

## Phase 3: Staging Deployment

### 3.1 Build Backend

```bash
cd backend
npm install           # Install dependencies
npm run build         # TypeScript compilation
npm run test          # Run test suite (should pass 4/4)
echo "✅ Build successful"
```

### 3.2 Start Staging Server

```bash
# Option A: Using npm
NODE_ENV=staging npm start
# Listens on http://localhost:3000

# Option B: Using PM2 (recommended for background)
npm install -g pm2
pm2 start npm --name "ajoCircle-staging" -- start
pm2 logs ajoCircle-staging
```

### 3.3 Health Check

```bash
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2026-05-10T12:00:00.000Z",
  "database": "connected",
  "uptime_ms": 1234
}
```

If health endpoint missing, implement:
```typescript
app.get('/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime_ms: process.uptime() * 1000
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: error.message
    });
  }
});
```

---

## Phase 4: Smoke Testing (Neon)

### 4.1 Schema Validation

```sql
-- Connect to Neon (use psql or DBeaver)
SELECT * FROM migration_readiness;
-- Expected: All TRUE

SELECT * FROM migration_record_counts;
-- Expected: countries_count=5, currencies_count=6, payment_provider_configs_count=30

SELECT * FROM ledger_consistency;
-- Expected: No orphaned entries
```

### 4.2 Service Validation

**Test 1: CountryConfigService**
```bash
curl -X POST http://localhost:3000/api/test/country-config \
  -H "Content-Type: application/json" \
  -d '{
    "action": "getCountry",
    "countryCode": "NG"
  }'

# Expected response:
{
  "code": "NG",
  "name": "Nigeria",
  "currency": "NGN",
  "kycRequired": true,
  "kycProvider": "smile_id",
  "transactionLimits": {
    "minPerTransaction": 50000,
    "maxPerTransaction": 10000000,
    "dailyMax": 50000000
  }
}
```

**Test 2: PaymentProviderSelector**
```bash
curl -X POST http://localhost:3000/api/test/provider-selector \
  -H "Content-Type: application/json" \
  -d '{
    "action": "selectProvider",
    "country": "NG",
    "currency": "NGN",
    "operation": "COLLECTION"
  }'

# Expected response:
{
  "providerName": "paystack",
  "isHealthy": true,
  "successRate": 0.95,
  "averageResponseTime": 2400,
  "rank": 1
}
```

**Test 3: Webhook Handler (Paystack Mock)**
```bash
curl -X POST http://localhost:3000/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "X-Paystack-Signature: <hmac-sha512-signature>" \
  -d '{
    "event": "charge.success",
    "data": {
      "id": 123456,
      "reference": "txn_test_123456",
      "amount": 50000,
      "currency": "NGN",
      "status": "success",
      "customer": {
        "id": 12345,
        "email": "customer@example.com"
      }
    }
  }'

# Expected response:
{
  "success": true,
  "transactionId": "txn_v2_123456",
  "ledgerEntryId": "ledger_123456",
  "status": "COMPLETED"
}
```

---

## Phase 5: Integration Testing (Manual)

### 5.1 Dual-Write Test

**Objective:** Verify MVP and v2.0 schemas sync during a transaction

```bash
# Create a test wallet in v2
curl -X POST http://localhost:3000/api/wallets \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "userId": "test-user-1",
    "country": "NG",
    "currency": "NGN"
  }'
# Response: { "walletId": "wallet_v2_123", "balance": 0 }

# Queue a ledger entry (via webhook or manually)
curl -X POST http://localhost:3000/api/ledger \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "walletId": "wallet_v2_123",
    "type": "COLLECTION",
    "amount": 100000,
    "direction": "DEBIT",
    "counterpartyId": "bank_account_1"
  }'
# Response: { "ledgerId": "ledger_123" }

# Check migration_tracking table in Neon
SELECT * FROM migration_tracking WHERE v2_record_id = 'ledger_123';
# Expected: sync_status = 'SYNCED'

# Verify MVP table updated (if dual-write active)
SELECT * FROM ledger_entries WHERE id = <mapping.mvp_record_id>;
# Expected: Record exists in MVP schema
```

### 5.2 Provider Failover Test

**Objective:** Verify provider selection and failover

```bash
# Set Paystack health to 50% (simulate degradation)
curl -X POST http://localhost:3000/api/test/set-provider-health \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "provider": "paystack",
    "country": "NG",
    "successRate": 0.50
  }'

# Select provider (should pick Stripe as backup)
curl -X POST http://localhost:3000/api/test/provider-selector \
  -d '{
    "action": "selectProvider",
    "country": "NG",
    "currency": "NGN",
    "operation": "COLLECTION"
  }'
# Expected: { "providerName": "stripe", ... }

# Restore Paystack health
curl -X POST http://localhost:3000/api/test/set-provider-health \
  -d '{
    "provider": "paystack",
    "country": "NG",
    "successRate": 0.95
  }'
```

---

## Phase 6: Production Deployment

### 6.1 Staging Sign-Off

Before moving to production:
- [ ] All smoke tests pass
- [ ] Dual-write sync operational
- [ ] Provider failover working
- [ ] Database backups working
- [ ] Logs flowing to monitoring system

### 6.2 Production Database Prep

**Option A: Neon Production Branch (Recommended)**

```bash
# Create production branch in Neon Console
# Clone from br-tiny-water-apbtuvki (contains v2 schema)
neon_branch_name="prod-main"
neon_branch_id="<generated>"

# Update DATABASE_URL to production branch endpoint
DATABASE_URL=postgresql://<user>:<password>@<host>/neondb
```

**Option B: Separate Neon Project**

```bash
# Create new Neon project "ajoCircle-production"
# Run migrations 001, 002, 003 on production project
# Update DATABASE_URL accordingly
```

### 6.3 Production Deployment

```bash
# 1. Build release
cd backend
NODE_ENV=production npm run build

# 2. Deploy using your deployment tool (Vercel, Railway, Render, etc.)
# Examples:

# Vercel
vercel deploy --prod

# Railway
railway up --environment production

# Render
git push heroku main  # (if using Heroku)

# PM2 on dedicated server
pm2 start npm --name "ajoCircle-prod" --env production -- start
pm2 save
pm2 startup

# 3. Verify deployment
curl https://api.ajocircle.com/health
# Expected: { "status": "ok", "database": "connected" }
```

### 6.4 Production Cutover (Zero-Downtime)

**Timeline:** Typically Week 2-4 (not part of Phase 1)

1. **Activate dual-write triggers** (migration_002 sync procedures)
   ```sql
   -- Uncomment and enable sync triggers in production
   ALTER TRIGGER sync_wallets_to_v2 ON wallets ENABLE;
   -- ... more triggers
   ```

2. **Monitor sync** (24-48 hours)
   ```sql
   SELECT sync_status, COUNT(*) FROM migration_tracking 
   GROUP BY sync_status;
   -- Expected: Most SYNCED, few or no PENDING
   ```

3. **Validate data consistency**
   ```sql
   SELECT * FROM ledger_consistency;
   SELECT * FROM migration_readiness;
   ```

4. **Switch routing** (Admin dashboard)
   - MVP request handler: Route new transactions to v2 payment processor
   - Existing transactions: Continue via MVP until balance zeroed out

5. **Monitor post-cutover** (1 month)
   - Track error rates
   - Monitor provider health
   - Check ledger consistency daily

---

## Phase 7: Monitoring & Maintenance

### 7.1 Key Metrics to Monitor

```typescript
// Add to your monitoring system (DataDog, New Relic, CloudWatch)

// Provider Health
- provider_success_rate (per provider, per country)
- provider_response_time_ms (p50, p95, p99)
- provider_error_rate (per error code)

// Ledger
- ledger_entry_count (per day)
- ledger_consistency_check (% matching debit/credit)
- wallet_balance_discrepancy (audit trail)

// Webhooks
- webhook_delivery_latency_ms
- webhook_duplicate_rate
- webhook_error_by_provider

// Database
- connection_pool_utilization
- query_latency_p95
- replication_lag_seconds (for read replicas)
```

### 7.2 Alerting Rules

```
Alert: provider_success_rate < 80% for >10 minutes
Action: Page on-call engineer, switch to backup provider

Alert: wallet_balance_discrepancy > 0 for any user
Action: Investigate immediately, check audit logs

Alert: webhook_delivery_latency_p95 > 5000ms
Action: Check provider health, review network logs

Alert: database_connection_pool_exhausted
Action: Increase pool size, check for connection leaks
```

### 7.3 Regular Maintenance

**Daily:**
- Check provider health dashboard
- Review error logs for exceptions
- Verify webhook processing rate

**Weekly:**
- Run `SELECT * FROM ledger_consistency;` for validation
- Check `migration_tracking` for FAILED syncs
- Review provider fee changes

**Monthly:**
- Analyze provider performance trends
- Review KYC rejection rates
- Check compliance flag distribution
- Update exchange rates if cached

---

## Phase 8: Rollback Procedures

### 8.1 Rollback from Staging

If staging deployment fails:

```bash
# Stop staging server
pm2 stop ajoCircle-staging
pm2 delete ajoCircle-staging

# Switch DATABASE_URL back to master branch
# Redeploy previous version
git checkout <last-good-commit>
npm install && npm run build
pm2 start npm --name "ajoCircle-staging" -- start
```

### 8.2 Rollback from Production

If production deployment has critical issues:

```bash
# 1. Immediate: Revert to previous deployment
# (Using your deployment tool's rollback feature)

# 2. Database: No schema rollback needed (migrations are append-only)
# Existing v2 tables remain; just stop writing to v2

# 3. Dual-write: Disable new v2 writes if not stable
UPDATE payment_provider_configs SET enabled = false 
WHERE provider_name IN (SELECT * FROM v2_providers);

# 4. Verify
curl https://api.ajocircle.com/health
# Should respond within 2 seconds
```

---

## Appendix A: Environment Variable Reference

| Variable | Description | Example | Required |
|---|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://...` | ✅ |
| `NODE_ENV` | Environment (staging/production) | `staging` | ✅ |
| `PORT` | Server port | `3000` | ❌ (default: 3000) |
| `JWT_SECRET` | JWT signing key (min 32 chars) | `base64-encoded-secret` | ✅ |
| `PAYSTACK_SECRET_KEY` | Paystack sandbox/prod key | `sk_test_...` | ✅ |
| `STRIPE_SECRET_KEY` | Stripe sandbox/prod key | `sk_test_...` | ✅ |
| `WEBHOOK_SECRET` | Webhook signature secret | `webhook-secret-key` | ✅ |
| `SENDGRID_API_KEY` | SendGrid API key | `SG....` | ❌ (Phase 2) |
| `TWILIO_ACCOUNT_SID` | Twilio account ID | `AC...` | ❌ (Phase 2) |
| `AWS_ACCESS_KEY_ID` | AWS credentials | `AKIA...` | ❌ (Phase 2) |

---

## Appendix B: Deployment Checklist

```
PRE-DEPLOYMENT
[ ] Code merged to master (0090fdb or later)
[ ] npm test passing (4/4)
[ ] npm run build successful
[ ] .env files prepared
[ ] Database backups ready
[ ] Monitoring configured

STAGING DEPLOYMENT
[ ] App starts without errors
[ ] Health endpoint responds
[ ] Database connection successful
[ ] All smoke tests pass
[ ] Logs flowing to monitoring

PRODUCTION DEPLOYMENT
[ ] Staging sign-off received
[ ] Production secrets configured
[ ] Production database ready
[ ] Alerts configured
[ ] Rollback plan tested
[ ] Post-deployment runbook ready

POST-DEPLOYMENT
[ ] Monitor error rates hourly for 24 hours
[ ] Check provider health daily
[ ] Validate ledger consistency daily
[ ] Review customer feedback/issues
[ ] Plan cutover (if proceeding to dual-write)
```

---

**Document Version:** 1.0  
**Last Updated:** May 10, 2026  
**Status:** Ready for Staging Deployment
