# AjoCircle v2.0 - Phase 2 & Beyond Roadmap

**Phase 1 Status:** ✅ Complete (May 10, 2026)  
**Phase 2 Start:** Expected Jun 2026  
**Phase 3+ Timeline:** Q3-Q4 2026

---

## Executive Summary

Phase 2 expands platform capabilities with additional payment providers, KYC integration, notifications, and dispute resolution. The v2.0 foundation (multi-country config, immutable ledger, provider abstraction) enables these features with minimal core changes—primarily service implementations and workflow automation.

---

## Phase 2: Provider Expansion & KYC Integration (Jun-Jul 2026)

### 2.1 Complete Payment Provider Implementations

**Status:** Paystack & Stripe done (Phase 1); 4 providers remaining

#### Flutterwave Provider (500 lines)
**Timeline:** June 1-5, 2026  
**Effort:** 5 days

**Required Methods:**
- `verifyAccountDetails()` → POST /transfers/recipients/validation
- `createPaymentRecipient()` → POST /transfers/recipients/bulk
- `initiateCollection()` → POST /transactions/verify (integration mode)
- `initiatePaymentPayout()` → POST /transfers
- `initiateRefund()` → POST /transactions/{id}/refund
- `getTransactionStatus()` → GET /transactions/{ref}
- `parseWebhook()` → Validate HMAC-SHA256 signature
- `getFees()` → Hardcoded based on operation type
- `getBalance()` → GET /balances

**Webhook Events to Handle:**
- `transfer.completed` → Update payout status
- `transfer.failed` → Mark payout failed, retry or manual review
- `transfer.reversed` → Handle chargeback/reversal
- `collection.success` → Credit wallet (similar to Paystack)

**Testing:**
- Unit tests for signature validation
- Integration tests with Flutterwave sandbox
- Add to PaymentProviderSelector failover chain for NG, GH, KE

**Deploy Config:**
```sql
INSERT INTO payment_provider_configs (country_code, currency, provider_name, enabled, priority)
VALUES ('GH', 'GHS', 'flutterwave', true, 2);
-- Stripe as primary (priority 1), Flutterwave as secondary
```

---

#### M-Pesa Provider (600 lines)
**Timeline:** June 6-12, 2026  
**Effort:** 7 days (highest complexity due to callback model)

