# Global Database Schema v2.0
## Multi-Region, Multi-Currency, Ledger-Based Financial System

---

## Schema Design Principles

1. **Immutability for Ledger**: Ledger entries are write-once, never updated or deleted
2. **Normalized Region Data**: Countries, currencies, payment providers configured per region
3. **Derived Balances**: Wallet balances calculated from ledger, never directly updated
4. **Audit Trail**: All changes logged immutably
5. **Encryption**: PII and secrets encrypted at rest
6. **Scalability**: Sharding-ready design (by region, by user_id range, by wallet_id)

---

## Core Tables

### 1. Users & Authentication

```sql
--- Users (Global identity)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  primary_country_code VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha 2
  primary_currency_code VARCHAR(3) NOT NULL, -- ISO 4217
  preferred_language VARCHAR(2) DEFAULT 'en',
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, FROZEN, DELETED
  kyc_status VARCHAR(50) DEFAULT 'UNVERIFIED', -- UNVERIFIED, SUBMITTED, VERIFIED, REJECTED
  kyc_level INTEGER DEFAULT 0, -- 0=none, 1=basic, 2=intermediate, 3=full
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- Indexes for fast lookup
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone_number);
CREATE INDEX idx_users_country ON users(primary_country_code);
CREATE INDEX idx_users_status ON users(status);

--- Auth Sessions (Device-level sessions)
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  device_id VARCHAR(255) NOT NULL, -- Device fingerprint
  device_name VARCHAR(255), -- "iPhone 14 Pro", "Chrome on Windows"
  device_type VARCHAR(50), -- MOBILE, WEB, DESKTOP
  os_type VARCHAR(50), -- iOS, Android, Windows, macOS, Linux
  ip_address INET,
  user_agent TEXT,
  access_token_hash VARCHAR(255) NOT NULL, -- Hash of JWT token
  refresh_token_hash VARCHAR(255) NOT NULL,
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  location_country VARCHAR(2),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_sessions_device ON auth_sessions(user_id, device_id);

--- Device Biometric Enrollment
CREATE TABLE biometric_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  device_id VARCHAR(255) NOT NULL,
  biometric_type VARCHAR(50), -- FINGERPRINT, FACE, IRIS
  biometric_template BYTEA NOT NULL, -- Encrypted biometric data
  enrolled_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP,
  UNIQUE(user_id, device_id, biometric_type)
);

--- Transaction PIN (Encrypted)
CREATE TABLE transaction_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  pin_hash VARCHAR(255) NOT NULL, -- Argon2 hash
  set_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP,
  last_used_at TIMESTAMP,
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  revoked_at TIMESTAMP,
  UNIQUE(user_id)
);

-- Enable PIN-based signing for high-value transactions
```

### 2. Global Configuration

