-- Migration 001: Create v2.0 Global Database Schema
-- Timestamp: 2026-05-10
-- Purpose: Create multi-region, multi-currency, ledger-based financial system
-- Strategy: Parallel to existing schema, enable dual-write during cutover

BEGIN;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION raise_immutable_error()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Cannot modify immutable table';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GLOBAL CONFIGURATION TABLES
-- ============================================================================

-- Countries (Region configuration)
CREATE TABLE IF NOT EXISTS countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(2) UNIQUE NOT NULL,
  country_name VARCHAR(255) NOT NULL,
  primary_currency_code VARCHAR(3) NOT NULL,
  region VARCHAR(50) NOT NULL,
  timezone VARCHAR(50),
  supported_payment_providers TEXT[],
  kyc_requirements JSONB,
  regulatory_framework VARCHAR(255),
  max_daily_transaction_limit BIGINT,
  max_single_transaction_limit BIGINT,
  reporting_requirements JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_countries_code ON countries(country_code);
CREATE INDEX idx_countries_region ON countries(region);

-- Currencies (Multi-currency support)
CREATE TABLE IF NOT EXISTS currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code VARCHAR(3) UNIQUE NOT NULL,
  currency_name VARCHAR(255),
  symbol VARCHAR(5),
  decimal_places INT DEFAULT 2,
  is_fiat BOOLEAN DEFAULT true,
  exchange_rate_to_usd DECIMAL(18, 8),
  last_rate_update TIMESTAMP,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_currencies_code ON currencies(currency_code);

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- Extend users table or create new v2 users (keeping MVP separate initially)
CREATE TABLE IF NOT EXISTS users_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  primary_country_code VARCHAR(2) NOT NULL,
  primary_currency_code VARCHAR(3) NOT NULL,
  preferred_language VARCHAR(2) DEFAULT 'en',
  status VARCHAR(50) DEFAULT 'ACTIVE',
  kyc_status VARCHAR(50) DEFAULT 'UNVERIFIED',
  kyc_level INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  FOREIGN KEY (primary_country_code) REFERENCES countries(country_code),
  FOREIGN KEY (primary_currency_code) REFERENCES currencies(currency_code)
);

CREATE INDEX idx_users_v2_email ON users_v2(email);
CREATE INDEX idx_users_v2_phone ON users_v2(phone_number);
CREATE INDEX idx_users_v2_country ON users_v2(primary_country_code);
CREATE INDEX idx_users_v2_status ON users_v2(status);

-- Auth Sessions (Device-level sessions)
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_v2(id),
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  os_type VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  access_token_hash VARCHAR(255) NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  access_token_expires_at TIMESTAMP NOT NULL,
  refresh_token_expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  location_country VARCHAR(2),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

CREATE INDEX idx_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_sessions_device ON auth_sessions(user_id, device_id);

-- Biometric Enrollments
CREATE TABLE IF NOT EXISTS biometric_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_v2(id),
  device_id VARCHAR(255) NOT NULL,
  biometric_type VARCHAR(50),
  biometric_template BYTEA NOT NULL,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  revoked_at TIMESTAMP,
  UNIQUE(user_id, device_id, biometric_type)
);

-- Transaction PIN (Encrypted)
CREATE TABLE IF NOT EXISTS transaction_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_v2(id),
  pin_hash VARCHAR(255) NOT NULL,
  set_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP,
  last_used_at TIMESTAMP,
  failed_attempts INT DEFAULT 0,
  locked_until TIMESTAMP,
  revoked_at TIMESTAMP,
  UNIQUE(user_id)
);

-- OTP Tokens
CREATE TABLE IF NOT EXISTS otp_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users_v2(id),
  email VARCHAR(255),
  phone_number VARCHAR(20),
  otp_code VARCHAR(10) NOT NULL,
  otp_type VARCHAR(50),
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_otp_email ON otp_tokens(email);
CREATE INDEX idx_otp_phone ON otp_tokens(phone_number);
CREATE INDEX idx_otp_expires ON otp_tokens(expires_at);

-- ============================================================================
-- PAYMENT PROVIDER CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(50) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  priority INT DEFAULT 0,
  daily_limit_kobo BIGINT,
  transaction_fee_percentage DECIMAL(5, 2),
  fixed_fee_kobo BIGINT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider_name, country_code, currency_code, operation_type),
  FOREIGN KEY (country_code) REFERENCES countries(country_code),
  FOREIGN KEY (currency_code) REFERENCES currencies(currency_code)
);

CREATE INDEX idx_provider_config_country ON payment_provider_configs(country_code);