**Required Methods:**
- `verifyAccountDetails()` → Query MPESA API for account validity
- `createPaymentRecipient()` → Store in recipients table (M-Pesa doesn't have dedicated endpoint)
- `initiateCollection()` → POST /stkpush (STK push popup on user phone)
- `initiatePaymentPayout()` → POST /b2c (Business-to-Customer)
- `initiateRefund()` → POST /reversal (M-Pesa reversal)
- `getTransactionStatus()` → Query transaction status callback
- `parseWebhook()` → Validate signature (M-Pesa uses custom headers)
- `getFees()` → Tiered fee table based on amount
- `getBalance()` → GET /accountbalance

**Unique Features:**
- **STK Push:** Popup on user's phone (requires phone number)
- **Callbacks:** Async webhook responses (not instant)
- **Shortcodes:** Dynamic shortcode routing (merchant-specific)
- **Session Tracking:** Track STK push session ID for retry logic

**Webhook Events to Handle:**
- `Daraja.Stk.Result` → STK push callback (user entered PIN or canceled)
- `MpesaPaymentNotification` → Incoming payment notification
- `BalanceNotification` → Account balance update
- `TransactionReversal` → Reversal confirmation

**Testing:**
- Unit tests for callback signature validation
- M-Pesa sandbox integration
- Test STK push flow with test number (+254712345678)
- Test B2C payout initiation

**Deploy Config:**
```sql
INSERT INTO payment_provider_configs (country_code, currency, provider_name, enabled, priority)
VALUES ('KE', 'KES', 'mpesa', true, 1);
-- M-Pesa as primary for Kenya collections
```

---

#### Razorpay Provider (500 lines)
**Timeline:** June 13-18, 2026  
**Effort:** 6 days

**Required Methods:**
- `verifyAccountDetails()` → Validate bank account using RazorpayX API
- `createPaymentRecipient()` → POST /contacts + POST /fund_accounts
- `initiateCollection()` → POST /payments/create (charge API)
- `initiatePaymentPayout()` → POST /payouts
- `initiateRefund()` → POST /refunds
- `getTransactionStatus()` → GET /payments/{id}
- `parseWebhook()` → Validate signature (HMAC-SHA256)
- `getFees()` → Query /settlements for fee details
- `getBalance()` → GET /accounts/{id}/balances

**Key Features:**
- Support for international payouts (India-based, global reach)
- Settlement batching (configurable daily/custom)
- Automatic compliance checks (AML, sanctions)

**Webhook Events:**
- `payment.authorized` → Payment successful
- `payment.failed` → Payment failed
- `payout.processed` → Payout sent
- `payout.failed` → Payout failed
- `settlement.processed` → Settlement completed

**Testing:**
- Razorpay Test Mode (test keys)
- Unit tests for webhook validation
- Integration with ledger (settlement handling)

**Deploy Config:**
```sql
INSERT INTO payment_provider_configs (country_code, currency, provider_name, enabled, priority)
VALUES 
  ('IN', 'INR', 'razorpay', true, 1),
  ('GB', 'GBP', 'razorpay', true, 2);
```

---

#### Wise Provider (600 lines)
**Timeline:** June 19-25, 2026  
**Effort:** 7 days (highest compliance complexity)

**Required Methods:**
- `verifyAccountDetails()` → validate-recipient (POST /v1/recipient-accounts)
- `createPaymentRecipient()` → POST /v1/recipient-accounts (create account)
- `initiateCollection()` → Create transfer (inbound quote + payment)
- `initiatePaymentPayout()` → POST /v1/transfers (outbound payout)
- `initiateRefund()` → POST /v1/funded-grants (credit reversal)
- `getTransactionStatus()` → GET /v1/transfers/{id}
- `parseWebhook()` → Validate signature (HMAC-SHA256)
- `getFees()` → GET /v3/rates (dynamic rates)
- `getBalance()` → GET /v4/accounts/{id}/balances

**Key Features:**
- Real-time exchange rates (most accurate)
- Multi-currency support (50+ currencies)
- High-volume international transfers (diaspora pools)
- Compliance: Automated PEP/sanctions screening

**Webhook Events:**
- `transfer.state.changed` → Transfer status update
- `transferFailed` → Transfer failed (reason code)
- `balanceUpdated` → Account balance change

**Testing:**
- Wise sandbox mode
- Test international transfer scenarios
- Rate locking and quote expiration handling

**Deploy Config:**
```sql
INSERT INTO payment_provider_configs (country_code, currency, provider_name, enabled, priority)
VALUES 
  ('US', 'USD', 'wise', true, 1),
  ('GB', 'GBP', 'wise', true, 1),
  ('SG', 'SGD', 'wise', true, 1);
-- Wise as primary for diaspora corridors
```

---

### 2.2 KYC Integration (Automated Verification)

**Status:** Framework in place (kyc_documents, kyc_status columns); providers not integrated

#### Smile ID Integration (600 lines)
**Timeline:** July 1-10, 2026  
**Effort:** 10 days (includes server-side crypto)

**Workflow:**
```
User initiates KYC
  ↓
API: POST /api/kyc/start
  ├─ Create KYC session
  ├─ Call SmileID /api/v1/kyc/initiate
  ├─ Return jobId + SDK token
  ↓
Frontend: Smile ID Web SDK
  ├─ Collect: ID type, selfie, document scan
  ├─ Liveness detection
  ├─ Client-side encryption
  ↓
Webhook: SmileID callback
  ├─ POST /api/webhooks/smile-id
  ├─ Decrypt verification result
  ├─ Update kyc_documents table
  ├─ Update user.kyc_status (APPROVED/REJECTED/PENDING)
  ↓
Ledger: Record KYC event
  ├─ Create audit log entry
  ├─ Trigger compliance_flags update if high-risk
```

**Implementation:**
```typescript
// backend/src/services/kyc-provider.ts
interface KycProvider {
  initiateVerification(userId: string, userData): Promise<KycInitiationResult>;
  getVerificationStatus(jobId: string): Promise<KycStatusResult>;
  parseWebhook(payload, signature): Promise<KycWebhookResult>;
}

class SmileIdProvider implements KycProvider {
  // Handle: ID verification, liveness detection, result parsing
}

// Usage in unified handler:
app.post('/api/kyc/start', async (req, res) => {
  const { userId, idType } = req.body;
  const kycProvider = new SmileIdProvider(process.env.SMILE_ID_API_KEY);
  const result = await kycProvider.initiateVerification(userId, { idType });
  res.json({ jobId: result.jobId, sdkToken: result.token });
});
```

**Database Schema Updates:**
```sql
ALTER TABLE kyc_documents ADD COLUMN smile_id_job_id VARCHAR(255);
ALTER TABLE kyc_documents ADD COLUMN smile_id_result JSONB;
ALTER TABLE users_v2 ADD COLUMN kyc_approved_at TIMESTAMP;
ALTER TABLE users_v2 ADD COLUMN kyc_approved_by_method VARCHAR(50) 
  DEFAULT 'smile_id';
CREATE INDEX idx_kyc_documents_smile_id_job_id ON kyc_documents(smile_id_job_id);
```

**Testing:**
- Unit tests for Smile ID API responses
- Mock webhook callbacks
- Test result parsing (approved/rejected/pending)
- Integration test end-to-end KYC flow

**Webhook Handling:**
```typescript
POST /api/webhooks/smile-id
├─ Verify signature
├─ Parse: { "jobId": "...", "result": "Approved", "idNumber": "..." }
├─ Update kyc_documents (status=APPROVED, verified_at=now())
├─ Update users_v2.kyc_status = 'APPROVED'
├─ Create ledger entry (type: 'KYC_VERIFIED', direction: 'DEBIT', amount: 0)
├─ Send notification: "Your KYC has been approved"
└─ Return 200 OK
```

---

#### Veriff Integration (600 lines)
**Timeline:** July 11-18, 2026  
**Effort:** 8 days

**Similar to Smile ID but:**
- Document OCR (higher accuracy)
- Liveness video submission (not real-time)
- AML/PEP screening included
- Multi-document support (passport, driver's license, National ID)

**Implementation:** Same pattern as SmileIdProvider, different API endpoints

```typescript
class VeriffProvider implements KycProvider {
  // Handle: Document scanning, OCR, AML screening
}
```

---

### 2.3 Notification System (Email + SMS)

**Status:** Queue tables exist (email_queue, sms_queue); delivery not integrated

#### SendGrid Email Integration (200 lines)
**Timeline:** July 19-21, 2026  
**Effort:** 3 days

**Workflow:**
```
Ledger event created
  ↓
Trigger: Log notification need
  ├─ INSERT INTO email_queue (user_id, type, data)
  ├─ type: COLLECTION_RECEIVED, PAYOUT_SENT, KYC_APPROVED, etc.
  ├─ data: { amount, currency, reference, ... }
  ↓
Background worker (5-minute intervals)
  ├─ SELECT * FROM email_queue WHERE status='PENDING'
  ├─ For each: Call SendGrid API
  ├─ Update email_queue (status=SENT, sent_at=now())
  ├─ On error: status=FAILED, retry_count++
```

**Implementation:**
```typescript
// backend/src/services/notification-service.ts
class NotificationService {
  async sendEmail(userId: string, type: string, data: Record<string, any>) {
    const user = await getUserEmail(userId);
    const template = getEmailTemplate(type);
    const body = template.render(data);
    
    await sgMail.send({
      to: user.email,
      from: 'noreply@ajocircle.com',
      subject: template.subject,
      html: body,
      replyTo: 'support@ajocircle.com',
    });
    
    await db.query(
      'UPDATE email_queue SET status=$1, sent_at=$2 WHERE id=$3',
      ['SENT', new Date(), queueId]
    );
  }

  async processPendingEmails() {
    const queue = await db.query(
      'SELECT * FROM email_queue WHERE status=$1 LIMIT 100',
      ['PENDING']
    );
    for (const item of queue.rows) {
      try {
        await this.sendEmail(item.user_id, item.type, item.data);
      } catch (error) {
        await db.query(
          'UPDATE email_queue SET status=$1, retry_count=$2 WHERE id=$3',
          ['FAILED', item.retry_count + 1, item.id]
        );
      }
    }
  }
}

// Start background worker
setInterval(() => notificationService.processPendingEmails(), 5 * 60 * 1000);
```

**Email Templates:**
- COLLECTION_RECEIVED: "₦{amount} received from {sender}"
- PAYOUT_SENT: "Payout of ₦{amount} sent to {account}"
- KYC_APPROVED: "Welcome to AjoCircle! Your identity is verified"
- GROUP_CREATED: "You've been added to {groupName}"
- DISPUTE_OPENED: "Transaction disputed: {reference}"

---

#### Twilio SMS Integration (200 lines)
**Timeline:** July 22-24, 2026  
**Effort:** 3 days

**Same pattern as email:**
```typescript
class SmsSender {
  async sendSms(userId: string, type: string, data: Record<string, any>) {
    const user = await getUserPhone(userId);
    const message = this.getTemplate(type).render(data);
    
    await twilio.messages.create({
      to: user.phone,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: message,
    });
    
    await db.query('UPDATE sms_queue SET status=$1, sent_at=$2 WHERE id=$3', 
      ['SENT', new Date(), queueId]);
  }
}
```

**SMS Templates:**
- Transaction confirmations (100 chars max)
- OTP delivery for 2FA
- Urgent alerts (failed payouts, high-value transfers)

---

### 2.4 Dispute Resolution Workflow

**Status:** disputes table exists; workflow not implemented

**Timeline:** July 25-31, 2026  
**Effort:** 7 days

**Workflow:**
```
User initiates dispute
  ↓
API: POST /api/disputes
  ├─ Create dispute record (status: OPEN)
  ├─ Notify both parties
  ├─ Lock transaction (prevent modifications)
  ├─ Create hold on disputed amount
  ↓
Admin review (via dashboard)
  ├─ Comment: Request evidence from both parties
  ├─ Timeline: 48-72 hours for response
  ├─ Decision: Approve merchant OR refund customer
  ↓
On approval
  ├─ Update dispute.status (RESOLVED_FOR_MERCHANT or RESOLVED_FOR_CUSTOMER)
  ├─ If refund: Create ledger entry (reverse original transaction)
  ├─ Release hold on amount
  ├─ Notify both parties
```

**Database Schema:**
```sql
ALTER TABLE disputes ADD COLUMN admin_notes TEXT;
ALTER TABLE disputes ADD COLUMN evidence_from_customer JSONB;
ALTER TABLE disputes ADD COLUMN evidence_from_merchant JSONB;
ALTER TABLE disputes ADD COLUMN resolution VARCHAR(50); -- APPROVED_MERCHANT, APPROVED_CUSTOMER
ALTER TABLE disputes ADD COLUMN resolved_at TIMESTAMP;
ALTER TABLE disputes ADD COLUMN resolved_by_user_id UUID REFERENCES users_v2(id);
CREATE INDEX idx_disputes_status_created ON disputes(status, created_at DESC);
```

**API Endpoints:**
```typescript
POST /api/disputes              // User initiates dispute
GET  /api/disputes/{id}         // Fetch dispute details
POST /api/disputes/{id}/comment // Add comment
POST /api/disputes/{id}/resolve // Admin resolves

// Admin dashboard
GET  /api/admin/disputes?status=OPEN&sort=-created_at
POST /api/admin/disputes/{id}/approve
POST /api/admin/disputes/{id}/reject
```

---

## Phase 3: Advanced Features (Aug-Sep 2026)

### 3.1 Trust Scoring & Automated Payouts

**Timeline:** Aug 1-15, 2026  
**Effort:** 15 days

**Concept:** Reduce need for manual admin review of payouts

**Scoring Algorithm:**
- Group age (older = higher trust)
- Member consistency (regular contributors = higher trust)
- Historical payout success (no defaults = higher trust)
- KYC verification level (fully verified = higher trust)
- Transaction volume (larger groups = higher trust)

**Database:**
```sql
CREATE TABLE group_trust_scores (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES savings_groups(id),
  score DECIMAL(3,2), -- 0.00 to 1.00
  calculated_at TIMESTAMP DEFAULT NOW(),
  next_recalculation TIMESTAMP
);

CREATE TABLE auto_payout_rules (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES savings_groups(id),
  min_trust_score DECIMAL(3,2),
  auto_approve BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Workflow:**
```
Payout requested
  ↓
Calculate group trust score
  ├─ SELECT avg(COUNT(*) over 12 months) for consistency
  ├─ SELECT COUNT(*) / expected_count for participation rate
  ├─ SELECT success_rate FROM payout_history
  ├─ SELECT kyc_status FROM group_members
  ↓
IF trust_score >= min_threshold AND auto_approve = true
  ├─ Automatically approve via new PayoutApprovalService
  ├─ Create background job for disbursal
  ├─ Log auto-approval reason
ELSE
  ├─ Create manual approval task for admin
```

---

### 3.2 Group Insurance

**Timeline:** Aug 16-31, 2026  
**Effort:** 16 days

**Concept:** Insure group payouts against default/death of member

**Logic:**
```sql
CREATE TABLE group_insurance_plans (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES savings_groups(id),
  insurance_type VARCHAR(50), -- LIFE, DISABILITY, DEFAULT_PROTECTION
  premium_percentage DECIMAL(5,2), -- 0.5% per payout
  coverage_amount DECIMAL(15,2),
  provider VARCHAR(50), -- UNDERWRITER_NAME
  created_at TIMESTAMP DEFAULT NOW()
);

-- On payout:
-- 1. Calculate insurance premium = amount * premium_percentage
-- 2. Hold premium amount (don't disburse)
-- 3. Transfer to insurance escrow account
-- 4. Monthly: Settle with insurance provider
```

**API Changes:**
```typescript
POST /api/groups/{id}/insurance/setup
  ├─ Select insurance type
  ├─ Confirm premium
  ├─ Create insurance_plan record

GET /api/groups/{id}/insurance/status
  └─ Display coverage, claimed amount, balance
```

---

### 3.3 Diaspora Contribution Pools

**Timeline:** Sep 1-15, 2026  
**Effort:** 15 days

**Concept:** Allow international participants (diaspora) to contribute to groups in home country

**Requirements:**
- Verify diaspora member's foreign address
- Support receiving payments in diaspora currency (USD, EUR, GBP)
- Automatic conversion to recipient currency (NGN, GHS, KES)
- Handle cross-border compliance (AML, sanctions)

**Database:**
```sql
CREATE TABLE diaspora_contributors (
  id UUID PRIMARY KEY,
  group_id UUID REFERENCES savings_groups(id),
  user_id UUID REFERENCES users_v2(id),
  home_country VARCHAR(2),
  resident_country VARCHAR(2),
  resident_address JSONB,
  contribution_currency VARCHAR(3),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE diaspora_conversions (
  id UUID PRIMARY KEY,
  contribution_id UUID REFERENCES contributions(id),
  from_amount DECIMAL(15,2),
  from_currency VARCHAR(3),
  to_amount DECIMAL(15,2),
  to_currency VARCHAR(3),
  exchange_rate DECIMAL(10,6),
  rate_locked_at TIMESTAMP,
  settled_at TIMESTAMP,
  provider VARCHAR(50), -- WISE, REMITLY, etc.
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Workflow:**
```
Diaspora member contributes $100 USD
  ↓
1. Quote exchange rate (Wise API)
   ├─ ₦164,500 @ 1.645 NGN/USD
   ├─ Lock rate for 30 minutes
   ↓
2. Collect payment via Stripe (USD) or Wise (direct transfer)
   ├─ Create transaction record
   ├─ Update ledger (DIASPORA_CONTRIBUTION)
   ↓
3. Settle via Wise (monthly batch)
   ├─ Aggregate all diaspora inflows
   ├─ Execute multi-recipient transfer (NGN to group accounts)
   ├─ Record settlement in diaspora_conversions
```

---

## Phase 4: Analytics & Compliance (Q4 2026)

### 4.1 Dashboard Analytics

**Timeline:** Oct 1-20, 2026  
**Effort:** 20 days

**Charts:**
- Total value locked (by country, currency)
- Active groups (by size, region, payout frequency)
- Member growth (new signups, retention)
- Transaction volume (daily, by provider)
- Provider performance (success rate, response time)
- Revenue (by provider, by country)

**Implementation:**
```typescript
// backend/src/services/analytics-service.ts
class AnalyticsService {
  async getMetricsSnapshot(dateRange: DateRange) {
    return {
      tvl: await this.getTotalValueLocked(dateRange),
      activeGroups: await this.getActiveGroupCount(dateRange),
      newMembers: await this.getNewMemberCount(dateRange),
      transactions: await this.getTransactionStats(dateRange),
      providers: await this.getProviderStats(dateRange),
    };
  }
}
```

---

### 4.2 Advanced Compliance

**Timeline:** Oct 21-31, 2026  
**Effort:** 10 days

**Features:**
- Automated PEP/sanctions screening (Sanction Scanner API)
- Transaction monitoring rules (FinCEN 314(b) pattern matching)
- CDD/EDD triggers (enhanced due diligence for high-risk)
- SAR (Suspicious Activity Report) generation

```sql
CREATE TABLE suspicious_activity_reports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users_v2(id),
  description TEXT,
  risk_score DECIMAL(3,2),
  indicator_ids TEXT[], -- Matching rule IDs
  filed_at TIMESTAMP DEFAULT NOW(),
  filed_by_user_id UUID REFERENCES users_v2(id),
  status VARCHAR(50), -- DRAFT, FILED, REJECTED
  PRIMARY KEY (id)
);
```

---

## Success Metrics & KPIs

### Phase 2 Targets (by end of Jul 2026)
| Metric | Target | Definition |
|--------|--------|-----------|
| Supported Countries | 5 | NG, GH, KE, GB, US |
| Supported Providers | 6 | Paystack, Stripe, Flutterwave, M-Pesa, Razorpay, Wise |
| Provider Success Rate | ≥95% | % of transactions completed successfully |
| KYC Approval Rate | ≥90% | % of users passing Smile ID + Veriff |
| Email Delivery Rate | ≥99% | % of queued emails sent within 5 min |
| SMS Delivery Rate | ≥98% | % of queued SMSs sent within 2 min |
| Dispute Resolution Time | ≤5 days | Average time from open to resolved |

### Phase 3 Targets (by end of Sep 2026)
| Metric | Target | Definition |
|--------|--------|-----------|
| Auto-approval Rate | ≥70% | % of payouts auto-approved (vs manual) |
| Insurance Adoption | ≥40% | % of groups with active insurance |
| Diaspora Contributors | ≥500 | Total diaspora users across all groups |

---

## Resource Planning

### Team Composition (Recommended)

**Phase 2 (Jun-Jul 2026):**
- 1 Backend Engineer (payment providers): Full-time
- 1 Backend Engineer (KYC + notifications): Full-time
- 1 QA Engineer: Full-time (integration testing)
- 1 DevOps Engineer: Part-time (monitoring, alerts, deployment)

**Phase 3 (Aug-Sep 2026):**
- 2 Backend Engineers (features): Full-time
- 1 Data Analyst (analytics service): Part-time

**Phase 4 (Oct-Dec 2026):**
- 1 Backend Engineer (analytics + compliance): Full-time
- 1 Compliance Consultant: Part-time

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Provider API changes (Paystack, Stripe) | High | Monitor provider release notes; version webhooks |
| KYC provider downtime | High | Implement fallback to manual review process |
| Notification delivery delays | Medium | SLA monitoring; escalate to SendGrid/Twilio support |
| Ledger consistency issues | High | Daily validation queries; automated alerts |
| Regulatory changes (KYC, AML) | High | Legal review of config updates; versioned policies |
| Provider fees increase | Medium | Auto-select cheaper providers; negotiate volume discounts |

---

## Go-to-Market Strategy

### Phase 2 Launch
1. **Jun 1-5:** Soft launch with Flutterwave (Ghana expansion)
2. **Jun 6-12:** Launch M-Pesa (Kenya expansion)
3. **Jul 1:** KYC + Smile ID live (required for compliance)
4. **Jul 15:** Notifications (email + SMS) live
5. **Jul 25:** Dispute resolution (manual process initially)

### Phase 3 Launch
1. **Aug 1:** Auto-payout feature for low-risk groups
2. **Sep 1:** Diaspora pools (US · UK diaspora to NG/GH groups)
3. **Sep 15:** Insurance products (partnership with local insurers)

---

## Appendix: Technical Implementation Checklist

### Provider Implementation Checklist (per provider)

- [ ] Create `{Provider}Provider` class (extends PaymentProvider abstract)
- [ ] Implement all 9 abstract methods
- [ ] Add unit tests (signature validation, API response parsing)
- [ ] Add sandbox integration tests
- [ ] Add to PaymentProviderSelector logic
- [ ] Add webhook handler in unified-webhook-handler.ts
- [ ] Add seed data to payment_provider_configs
- [ ] Document in README (API keys, webhook setup)
- [ ] Add monitoring alerts (provider health, error rates)
- [ ] Schedule provider health check (5-minute intervals)

### Database Change Checklist (per feature phase)

- [ ] Design schema changes (columns, tables, indices)
- [ ] Write migration SQL (CREATE, ALTER, ADD INDEX)
- [ ] Test migration on staging database
- [ ] Verify zero-downtime (no table locks, no blocking operations)
- [ ] Add validation views if needed
- [ ] Document schema changes in schema.sql
- [ ] Update seed data if applicable
- [ ] Add audit logging for sensitive changes

---

**Document Version:** 1.0  
**Last Updated:** May 10, 2026  
**Status:** Roadmap Ready for Review