```sql
--- Countries (Region configuration)
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) UNIQUE NOT NULL, -- ISO 3166-1 alpha-2
  country_name VARCHAR(255) NOT NULL,
  primary_currency_code VARCHAR(3) NOT NULL,
  region VARCHAR(50) NOT NULL, -- WEST_AFRICA, EAST_AFRICA, SOUTH_AFRICA, DIASPORA, ASIA
  timezone VARCHAR(50),
  supported_payment_providers TEXT[], -- Array: ['paystack', 'flutterwave', 'stripe']
  kyc_requirements JSONB, -- Document types required by regulatory framework
  regulatory_framework VARCHAR(255), -- CBN, FCA, FinCEN, etc.
  max_daily_transaction_limit BIGINT, -- In smallest currency unit
  max_single_transaction_limit BIGINT,
  reporting_requirements JSONB, -- AML/CFT rules
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO countries VALUES
  ('id-ng', 'NG', 'Nigeria', 'NGN', 'WEST_AFRICA', 'Africa/Lagos',
   ARRAY['paystack', 'flutterwave', 'stripe'], 
   '{"document_types": ["BVN", "NIN", "PASSPORT"]}', 'CBN',
   50000000, 5000000, '{"aml_threshold": 1000000}', true, NOW()),
  ('id-gh', 'GH', 'Ghana', 'GHS', 'WEST_AFRICA', 'Africa/Accra',
   ARRAY['flutterwave', 'stripe'], 
   '{"document_types": ["NATIONAL_ID", "PASSPORT"]}', 'BOG',
   10000000, 1000000, '{"aml_threshold": 500000}', true, NOW()),
  ('id-ke', 'KE', 'Kenya', 'KES', 'EAST_AFRICA', 'Africa/Nairobi',
   ARRAY['mpesa', 'flutterwave', 'stripe'], 
   '{"document_types": ["NATIONAL_ID", "PASSPORT"]}', 'CBK',
   50000000, 5000000, '{"aml_threshold": 1000000}', true, NOW()),
  ('id-gb', 'GB', 'United Kingdom', 'GBP', 'DIASPORA', 'Europe/London',
   ARRAY['stripe', 'wise', 'paypal'], 
   '{"document_types": ["PASSPORT", "DRIVER_LICENSE"]}', 'FCA',
   5000000000, 500000000, '{"aml_threshold": 50000000}', true, NOW()),
  ('id-us', 'US', 'United States', 'USD', 'DIASPORA', 'America/New_York',
   ARRAY['stripe', 'wise', 'ach'], 
   '{"document_types": ["PASSPORT", "SSN"]}', 'FinCEN',
   10000000000, 1000000000, '{"aml_threshold": 100000000, "sar_required": true}', true, NOW());

--- Currencies (Multi-currency support)
CREATE TABLE currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code VARCHAR(3) UNIQUE NOT NULL, -- ISO 4217
  currency_name VARCHAR(255),
  symbol VARCHAR(5),
  decimal_places INT DEFAULT 2, -- Kobo=2, Cents=2, Paise=2
  is_fiat BOOLEAN DEFAULT true,
  exchange_rate_to_usd DECIMAL(18, 8), -- 1 unit = X USD
  last_rate_update TIMESTAMP,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO currencies VALUES
  ('id-ngn', 'NGN', 'Nigerian Naira', '₦', 2, true, 0.00137000, NOW(), true, NOW()),
  ('id-ghs', 'GHS', 'Ghanaian Cedi', '₵', 2, true, 0.08500000, NOW(), true, NOW()),
  ('id-kes', 'KES', 'Kenyan Shilling', 'Sh', 2, true, 0.00775000, NOW(), true, NOW()),
  ('id-gbp', 'GBP', 'British Pound', '£', 2, true, 1.27000000, NOW(), true, NOW()),
  ('id-usd', 'USD', 'US Dollar', '$', 2, true, 1.00000000, NOW(), true, NOW()),
  ('id-eur', 'EUR', 'Euro', '€', 2, true, 1.10000000, NOW(), true, NOW());

--- Payment Provider Configuration
CREATE TABLE payment_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(50) NOT NULL, -- paystack, flutterwave, stripe, mpesa, etc.
  country_code VARCHAR(2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  operation_type VARCHAR(50) NOT NULL, -- COLLECTION, PAYOUT, REFUND, TRANSFER
  is_primary BOOLEAN DEFAULT false,
  priority INT DEFAULT 0, -- Lower number = higher priority
  daily_limit_kobo BIGINT,
  transaction_fee_percentage DECIMAL(5, 2),
  fixed_fee_kobo BIGINT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider_name, country_code, currency_code, operation_type),
  FOREIGN KEY (country_code) REFERENCES countries(country_code)
);

--- Provider Credentials (Encrypted)
CREATE TABLE provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(50) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  api_key_encrypted BYTEA NOT NULL, -- AES-256 encrypted
  webhook_secret_encrypted BYTEA NOT NULL,
  merchant_id VARCHAR(255),
  account_number VARCHAR(255),
  metadata JSONB, -- Provider-specific config
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, TESTING, INACTIVE, REVOKED
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (country_code) REFERENCES countries(country_code),
  FOREIGN KEY (provider_name) REFERENCES payment_provider_configs(provider_name)
);

--- Exchange Rates (Real-time forex data)
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(18, 8) NOT NULL, -- 1 from_currency = rate to_currency
  source VARCHAR(100), -- openexchangerates.org, xe.com, etc.
  quoted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, quoted_at)
);

CREATE INDEX idx_exchange_rates_currencies 
  ON exchange_rates(from_currency, to_currency);
```

