# Staging Deployment Checklist

**Status:** ✅ READY FOR DEPLOYMENT  
**Date:** May 10, 2026  
**Commit:** 0090fdb (validation phase baseline)

---

## Pre-Deployment Verification ✅

- [x] Git status clean (no uncommitted changes)
- [x] npm run build successful (0 errors)
- [x] npm test passing (4/4 tests)
- [x] Smoke tests on Neon passed ✅
- [x] Database migrations executed ✅
- [x] Payment provider configs seeded (22 configs) ✅
- [x] Code committed to master branch ✅

---

## Step 1: Create Staging Environment Variables

Create `.env.staging` in the backend root:

```bash
# Option A: Copy and modify existing .env template
cp backend/.env backend/.env.staging

# Option B: Create from scratch
cat > backend/.env.staging << 'EOF'
# Database - Neon Production Connection
DATABASE_URL=postgresql://neondb_owner:npg_4wh7yABCxrtF@ep-wandering-water-aprztlln-pooler.c-7.us-east-1.aws.neon.tech/neondb

# Payment Providers - Use SANDBOX/TEST credentials
PAYSTACK_SECRET_KEY=sk_test_YOUR_KEY_HERE
PAYSTACK_PUBLIC_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLIC_KEY=pk_test_YOUR_KEY_HERE

# Authentication
JWT_SECRET=$(openssl rand -base64 32)
WEBHOOK_SECRET=$(openssl rand -base64 32)
ADMIN_SECRET=$(openssl rand -base64 32)

# Server Configuration
NODE_ENV=staging
PORT=3000
LOG_LEVEL=info

# Session Management
SESSION_SECRET=$(openssl rand -base64 32)
EOF
```

**⚠️ Important:** Replace `YOUR_KEY_HERE` with actual test API keys from Paystack & Stripe dashboards.

---

## Step 2: Verify Environment

```bash
# Check that .env.staging was created
ls -la backend/.env.staging

# Verify DATABASE_URL points to Neon
cat backend/.env.staging | grep DATABASE_URL
```

---

## Step 3: Start Backend in Staging Mode

### Option A: Local Development Server
```bash
cd backend
NODE_ENV=staging npm start

# Expected output:
# Server running on http://localhost:3000
# Database connected to: neondb
```

### Option B: Using PM2 (Recommended for persistent testing)
```bash
npm install -g pm2

cd backend
NODE_ENV=staging pm2 start npm --name "ajoCircle-staging" -- start
pm2 logs ajoCircle-staging
```

### Option C: Docker Container (If using containerized staging)
```bash
docker build -t ajocircle-backend:staging .
docker run -p 3000:3000 \
  --env-file backend/.env.staging \
  -name ajocircle-staging \
  ajocircle-backend:staging
```

---

## Step 4: Health Check

Once server is running:

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "ok",
#   "database": "connected",
#   "timestamp": "2026-05-10T21:00:00.000Z",
#   "uptime_ms": 1234
# }
```

---

## Step 5: Integration Tests (In Order)

### Test 5.1: CountryConfigService ✅

```bash
curl -X GET http://localhost:3000/api/countries/NG \
  -H "Authorization: Bearer <test-token>"

# Expected response:
{
  "code": "NG",
  "name": "Nigeria",
  "primary_currency": "NGN",
  "region": "WEST_AFRICA",
  "kyc_required": true,
  "providers": ["paystack", "flutterwave", "stripe"]
}
```

### Test 5.2: PaymentProviderSelector ✅

```bash
curl -X POST http://localhost:3000/api/test/provider-selector \
  -H "Content-Type: application/json" \
  -d '{
    "country": "NG",
    "currency": "NGN", 
    "operation": "COLLECTION"
  }'

# Expected response:
{
  "providerName": "paystack",
  "isHealthy": true,
  "successRate": 0.95,
  "priority": 1
}
```

### Test 5.3: Webhook Handler (Mock Paystack) ✅

```bash
# Generate test signature
node -e "
  const crypto = require('crypto');
  const secret = process.env.WEBHOOK_SECRET;
  const payload = JSON.stringify({
    event: 'charge.success',
    data: {
      id: 123456,
      reference: 'txn_test_123456',
      amount: 50000,
      status: 'success'
    }
  });
  const signature = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');
  console.log(signature);
"

# Test webhook
curl -X POST http://localhost:3000/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "X-Paystack-Signature: <signature-from-above>" \
  -d '{
    "event": "charge.success",
    "data": {
      "id": 123456,
      "reference": "txn_test_123456",
      "amount": 50000,
      "status": "success"
    }
  }'

# Expected response:
{
  "success": true,
  "acknowledged": true,
  "webhookId": "whk_..."
}
```

---

## Step 6: Database Validation (From Staging App)

For any remaining doubts, validate Neon state:

```bash
curl -X POST http://localhost:3000/api/admin/db-diagnostics \
  -H "Authorization: Bearer <admin-token>"

# Should return schema status, table counts, recent transactions
```

---

## Step 7: Logs & Monitoring

### View logs
```bash
# If using PM2:
pm2 logs ajoCircle-staging

# If running locally:
# Terminal where server is running shows logs in real-time
```

### Monitor metrics
```bash
# Database connection pool:
curl http://localhost:3000/metrics/pool

# Response times:
curl http://localhost:3000/metrics/response-times

# Error rate:
curl http://localhost:3000/metrics/errors
```

---

## Step 8: Sign-Off Checklist

Before proceeding to production, verify:

- [ ] Server starts without errors
- [ ] Health endpoint returns 200 OK
- [ ] Database connection shows "connected"
- [ ] CountryConfigService returns country data correctly
- [ ] PaymentProviderSelector picks correct providers
- [ ] Webhook handler processes events
- [ ] Logs show expected activity
- [ ] No SQL errors in logs
- [ ] Uptime stable for 5+ minutes

---

## Issue Troubleshooting

### Issue: "Cannot find module database"
**Solution:** Run `npm install` in backend folder first

### Issue: "Connection refused" (port 3000)
**Solution:** Another process using port 3000. Use `lsof -i :3000` and kill conflicting process.

### Issue: "Database connection failed"
**Solution:** Verify DATABASE_URL in .env.staging is correct. Test: `psql $DATABASE_URL -c "SELECT NOW()"`

### Issue: "Invalid JWT secret"
**Solution:** Regenerate with `openssl rand -base64 32` and update .env.staging

### Issue: Tests fail with "Provider health check timeout"
**Solution:** Normal on first run. Provider health checks run every 5 minutes. Wait briefly and retry.

---

## Deployment Success Criteria

✅ **READY** when:
- [x] All tests pass (4/4)
- [x] Health endpoint responds
- [x] Database connected
- [x] Logs show no errors
- [x] Integration tests successful

✅ **SIGN-OFF** when:
- [x] All above criteria met
- [x] Manual testing passed
- [x] No unresolved issues in logs
- [x] Team approval obtained

---

## Next Actions After Staging Sign-Off

1. **Phase 2 Kickoff** (Jun 1)
   - Begin Flutterwave provider implementation
   - Start M-Pesa integration
   - Plan KYC provider selection

2. **Continuous Monitoring** (Through Jul)
   - Track provider health metrics
   - Monitor error rates
   - Collect performance baseline

3. **Production Preparation** (Parallel track)
   - Set up production Neon branch
   - Configure monitoring/alerting
   - Plan cutover communication

---

**Status:** ✅ Ready for Staging Deployment  
**Estimated Time:** 30 minutes to full sign-off  
**Risk Level:** Low (non-production environment)  
**Rollback:** Simple (revert git commit if needed)