-- Provider Credentials (Encrypted)
CREATE TABLE IF NOT EXISTS provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name VARCHAR(50) NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  api_key_encrypted BYTEA NOT NULL,
  webhook_secret_encrypted BYTEA NOT NULL,
  merchant_id VARCHAR(255),
  account_number VARCHAR(255),
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (country_code) REFERENCES countries(country_code)
);

-- Exchange Rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency VARCHAR(3) NOT NULL,
  to_currency VARCHAR(3) NOT NULL,
  rate DECIMAL(18, 8) NOT NULL,
  source VARCHAR(100),
  quoted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, quoted_at),
  FOREIGN KEY (from_currency) REFERENCES currencies(currency_code),
  FOREIGN KEY (to_currency) REFERENCES currencies(currency_code)
);

CREATE INDEX idx_exchange_rates_pair ON exchange_rates(from_currency, to_currency);

-- ============================================================================
-- KYC (KNOW YOUR CUSTOMER)
-- ============================================================================

-- KYC Documents
CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_v2(id),
  document_type VARCHAR(50) NOT NULL,
  identity_country_code VARCHAR(2) NOT NULL,
  document_number VARCHAR(100) NOT NULL,
  document_front_path VARCHAR(500),
  document_back_path VARCHAR(500),
  selfie_path VARCHAR(500),
  document_issuing_country VARCHAR(2),
  document_issue_date DATE,
  document_expiry_date DATE,
  verification_status VARCHAR(50) DEFAULT 'PENDING',
  verification_provider VARCHAR(100),
  verification_details JSONB,
  rejected_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, document_type, identity_country_code)
);

CREATE INDEX idx_kyc_docs_user ON kyc_documents(user_id);
CREATE INDEX idx_kyc_docs_status ON kyc_documents(verification_status);

-- KYC Verification Controls
CREATE TABLE IF NOT EXISTS kyc_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users_v2(id),
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
  aml_screening_details JSONB,
  sanctions_list_checked BOOLEAN DEFAULT false,
  sanctions_list_at TIMESTAMP,
  politically_exposed_person BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- KYC Consents
CREATE TABLE IF NOT EXISTS kyc_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users_v2(id),
  consent_type VARCHAR(50) NOT NULL,
  consent_version VARCHAR(20) NOT NULL,
  consent_given BOOLEAN DEFAULT false,
  consent_text_sha256 VARCHAR(64),
  ip_address INET,
  user_agent TEXT,
  consented_at TIMESTAMP DEFAULT NOW(),
  withdrawn_at TIMESTAMP,
  UNIQUE(user_id, consent_type, consent_version)
);

-- Compliance Flags
CREATE TABLE IF NOT EXISTS compliance_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  transaction_id UUID,
  flag_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  reviewed_by_admin_id UUID REFERENCES users_v2(id),
  action_taken VARCHAR(255),
  status VARCHAR(50) DEFAULT 'OPEN',
  resolved_at TIMESTAMP,
  notes TEXT,
  FOREIGN KEY (user_id) REFERENCES users_v2(id)
);

CREATE INDEX idx_compliance_flags_user ON compliance_flags(user_id, status);
CREATE INDEX idx_compliance_flags_severity ON compliance_flags(severity);

-- ============================================================================
-- WALLETS & LEDGER
-- ============================================================================

-- Wallets (Multi-currency, multi-owner-type)
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type VARCHAR(50) NOT NULL,
  owner_id UUID NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_type, owner_id, currency_code),
  FOREIGN KEY (currency_code) REFERENCES currencies(currency_code)
);

CREATE INDEX idx_wallets_owner ON wallets(owner_type, owner_id);
CREATE INDEX idx_wallets_currency ON wallets(currency_code);

-- Ledger Entries (IMMUTABLE - write-once)
CREATE TABLE IF NOT EXISTS ledger_entries (
  id BIGSERIAL PRIMARY KEY,
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  transaction_id UUID NOT NULL UNIQUE,
  entry_type VARCHAR(50) NOT NULL,
  debit_kobo BIGINT NOT NULL DEFAULT 0,
  credit_kobo BIGINT NOT NULL DEFAULT 0,
  balance_after_kobo BIGINT NOT NULL,
  counterparty_wallet_id UUID REFERENCES wallets(id),
  reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  operation_timestamp TIMESTAMP DEFAULT NOW()
);

-- Prevent updates/deletes on ledger
CREATE TRIGGER prevent_ledger_updates BEFORE UPDATE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

CREATE TRIGGER prevent_ledger_deletes BEFORE DELETE ON ledger_entries
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