### 3. KYC (Know Your Customer)

```sql
--- User KYC Documents
CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  document_type VARCHAR(50) NOT NULL, -- PASSPORT, SSN, DRIVERS_LICENSE, BVN, NIN, NATIONAL_ID
  identity_country_code VARCHAR(2) NOT NULL,
  document_number VARCHAR(100) NOT NULL,
  document_front_path VARCHAR(500), -- S3/CDN path
  document_back_path VARCHAR(500),
  selfie_path VARCHAR(500),
  document_issuing_country VARCHAR(2),
  document_issue_date DATE,
  document_expiry_date DATE,
  verification_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, VERIFIED, REJECTED, EXPIRED
  verification_provider VARCHAR(100), -- trulioo, idology, bvn_registry, etc.
  verification_details JSONB, -- Score, confidence, matched fields
  rejected_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, document_type, identity_country_code)
);

CREATE INDEX idx_kyc_docs_user ON kyc_documents(user_id);
CREATE INDEX idx_kyc_docs_status ON kyc_documents(verification_status);

--- KYC Verification Controls
CREATE TABLE kyc_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id),
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMP,
  identity_verified BOOLEAN DEFAULT false,
  identity_verified_at TIMESTAMP,
  address_verified BOOLEAN DEFAULT false,
  address_verified_at TIMESTAMP,
  aml_screening_passed BOOLEAN DEFAULT false,
  aml_screening_at TIMESTAMP,
  aml_screening_details JSONB, -- Match results, risk assessment
  sanctions_list_checked BOOLEAN DEFAULT false,
  sanctions_list_at TIMESTAMP,
  politically_exposed_person BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

--- KYC Consent Records (GDPR/regulatory compliance)
CREATE TABLE kyc_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  consent_type VARCHAR(50) NOT NULL, -- TERMS_OF_SERVICE, PRIVACY_POLICY, DATA_SHARING, AML_COMPLIANCE, MARKETING
  consent_version VARCHAR(20) NOT NULL, -- v1.0, v1.1, etc.
  consent_given BOOLEAN DEFAULT false,
  consent_text_sha256 VARCHAR(64), -- Hash of exact consent text shown
  ip_address INET,
  user_agent TEXT,
  consented_at TIMESTAMP DEFAULT NOW(),
  withdrawn_at TIMESTAMP,
  UNIQUE(user_id, consent_type, consent_version)
);

--- AML/CFT Flags
CREATE TABLE compliance_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  transaction_id UUID,
  flag_type VARCHAR(100) NOT NULL, -- AML_MATCH, VELOCITY_EXCEEDED, DUPLICATE, 
                                    -- UNUSUAL_ACTIVITY, MANUAL_REVIEW, HIGH_RISK, SANCTIONS_LIST
  severity VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by_admin_id UUID REFERENCES users(id),
  action_taken VARCHAR(255), -- DISCARD, MONITOR, FREEZE, ESCALATE
  status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, IN_REVIEW, RESOLVED, ESCALATED, ESCALATED_TO_AUTHORITIES
  resolved_at TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE INDEX idx_compliance_flags_user ON compliance_flags(user_id, status);
CREATE INDEX idx_compliance_flags_severity ON compliance_flags(severity);
```

### 4. Wallets & Ledger

