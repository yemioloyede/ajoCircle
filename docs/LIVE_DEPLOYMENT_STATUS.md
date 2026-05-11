# Live Deployment Status - Phase 1 Updates Required

**Date:** May 10, 2026  
**Status:** Phase 1 Code Ready | Live Deployments Need Updates

---

## Current Live Deployments

### 1. Backend (Render)
- **Status:** Live (MVP version)
- **Current:** Phase 1 code not yet deployed
- **Action Needed:** Deploy Phase 1 services (CountryConfigService, PaymentProvider, Selector, UnifiedWebhookHandler)

### 2. Admin Dashboard (Vercel)
- **Status:** Live (MVP version)
- **Current:** Phase 1 code not yet deployed
- **Action Needed:** Deploy Phase 1 updates to admin UI

### 3. Git Repository
- **Status:** Code committed (master branch, commit 0090fdb)
- **Current:** Phase 1 backend services + migrations included
- **Action Needed:** None (already in Git)

---

## What Needs to Be Deployed to Live

### Backend (Render) - Phase 1 Services

**New Files to Deploy:**
```
backend/src/services/cache.ts
backend/src/services/country-config.ts
backend/src/services/payment-provider.ts
backend/src/services/payment-provider-selector.ts
backend/src/middleware/unified-webhook-handler.ts
```

**New Environment Variables Required:**
```env
# Payment Providers (Test/Prod credentials)
PAYSTACK_SECRET_KEY=sk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx

# Webhooks
WEBHOOK_SECRET=<generated-secret>

# Database (already configured)
DATABASE_URL=<Neon-pooler-connection>
```

**Deployment Steps:**
```bash
# 1. Git pull latest (includes 0090fdb)
git pull origin master

# 2. Install new dependencies (if any)
npm install

# 3. Update environment variables in Render dashboard
# (PAYSTACK_SECRET_KEY, STRIPE_SECRET_KEY, etc.)

# 4. Deploy
# (Render auto-deploys on git push, or manual deploy via Render dashboard)

# 5. Verify
curl https://api.yourdomain.com/health
```

---

### Admin Dashboard (Vercel) - Phase 1 Updates

**Updates Required:**
1. Add buttons/links to new provider configuration pages
2. Display payment provider health metrics
3. Show provider selection logic in transaction flow
4. Add webhook testing interface

**Deployment Steps:**
```bash
# 1. Update apps/admin with Phase 1 UI components
# (See: apps/admin/app/payment-providers/ for new pages)

# 2. Deploy to Vercel
git push origin master
# (Vercel auto-deploys on git push)

# 3. Verify admin dashboard loads and shows new pages
```

---

## Database Migration Path for Live Systems

### Option A: Use Neon Branch (Recommended)
The v2.0 schema is already on branch `br-tiny-water-apbtuvki` (test/staging branch).

**Steps:**
1. Create production branch from test branch
2. Validate schema in production branch
3. Update live DATABASE_URL to production branch
4. Activate dual-write triggers (when ready for cutover)

---

### Option B: Run Migrations on Production Database
If using same database for live and staging:

⚠️ WARNING: This requires careful execution to avoid data loss

**Steps:**
1. Take full backup of live database
2. Run migrations 001, 002, 003 (with compatibility preprocessing)
3. Validate no data was lost
4. Test services against live data

---

## Pre-Deployment Checklist for Live

Before deploying to live production systems, verify:

### Backend (Render)
- [ ] All Phase 1 code in git master branch (✅ Done: 0090fdb)
- [ ] npm build passes (✅ Done: 0 errors)
- [ ] npm test passes (✅ Done: 4/4)
- [ ] Payment provider keys configured in Render
- [ ] Webhook secret configured
- [ ] Database URL points to correct Neon branch
- [ ] Log level set appropriately (info for staging, warn for prod)
- [ ] Health endpoint tested before deploying webhooks

### Admin (Vercel)
- [ ] New payment provider pages added
- [ ] UI components match backend API responses
- [ ] Forms/inputs validated
- [ ] Deployment preview tested
- [ ] No breaking changes to existing admin features

---

## Rollback Plan (If Issues Found)

### Backend Issues
```bash
# Revert to previous commit (before Phase 1 deployment)
git revert <commit-0090fdb>
git push origin master
# Render will auto-redeploy from reverted code
```

### Admin Issues
```bash
# Revert deployment via Vercel dashboard
# Or manually:
git revert <phase1-commit>
git push origin master
```

### Database Issues
```bash
# Rollback via Neon branch management
# 1. Switch DATABASE_URL back to old branch
# 2. Disable dual-write triggers if active
# 3. Investigate data discrepancies
```