CREATE INDEX idx_ledger_wallet ON ledger_entries(wallet_id);
CREATE INDEX idx_ledger_txn_id ON ledger_entries(transaction_id);
CREATE INDEX idx_ledger_created ON ledger_entries(wallet_id, created_at DESC);

-- Cached Wallet Balances (DERIVED)
CREATE TABLE IF NOT EXISTS wallet_balances (
  wallet_id UUID PRIMARY KEY REFERENCES wallets(id),
  currency_code VARCHAR(3),
  available_balance_kobo BIGINT DEFAULT 0,
  pending_balance_kobo BIGINT DEFAULT 0,
  locked_balance_kobo BIGINT DEFAULT 0,
  total_balance_kobo BIGINT DEFAULT 0,
  last_ledger_entry_id BIGINT REFERENCES ledger_entries(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Trigger to recalculate wallet balances
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

-- ============================================================================
-- GROUPS & CONTRIBUTIONS
-- ============================================================================

-- Savings Groups
CREATE TABLE IF NOT EXISTS savings_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users_v2(id),
  wallet_id UUID NOT NULL UNIQUE REFERENCES wallets(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  group_type VARCHAR(50) NOT NULL,
  payout_model VARCHAR(50) NOT NULL,
  contribution_frequency VARCHAR(50),
  contribution_amount_kobo BIGINT NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  max_members INT DEFAULT 50,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  auto_payout BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (currency_code) REFERENCES currencies(currency_code)
);

CREATE INDEX idx_groups_creator ON savings_groups(creator_id);
CREATE INDEX idx_groups_status ON savings_groups(status);
CREATE INDEX idx_groups_type ON savings_groups(group_type);

-- Group Members
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  user_id UUID NOT NULL REFERENCES users_v2(id),
  role VARCHAR(50) DEFAULT 'MEMBER',
  status VARCHAR(50) DEFAULT 'ACTIVE',
  joined_at TIMESTAMP DEFAULT NOW(),
  contribution_count INT DEFAULT 0,
  total_contributed_kobo BIGINT DEFAULT 0,
  total_received_kobo BIGINT DEFAULT 0,
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_status ON group_members(status);

-- Contributions
CREATE TABLE IF NOT EXISTS contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  member_id UUID NOT NULL REFERENCES users_v2(id),
  amount_kobo BIGINT NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  contribution_cycle INT,
  transaction_id UUID UNIQUE,
  status VARCHAR(50) DEFAULT 'COMPLETED',
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (currency_code) REFERENCES currencies(currency_code)
);

CREATE INDEX idx_contributions_group ON contributions(group_id);
CREATE INDEX idx_contributions_member ON contributions(member_id);

-- Group Payouts (Rotation schedule)
CREATE TABLE IF NOT EXISTS group_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  recipient_member_id UUID NOT NULL REFERENCES users_v2(id),
  payout_position INT,
  scheduled_date DATE,
  payout_amount_kobo BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  approved_by_admin_id UUID REFERENCES users_v2(id),
  approved_at TIMESTAMP,
  paid_at TIMESTAMP,
  transaction_id UUID,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payouts_group ON group_payouts(group_id);
CREATE INDEX idx_payouts_status ON group_payouts(status);

-- Group Milestones (For MILESTONE_RELEASE payout model)
CREATE TABLE IF NOT EXISTS group_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount_kobo BIGINT NOT NULL,
  current_amount_kobo BIGINT DEFAULT 0,
  unlock_condition VARCHAR(100),
  unlock_date DATE,
  reached_at TIMESTAMP,
  payout_triggered_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Group Voting (For VOTING_RELEASE payout model)
CREATE TABLE IF NOT EXISTS group_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  proposed_by_member_id UUID NOT NULL REFERENCES users_v2(id),
  payout_recipient_member_id UUID NOT NULL REFERENCES users_v2(id),
  payout_amount_kobo BIGINT NOT NULL,
  proposal_title VARCHAR(255),
  proposal_description TEXT,
  voting_period_starts_at TIMESTAMP DEFAULT NOW(),
  voting_period_ends_at TIMESTAMP,
  required_majority VARCHAR(50),
  votes_for INT DEFAULT 0,
  votes_against INT DEFAULT 0,
  votes_abstain INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Individual Votes
CREATE TABLE IF NOT EXISTS individual_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vote_proposal_id UUID NOT NULL REFERENCES group_votes(id),
  voter_member_id UUID NOT NULL REFERENCES users_v2(id),
  vote VARCHAR(20),
  voted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(vote_proposal_id, voter_member_id)
);