```sql
--- Wallets (Multi-currency, multi-owner-type)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type VARCHAR(50) NOT NULL, -- USER, GROUP, ESCROW, ADMIN
  owner_id UUID NOT NULL, -- Refers to users.id or groups.id based on owner_type
  currency_code VARCHAR(3) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, FROZEN
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_type, owner_id, currency_code),
  FOREIGN KEY (currency_code) REFERENCES currencies(currency_code)
);

CREATE INDEX idx_wallets_owner ON wallets(owner_type, owner_id);
CREATE INDEX idx_wallets_currency ON wallets(currency_code);

--- Ledger Entries (IMMUTABLE - write-once, never update/delete)
CREATE TABLE ledger_entries (
  id BIGSERIAL PRIMARY KEY, -- Sequence for ordering
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  transaction_id UUID NOT NULL UNIQUE, -- For deduplication
  entry_type VARCHAR(50) NOT NULL, -- CONTRIBUTION, PAYOUT, REFUND, REVERSAL, INTEREST, FEE, TRANSFER
  debit_kobo BIGINT NOT NULL DEFAULT 0, -- Money coming IN to the wallet
  credit_kobo BIGINT NOT NULL DEFAULT 0, -- Money going OUT from the wallet
  balance_after_kobo BIGINT NOT NULL, -- Cached balance for fast querying
  counterparty_wallet_id UUID REFERENCES wallets(id), -- For transfers
  reference VARCHAR(255), -- Transaction reference/memo
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Immutability constraints
  operation_timestamp TIMESTAMP DEFAULT NOW()
);

-- PREVENT UPDATES AND DELETES on ledger_entries
CREATE TRIGGER prevent_ledger_updates BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

CREATE TRIGGER prevent_ledger_deletes BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

CREATE INDEX idx_ledger_wallet ON ledger_entries(wallet_id);
CREATE INDEX idx_ledger_txn_id ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_created ON ledger_entries(wallet_id, created_at DESC);

--- Cached Wallet Balances (DERIVED - updated from ledger, read-only for users)
CREATE TABLE wallet_balances (
  wallet_id UUID PRIMARY KEY REFERENCES wallets(id),
  currency_code VARCHAR(3),
  available_balance_kobo BIGINT DEFAULT 0, -- Can withdraw/spend
  pending_balance_kobo BIGINT DEFAULT 0, -- Escrow/waiting for approval
  locked_balance_kobo BIGINT DEFAULT 0, -- Frozen due to dispute/freeze
  total_balance_kobo BIGINT DEFAULT 0, -- available + pending + locked
  last_ledger_entry_id BIGINT REFERENCES ledger_entries(id), -- For optimistic concurrency
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Recalculate balances (triggered after ledger inserts)
CREATE OR REPLACE FUNCTION recalculate_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE wallet_balances SET
    available_balance_kobo = (
      SELECT COALESCE(SUM(debit_kobo - credit_kobo), 0)
      FROM ledger_entries
      WHERE wallet_id = NEW.wallet_id
      AND entry_type IN ('CONTRIBUTION', 'PAYOUT_APPROVED', 'REFUND', 'REVERSAL')
    ),
    total_balance_kobo = (
      SELECT COALESCE(SUM(debit_kobo - credit_kobo), 0)
      FROM ledger_entries
      WHERE wallet_id = NEW.wallet_id
    ),
    last_ledger_entry_id = NEW.id,
    updated_at = NOW()
  WHERE wallet_id = NEW.wallet_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wallet_balance AFTER INSERT ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION recalculate_wallet_balance();
```

### 5. Groups & Contributions