---

## Live Deployment Timeline (Recommendation)

### Week of May 17 (Staging Sign-Off)
1. ✅ Smoke tests on Neon staging branch (already done)
2. ✅ Integration tests with services (ready)
3. ✅ Admin mock testing (ready)
4. → **Sign off and schedule live deployment**

### Week of May 24 (Live Deployment Window)
1. **Monday AM:** Deployment preparation
   - Final git commit audit
   - Environment variable verification
   - Backup confirmation
   
2. **Monday Afternoon:** Staged deployment
   - Deploy backend services first (Render)
   - Run smoke tests against live backend
   - Monitor logs for 1 hour
   
3. **Tuesday AM:** Admin dashboard deployment
   - Deploy updated admin UI (Vercel)
   - Test payment provider pages
   - Monitor for errors

4. **Throughout Week:** Monitoring
   - Watch provider health metrics
   - Monitor webhook delivery
   - Check error rates and performance

---

## Critical Information for Live Deployments

### Render Backend Configuration
```
App Name: ajocircle-backend
Build Command: npm run build
Start Command: npm start
Environment Variables:
  - NODE_ENV=production
  - DATABASE_URL=<Neon-connection>
  - PAYSTACK_SECRET_KEY=<prod-key>
  - STRIPE_SECRET_KEY=<prod-key>
  - JWT_SECRET=<generated>
  - WEBHOOK_SECRET=<generated>
```

### Vercel Admin Configuration
```
Project: ajocircle-admin (or similar)
Build Command: npm run build
Start Command: npm start
Root Directory: apps/admin
Environment Variables:
  - API_URL=https://api.ajocircle.com (or Render URL)
  - NEXT_PUBLIC_STRIPE_KEY=<public-key>
```

### Neon Database Configuration
```
Project: ajoCircle
Database: neondb
Version: PostgreSQL 18
Default Branch: br-tiny-water-apbtuvki
Production Branch: (TBD - create new branch for prod)
Connection: Pooler endpoint (for stable scaling)
```

---

## Monitoring After Live Deployment

### Health Checks
```bash
# Backend health
curl https://api.ajocircle.com/health

# Admin dashboard
https://admin.ajocircle.com (should load without errors)
```

### Metrics to Watch
- Provider success rates (should be >95%)
- Webhook delivery latency (should be <2s)
- Database query times (should be <500ms)
- Error rate (should be <0.5%)

### Alerts to Set Up
- Provider success rate drops below 80%
- Webhook delivery fails for 5+ minutes
- Database connection errors
- Unhandled exceptions in logs

---

## Deployment Approval Gate

Before deploying to live production, get sign-off from:

1. **Backend Lead:** Verify services are production-ready
2. **DevOps/Render Admin:** Confirm infrastructure ready
3. **Product Manager:** Confirm no customer impact during deployment
4. **QA Lead:** Confirm smoke tests passed

---

## Post-Deployment Verification (Do This Immediately After Deployment)

### 1. Health Check
```bash
# Should return 200 with "ok" status
curl https://api.ajocircle.com/health
```

### 2. Database Connection
```bash
# Via Neon console - should show recent queries from new backend
SELECT NOW(), query_start FROM pg_stat_statements LIMIT 10;
```

### 3. Provider Selection
```bash
# Test that services can access country config
curl -X GET https://api.ajocircle.com/api/countries/NG \
  -H "Authorization: Bearer <test-token>"
```

### 4. Admin Dashboard
```
Open: https://admin.ajocircle.com
→ Should load without errors
→ New payment provider pages should be accessible
```

### 5. Logs Review
```
Render Logs:
- Should show no errors
- Should show successful database connections
- Should show provider health check starting

Vercel Logs:
- Should show successful build
- Should show no deployment errors
```

---

## Summary

| Component | Current Status | Action Required | Timeline |
|-----------|-----------------|-----------------|----------|
| Backend Code | ✅ Ready (0090fdb) | Deploy to Render | Week of May 24 |
| Admin Code | ✅ Ready | Deploy to Vercel | Week of May 24 |
| Git Repo | ✅ All committed | No action | Complete |
| Neon Schema | ✅ Deployed | Create prod branch | Week of May 24 |
| Environment Vars | ⏳ Partially set | Update in Render/Vercel | Week of May 24 |
| Monitoring | ⏳ Not set up | Configure alerts | Week of May 24 |

---

**Status:** Phase 1 code ready for live deployment  
**Go/No-Go Decision:** Week of May 17 (after staging sign-off)  
**Recommended Deploy Date:** Tuesday, May 27, 2026 (early morning, before business hours)