-- ============================================================================
-- TRANSACTIONS & PAYOUTS
-- ============================================================================

-- Transactions (All financial movements)
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users_v2(id),
  transaction_type VARCHAR(50) NOT NULL,
  amount_kobo BIGINT NOT NULL,
  currency_code VARCHAR(3) NOT NULL,
  status VARCHAR(50) DEFAULT 'INITIATED',
  payment_provider VARCHAR(50),
  provider_reference VARCHAR(255),
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

-- Payout Requests
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL REFERENCES users_v2(id),
  group_id UUID NOT NULL REFERENCES savings_groups(id),
  recipient_user_id UUID NOT NULL REFERENCES users_v2(id),
  amount_kobo BIGINT NOT NULL,
  reason TEXT,
  approval_chain VARCHAR(100),
  approver_user_id UUID REFERENCES users_v2(id),
  status VARCHAR(50) DEFAULT 'SUBMITTED',
  submitted_at TIMESTAMP DEFAULT NOW(),
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  rejection_reason TEXT,
  transaction_id UUID REFERENCES transactions(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payout_req_requester ON payout_requests(requester_user_id);
CREATE INDEX idx_payout_req_approver ON payout_requests(approver_user_id);
CREATE INDEX idx_payout_req_status ON payout_requests(status);
CREATE INDEX idx_payout_req_group ON payout_requests(group_id);

-- Payout Approvals
CREATE TABLE IF NOT EXISTS payout_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_request_id UUID NOT NULL REFERENCES payout_requests(id),
  approver_user_id UUID NOT NULL REFERENCES users_v2(id),
  approval_role VARCHAR(50),
  approval_status VARCHAR(50) DEFAULT 'PENDING',
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  digital_signature BYTEA,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(payout_request_id, approver_user_id)
);

-- Transaction Settlement
CREATE TABLE IF NOT EXISTS transaction_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  settlement_batch_id UUID,
  provider_settlement_id VARCHAR(255),
  settlement_amount_kobo BIGINT,
  settlement_date DATE,
  settlement_status VARCHAR(50),
  settled_at TIMESTAMP,
  provider_fee_kobo BIGINT,
  net_amount_kobo BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Settlement Batches
CREATE TABLE IF NOT EXISTS settlement_batches (
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
  status VARCHAR(50) DEFAULT 'PENDING',
  provider_batch_id VARCHAR(255),
  submitted_at TIMESTAMP,
  confirmed_at TIMESTAMP,
  settled_at TIMESTAMP,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(batch_date, region, payment_provider, currency_code)
);

-- ============================================================================
-- DISPUTES & REFUNDS
-- ============================================================================

-- Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id),
  reporter_user_id UUID NOT NULL REFERENCES users_v2(id),
  dispute_reason VARCHAR(100),
  description TEXT,
  evidence_paths TEXT[],
  status VARCHAR(50) DEFAULT 'OPEN',
  resolution TEXT,
  resolved_by_admin_id UUID REFERENCES users_v2(id),
  resolved_at TIMESTAMP,
  refund_initiated BOOLEAN DEFAULT false,
  refund_amount_kobo BIGINT,
  refund_transaction_id UUID REFERENCES transactions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disputes_reporter ON disputes(reporter_user_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================================================
-- AUDIT LOGGING (IMMUTABLE)
-- ============================================================================

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES users_v2(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id UUID,
  description TEXT,
  changes JSONB,
  status VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  request_id UUID
);

-- Prevent updates/deletes on audit logs
CREATE TRIGGER prevent_audit_updates BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

CREATE TRIGGER prevent_audit_deletes BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);

-- PII Access Logs
CREATE TABLE IF NOT EXISTS pii_access_logs (
  id BIGSERIAL PRIMARY KEY,
  accessor_user_id UUID REFERENCES users_v2(id),
  subject_user_id UUID REFERENCES users_v2(id),
  pii_field VARCHAR(100),
  accessed_at TIMESTAMP DEFAULT NOW(),
  access_reason VARCHAR(255),
  granted_by_user_id UUID REFERENCES users_v2(id)
);

-- Prevent updates/deletes on PII logs
CREATE TRIGGER prevent_pii_updates BEFORE UPDATE ON pii_access_logs
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

CREATE TRIGGER prevent_pii_deletes BEFORE DELETE ON pii_access_logs
FOR EACH ROW EXECUTE FUNCTION raise_immutable_error();