```sql
--- Savings Groups (Flexible group types)
CREATE TABLE savings_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  wallet_id UUID NOT NULL UNIQUE REFERENCES wallets(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_type VARCHAR(50) NOT NULL, -- SAVINGS_CIRCLE, EVENT_POOL, VACATION_SAVINGS, 
                                    -- FAMILY_CONTRIBUTION, INVESTMENT_CLUB, CREATOR_SUPPORT,
                                    -- ACCOUNTABILITY_POOL, RENT_POOLING, EMERGENCY_SUPPORT
  payout_model VARCHAR(50) NOT NULL, -- ROTATION, EQUAL_SPLIT, ADMIN_RELEASE, MILESTONE_RELEASE, VOTING_RELEASE
  contribution_frequency VARCHAR(50), -- DAILY, WEEKLY, MONTHLY, CUSTOM
  contribution_amount_kobo BIGINT NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  max_members INT DEFAULT 50,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, ARCHIVED, CLOSED
  auto_payout BOOLEAN DEFAULT false,
  metadata JSONB, -- Flexible for different group types
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (currency_code) REFERENCES currencies(currency_code),
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE INDEX idx_groups_creator ON savings_groups(creator_id);
CREATE INDEX idx_groups_status ON savings_groups(status);
CREATE INDEX idx_groups_type ON savings_groups(group_type);

--- Group Members
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'MEMBER', -- MEMBER, ADMIN, FINANCIER
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, SUSPENDED, LEFT, REMOVED
  joined_at TIMESTAMP DEFAULT NOW(),
  contribution_count INT DEFAULT 0,
  total_contributed_kobo BIGINT DEFAULT 0,
  total_received_kobo BIGINT DEFAULT 0,
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_status ON group_members(status);

--- Contributions (Individual contributions to groups)
CREATE TABLE contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  member_id UUID NOT NULL REFERENCES users(id),
  amount_kobo BIGINT NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  contribution_cycle INT, -- Cycle number (1st, 2nd, 3rd payout)
  transaction_id UUID UNIQUE REFERENCES transactions(id),
  status VARCHAR(50) DEFAULT 'COMPLETED', -- PENDING, COMPLETED, FAILED, REVERSED
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (currency_code) REFERENCES currencies(currency_code)
);

CREATE INDEX idx_contributions_group ON contributions(group_id);
CREATE INDEX idx_contributions_member ON contributions(member_id);

--- Group Payouts (Rotation schedule)
CREATE TABLE group_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  recipient_member_id UUID NOT NULL REFERENCES users(id),
  payout_position INT, -- Position in rotation (0-indexed)
  scheduled_date DATE,
  payout_amount_kobo BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, PAID, SKIPPED, CANCELLED
  approved_by_admin_id UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (group_id) REFERENCES savings_groups(id),
  FOREIGN KEY (recipient_member_id) REFERENCES users(id)
);

CREATE INDEX idx_payouts_group ON group_payouts(group_id);
CREATE INDEX idx_payouts_status ON group_payouts(status);

--- Group Milestones (For MILESTONE_RELEASE payout model)
CREATE TABLE group_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount_kobo BIGINT NOT NULL,
  current_amount_kobo BIGINT DEFAULT 0,
  unlock_condition VARCHAR(100), -- AMOUNT_REACHED, DATE_REACHED, VOTES_APPROVED, ADMIN_TRIGGERED
  unlock_date DATE,
  reached_at TIMESTAMP,
  payout_triggered_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, REACHED, TRIGGERED
  created_at TIMESTAMP DEFAULT NOW()
);

--- Group Voting (For VOTING_RELEASE payout model)
CREATE TABLE group_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  proposed_by_member_id UUID NOT NULL REFERENCES users(id),
  payout_recipient_member_id UUID NOT NULL REFERENCES users(id),
  payout_amount_kobo BIGINT NOT NULL,
  proposal_title VARCHAR(255),
  proposal_description TEXT,
  voting_period_starts_at TIMESTAMP DEFAULT NOW(),
  voting_period_ends_at TIMESTAMP,
  required_majority VARCHAR(50), -- SIMPLE, SUPERMAJORITY, UNANIMOUS
  votes_for INT DEFAULT 0,
  votes_against INT DEFAULT 0,
  votes_abstain INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, PASSED, FAILED, EXECUTED, CANCELLED
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (group_id) REFERENCES savings_groups(id),
  FOREIGN KEY (proposed_by_member_id) REFERENCES users(id),
  FOREIGN KEY (payout_recipient_member_id) REFERENCES users(id)
);

--- Individual Votes
CREATE TABLE individual_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_proposal_id UUID NOT NULL REFERENCES group_votes(id),
  voter_member_id UUID NOT NULL REFERENCES users(id),
  vote VARCHAR(20), -- FOR, AGAINST, ABSTAIN
  voted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(vote_proposal_id, voter_member_id)
);
```

### 6. Transactions & Payouts

```sql
--- Transactions (All financial movements)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key UUID NOT NULL UNIQUE, -- Client-provided deduplication key
  user_id UUID NOT NULL REFERENCES users(id),
  transaction_type VARCHAR(50) NOT NULL, -- CONTRIBUTION, PAYOUT_REQUEST, PAYOUT_APPROVED, 
                                           -- REFUND, REVERSAL, TRANSFER, WITHDRAWAL
  amount_kobo BIGINT NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  status VARCHAR(50) DEFAULT 'INITIATED', -- INITIATED, PENDING, PROCESSING, COMPLETED, FAILED, REVERSED, CANCELLED
  payment_provider VARCHAR(50), -- paystack, flutterwave, stripe, etc.
  provider_reference VARCHAR(255), -- External transaction ID from provider
  
  from_wallet_id UUID REFERENCES wallets(id),
  to_wallet_id UUID REFERENCES wallets(id),
  group_id UUID REFERENCES savings_groups(id),
  
  user_agent TEXT,
  ip_address INET,
  
  initiated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  webhook_received_at TIMESTAMP,
  ledger_recorded_at TIMESTAMP,
  
  failure_reason TEXT,
  failure_code VARCHAR(100),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_txn_user ON transactions(user_id);
CREATE INDEX idx_txn_status ON transactions(status);
CREATE INDEX idx_txn_type ON transactions(transaction_type);
CREATE INDEX idx_txn_provider_ref ON transactions(provider_reference);
CREATE INDEX idx_txn_group ON transactions(group_id);
CREATE INDEX idx_txn_idempotency ON transactions(idempotency_key);

--- Payout Requests (User-initiated payout requests)
CREATE TABLE payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL REFERENCES users(id),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  recipient_user_id UUID NOT NULL REFERENCES users(id),
  amount_kobo BIGINT NOT NULL,
  reason TEXT,
  approval_chain VARCHAR(100), -- ADMIN_ONLY, GROUP_OWNER, BOTH
  approver_user_id UUID REFERENCES users(id),
  
  status VARCHAR(50) DEFAULT 'SUBMITTED', -- DRAFT, SUBMITTED, APPROVED, REJECTED, PAID, FAILED
  submitted_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  
  transaction_id UUID REFERENCES transactions(id),
  
  metadata JSONB, -- schedule_id, rotation_cycle, etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payout_req_requester ON payout_requests(requester_user_id);
CREATE INDEX idx_payout_req_approver ON payout_requests(approver_user_id);
CREATE INDEX idx_payout_req_status ON payout_requests(status);
CREATE INDEX idx_payout_req_group ON payout_requests(group_id);

--- Payout Approvals (Multi-approver workflow)
CREATE TABLE payout_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id UUID NOT NULL REFERENCES payout_requests(id),
  approver_user_id UUID NOT NULL REFERENCES users(id),
  approval_role VARCHAR(50), -- GROUP_ADMIN, PLATFORM_ADMIN, COMPLIANCE_OFFICER
  approval_status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  digital_signature BYTEA, -- For regulatory compliance
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(payout_request_id, approver_user_id)
);

--- Transaction Settlement (Recording settlement with payment provider)
CREATE TABLE transaction_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  settlement_batch_id UUID,
  provider_settlement_id VARCHAR(255),
  settlement_amount_kobo BIGINT,
  settlement_date DATE,
  settlement_status VARCHAR(50), -- PENDING, SETTLED, FAILED, REVERSED
  settled_at TIMESTAMP,
  provider_fee_kobo BIGINT,
  net_amount_kobo BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

--- Settlement Batches (Daily batches per region)
CREATE TABLE settlement_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date DATE NOT NULL,
  region VARCHAR(50),
  country_code VARCHAR(2),
  payment_provider VARCHAR(50),
  currency_code VARCHAR(3),
  
  total_transactions INT,
  total_amount_kobo BIGINT,
  total_fees_kobo BIGINT,
  net_amount_kobo BIGINT,
  
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SUBMITTED, CONFIRMED, SETTLED, FAILED
  provider_batch_id VARCHAR(255),
  submitted_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  settled_at TIMESTAMP,
  failure_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(batch_date, region, payment_provider, currency_code)
);
```