-- ============================================================================
-- NOTIFICATIONS & QUEUES
-- ============================================================================

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users_v2(id),
  notification_type VARCHAR(100),
  title VARCHAR(255),
  body TEXT,
  action_url VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  sent_via VARCHAR(100),
  sent_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- Email Queue
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255),
  template_id VARCHAR(100),
  template_variables JSONB,
  status VARCHAR(50) DEFAULT 'QUEUED',
  retry_count INT DEFAULT 0,
  sent_at TIMESTAMP,
  failed_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_queue_status ON email_queue(status);
CREATE INDEX idx_email_queue_created ON email_queue(created_at);

-- SMS Queue
CREATE TABLE IF NOT EXISTS sms_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone VARCHAR(20),
  message_body TEXT,
  status VARCHAR(50) DEFAULT 'QUEUED',
  retry_count INT DEFAULT 0,
  sent_at TIMESTAMP,
  provider VARCHAR(50),
  provider_message_id VARCHAR(255),
  failed_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sms_queue_status ON sms_queue(status);
CREATE INDEX idx_sms_queue_created ON sms_queue(created_at);

-- ============================================================================
-- HELPER FUNCTIONS (for queries)
-- ============================================================================

-- Calculate wallet balance safely
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

-- Check for sufficient balance
CREATE OR REPLACE FUNCTION check_sufficient_balance(
  p_wallet_id UUID,
  p_amount_kobo BIGINT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_balance BIGINT;
BEGIN
  SELECT available_balance_kobo INTO v_balance
  FROM wallet_balances
  WHERE wallet_id = p_wallet_id;
  
  RETURN COALESCE(v_balance, 0) >= p_amount_kobo;
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

-- ============================================================================
-- INITIAL DATA (Bootstrap countries and currencies)
-- ============================================================================

INSERT INTO countries (country_code, country_name, primary_currency_code, region, timezone, 
                       supported_payment_providers, kyc_requirements, regulatory_framework,
                       max_daily_transaction_limit, max_single_transaction_limit, reporting_requirements, enabled)
VALUES 
  ('NG', 'Nigeria', 'NGN', 'WEST_AFRICA', 'Africa/Lagos',
   ARRAY['paystack', 'flutterwave', 'stripe'],
   '{"document_types": ["BVN", "NIN", "PASSPORT"]}'::jsonb, 'CBN',
   50000000, 5000000, '{"aml_threshold": 1000000}'::jsonb, true),
  ('GH', 'Ghana', 'GHS', 'WEST_AFRICA', 'Africa/Accra',
   ARRAY['flutterwave', 'stripe'],
   '{"document_types": ["NATIONAL_ID", "PASSPORT"]}'::jsonb, 'BOG',
   10000000, 1000000, '{"aml_threshold": 500000}'::jsonb, true),
  ('KE', 'Kenya', 'KES', 'EAST_AFRICA', 'Africa/Nairobi',
   ARRAY['mpesa', 'flutterwave', 'stripe'],
   '{"document_types": ["NATIONAL_ID", "PASSPORT"]}'::jsonb, 'CBK',
   50000000, 5000000, '{"aml_threshold": 1000000}'::jsonb, true),
  ('GB', 'United Kingdom', 'GBP', 'DIASPORA', 'Europe/London',
   ARRAY['stripe', 'wise', 'paypal'],
   '{"document_types": ["PASSPORT", "DRIVER_LICENSE"]}'::jsonb, 'FCA',
   5000000000, 500000000, '{"aml_threshold": 50000000}'::jsonb, true),
  ('US', 'United States', 'USD', 'DIASPORA', 'America/New_York',
   ARRAY['stripe', 'wise', 'ach'],
   '{"document_types": ["PASSPORT", "SSN"]}'::jsonb, 'FinCEN',
   10000000000, 1000000000, '{"aml_threshold": 100000000, "sar_required": true}'::jsonb, true)
ON CONFLICT (country_code) DO NOTHING;

INSERT INTO currencies (currency_code, currency_name, symbol, decimal_places, is_fiat, exchange_rate_to_usd, last_rate_update, enabled)
VALUES 
  ('NGN', 'Nigerian Naira', '₦', 2, true, 0.00137000, NOW(), true),
  ('GHS', 'Ghanaian Cedi', '₵', 2, true, 0.08500000, NOW(), true),
  ('KES', 'Kenyan Shilling', 'Sh', 2, true, 0.00775000, NOW(), true),
  ('GBP', 'British Pound', '£', 2, true, 1.27000000, NOW(), true),
  ('USD', 'US Dollar', '$', 2, true, 1.00000000, NOW(), true),
  ('EUR', 'Euro', '€', 2, true, 1.10000000, NOW(), true)
ON CONFLICT (currency_code) DO NOTHING;

COMMIT;