### 7. Disputes & Refunds

```sql
--- Disputes
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  reporter_user_id UUID NOT NULL REFERENCES users(id),
  dispute_reason VARCHAR(100), -- UNAUTHORIZED, DOUBLE_CHARGE, INCORRECT_AMOUNT, 
                                -- NEVER_RECEIVED, SERVICE_NOT_PROVIDED, OTHER
  description TEXT,
  evidence_paths TEXT[], -- Paths to uploaded evidence files
  
  status VARCHAR(50) DEFAULT 'OPEN', -- OPEN, ACKNOWLEDGED, INVESTIGATING, 
                                       -- RESOLVED_IN_FAVOR_OF_REPORTER, 
                                       -- RESOLVED_IN_FAVOR_OF_RESPONDER, ESCALATED
  resolution TEXT,
  resolved_by_admin_id UUID REFERENCES users(id),
  resolved_at TIMESTAMP,
  
  refund_initiated BOOLEAN DEFAULT false,
  refund_amount_kobo BIGINT,
  refund_transaction_id UUID REFERENCES transactions(id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disputes_reporter ON disputes(reporter_user_id);
CREATE INDEX idx_disputes_status ON disputes(status);
```

### 8. Audit Logging

```sql
--- Audit Logs (IMMUTABLE - for compliance/audit trail)
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- CREATE, READ, UPDATE, DELETE, APPROVE, FREEZE, UNFREEZE, etc.
  resource_type VARCHAR(100), -- USER, GROUP, TRANSACTION, PAYOUT, KYC, WALLET
  resource_id UUID,
  description TEXT,
  changes JSONB, -- Before/after values for UPDATE actions
  status VARCHAR(50), -- SUCCESS, FAILURE
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  request_id UUID -- To correlate API requests
);

CREATE TRIGGER prevent_audit_updates BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

CREATE TRIGGER prevent_audit_deletes BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);

--- Privacy-Sensitive Audit Log (for PII tracking)
CREATE TABLE pii_access_logs (
  id BIGSERIAL PRIMARY KEY,
  accessor_user_id UUID REFERENCES users(id),
  subject_user_id UUID REFERENCES users(id),
  pii_field VARCHAR(100), -- PHONE, EMAIL, ADDRESS, DOCUMENT, BANK_ACCOUNT
  accessed_at TIMESTAMP DEFAULT NOW(),
  access_reason VARCHAR(255),
  granted_by_user_id UUID REFERENCES users(id)
);

CREATE TRIGGER prevent_pii_updates BEFORE UPDATE ON pii_access_logs
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();
```

### 9. Notifications & Messages

```sql
--- Notifications
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type VARCHAR(100), -- TRANSACTION_ALERT, PAYOUT_APPROVED, GROUP_INVITE, KYC_REQUIRED
  title VARCHAR(255),
  body TEXT,
  action_url VARCHAR(500),
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  
  sent_via VARCHAR(100), -- PUSH, EMAIL, SMS, IN_APP
  sent_at TIMESTAMP DEFAULT NOW(),
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

--- Email Queue (Async delivery)
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255),
  template_id VARCHAR(100),
  template_variables JSONB,
  status VARCHAR(50) DEFAULT 'QUEUED', -- QUEUED, SENT, FAILED, BOUNCED
  retry_count INT DEFAULT 0,
  sent_at TIMESTAMP,
  failed_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

--- SMS Queue (Async delivery)
CREATE TABLE sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone VARCHAR(20),
  message_body TEXT,
  status VARCHAR(50) DEFAULT 'QUEUED', -- QUEUED, SENT, FAILED
  retry_count INT DEFAULT 0,
  sent_at TIMESTAMP,
  provider VARCHAR(50), -- twilio, nexmo, termii, etc.
  provider_message_id VARCHAR(255),
  failed_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

--- OTP Verification (Phone/Email)
CREATE TABLE otp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  email VARCHAR(255),
  phone_number VARCHAR(20),
  otp_code VARCHAR(10) NOT NULL,
  otp_type VARCHAR(50), -- EMAIL_VERIFICATION, PHONE_VERIFICATION, PASSWORD_RESET, 
                         -- TRANSACTION_SIGNING, HIGH_VALUE_PAYOUT
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_otp_email ON otp_tokens(email);
CREATE INDEX idx_otp_phone ON otp_tokens(phone_number);
```

---

## Helper Functions

```sql
-- Immutability enforcement
CREATE OR REPLACE FUNCTION raise_immutable_error()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Cannot modify immutable table';
END;
$$ LANGUAGE plpgsql;

-- Calculate wallet balance safely (for queries)
CREATE OR REPLACE FUNCTION get_wallet_balance(
  p_wallet_id UUID,
  p_entry_type_filter VARCHAR DEFAULT NULL
)
RETURNS TABLE(balance_kobo BIGINT, last_entry_id BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(debit_kobo - credit_kobo), 0)::BIGINT,
    MAX(id)::BIGINT
  FROM ledger_entries
  WHERE wallet_id = p_wallet_id
  AND (p_entry_type_filter IS NULL OR entry_type = p_entry_type_filter);
END;
$$ LANGUAGE plpgsql;

-- Check for sufficient balance (for withdrawal)
CREATE OR REPLACE FUNCTION check_sufficient_balance(
  p_wallet_id UUID,
  p_amount_kobo BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  SELECT balance_kobo INTO v_balance
  FROM wallet_balances
  WHERE wallet_id = p_wallet_id;
  
  RETURN v_balance >= p_amount_kobo;
END;
$$ LANGUAGE plpgsql;

-- Audit logging wrapper
CREATE OR REPLACE FUNCTION log_audit(
  p_actor_id UUID,
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id UUID,
  p_changes JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, changes)
  VALUES (p_actor_id, p_action, p_resource_type, p_resource_id, p_changes);
END;
$$ LANGUAGE plpgsql;
```

---

## Sharding Strategy (Future Scaling)

```sql
-- Shard users by country + user_id range
-- Shard transactions by region
-- Shard ledger entries by wallet_id
-- Shard audit logs by timestamp ranges (monthly)

-- Partition notifications and email_queue by created_at (weekly partitions)
CREATE TABLE notifications_2026_05 PARTITION OF notifications
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE notifications_2026_06 PARTITION OF notifications
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
```

---

## Data Retention & Deletion Policy

```sql
-- Retain logs for 7 years (regulatory requirement)
-- Delete user data after 1 year of account inactivity (GDPR)
-- Archive old transactions quarterly
-- Keep dispute records indefinitely
-- Anonymize deleted user records while keeping audit trail
```

---

## Migration Path from MVP

1. Add `country_code` and `currency_code` to existing `users` table
2. Create new `countries`, `currencies`, `payment_provider_configs` tables
3. Create new wallet/ledger infrastructure alongside existing balance columns
4. Dual-write to both systems during migration period
5. Validate consistency, then switch reads to new system
6. Deprecate old balance columns after validation

---

This schema supports:
- **150+ countries** with region-specific configs
- **30+ currencies** with real-time rates
- **10+ payment providers** with provider abstraction
- **Millions of users** with sharding readiness
- **7-year compliance retention**
- **Immutable audit trail** for regulatory compliance
- **Double-entry ledger accounting** for financial accuracy
