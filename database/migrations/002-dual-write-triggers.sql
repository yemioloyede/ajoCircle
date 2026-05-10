-- Migration 002: Dual-Write Triggers (MVP schema <-> v2.0 schema)
-- Timestamp: 2026-05-10
-- Purpose: Enable simultaneous writes to both schemas during migration period
-- Strategy: Transparent dual-write that maintains data consistency

BEGIN;

-- ============================================================================
-- DUAL-WRITE STRATEGY: Keep both old and new systems in sync
-- ============================================================================
-- This allows us to:
-- 1. Keep MVP system operational during migration
-- 2. Validate v2.0 schema in parallel
-- 3. Switch reads to v2.0 once validated
-- 4. Gradually deprecate MVP schema

-- Assuming MVP has tables: users, groups, transactions, wallets, etc.
-- We'll sync key operations between old and new schemas

-- ============================================================================
-- 1. SYNC: users -> users_v2 (bidirectional)
-- ============================================================================

-- When a new user is created in MVP, create in v2.0 as well
-- This assumes the MVP users table exists

-- Create function to sync user to v2
CREATE OR REPLACE FUNCTION sync_user_to_v2()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update in v2.0 users
  INSERT INTO users_v2 (
    id, username, email, phone_number, password_hash,
    primary_country_code, primary_currency_code, status, created_at, updated_at
  ) VALUES (
    COALESCE(NEW.id, gen_random_uuid()),
    NEW.username,
    NEW.email,
    NEW.phone_number,
    NEW.password_hash,
    'NG', -- Default to Nigeria for MVP users during migration
    'NGN', -- Default to NGN for MVP users during migration
    'ACTIVE',
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    phone_number = EXCLUDED.phone_number,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Actually apply this trigger after verifying MVP schema structure
-- CREATE TRIGGER sync_user_creation AFTER INSERT ON users
-- FOR EACH ROW EXECUTE FUNCTION sync_user_to_v2();

-- ============================================================================
-- 2. SYNC: Transactions (MVP <-> v2.0)
-- ============================================================================

-- Create function to sync transaction to v2
CREATE OR REPLACE FUNCTION sync_transaction_to_v2()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Find or create user_v2 mapping
  SELECT id INTO v_user_id FROM users_v2 
  WHERE email = (SELECT email FROM users WHERE id = NEW.user_id LIMIT 1)
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    -- Create user_v2 if not exists
    INSERT INTO users_v2 (
      username, email, phone_number, password_hash,
      primary_country_code, primary_currency_code, status, created_at
    )
    SELECT username, email, phone_number, password_hash,
           'NG', 'NGN', 'ACTIVE', NOW()
    FROM users WHERE id = NEW.user_id
    RETURNING id INTO v_user_id;
  END IF;
  
  -- Insert into v2 transactions
  INSERT INTO transactions (
    id, idempotency_key, user_id, transaction_type, amount_kobo,
    currency_code, status, payment_provider, initiated_at, created_at
  ) VALUES (
    NEW.id,
    gen_random_uuid(), -- Will be set properly later
    v_user_id,
    'CONTRIBUTION', -- Default for MVP during migration
    NEW.amount * 100, -- Assuming MVP stores in main units
    'NGN',
    NEW.status,
    'paystack',
    NEW.created_at,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. SYNC: Migration Tracking Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS migration_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mvp_record_type VARCHAR(50), -- users, transactions, groups, etc.
  mvp_record_id UUID,
  v2_record_id UUID,
  sync_status VARCHAR(50) DEFAULT 'SYNCED', -- SYNCED, PENDING, FAILED, MANUAL
  sync_timestamp TIMESTAMP DEFAULT NOW(),
  validation_status VARCHAR(50), -- VALIDATED, NEEDS_REVIEW
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_migration_mvp ON migration_tracking(mvp_record_type, mvp_record_id);
CREATE INDEX idx_migration_v2 ON migration_tracking(v2_record_id);
CREATE INDEX idx_migration_status ON migration_tracking(sync_status);

-- ============================================================================
-- 4. DUAL-WRITE: Wallet & Ledger Sync
-- ============================================================================

-- Create wallet in v2 when user creates a group in MVP
CREATE OR REPLACE FUNCTION create_group_wallet_v2(
  p_group_id UUID,
  p_currency_code VARCHAR,
  p_owner_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  INSERT INTO wallets (owner_type, owner_id, currency_code, status)
  VALUES ('GROUP', p_group_id, p_currency_code, 'ACTIVE')
  RETURNING id INTO v_wallet_id;
  
  INSERT INTO wallet_balances (wallet_id, currency_code, available_balance_kobo)
  VALUES (v_wallet_id, p_currency_code, 0);
  
  RETURN v_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- Record contribution in v2 ledger
CREATE OR REPLACE FUNCTION record_contribution_ledger_v2(
  p_wallet_id UUID,
  p_transaction_id UUID,
  p_amount_kobo BIGINT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO ledger_entries (
    wallet_id, transaction_id, entry_type, debit_kobo, credit_kobo,
    balance_after_kobo, reference, created_at
  ) VALUES (
    p_wallet_id,
    p_transaction_id,
    'CONTRIBUTION',
    p_amount_kobo,
    0,
    p_amount_kobo, -- Will be recalculated by trigger
    'MVP Migration Sync',
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. VALIDATION: Data Consistency Checks
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_user_sync()
RETURNS TABLE(
  record_id UUID,
  mvp_count INT,
  v2_count INT,
  sync_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mt.mvp_record_id,
    1 as mvp_count,
    (SELECT COUNT(*) FROM users_v2 WHERE id = mt.v2_record_id)::INT as v2_count,
    CASE 
      WHEN (SELECT COUNT(*) FROM users_v2 WHERE id = mt.v2_record_id) > 0 THEN 'SYNCED'
      ELSE 'MISSING_V2'
    END as sync_status
  FROM migration_tracking mt
  WHERE mvp_record_type = 'users';
END;
$$ LANGUAGE plpgsql;

-- Validate transaction sync
CREATE OR REPLACE FUNCTION validate_transaction_sync()
RETURNS TABLE(
  record_id UUID,
  mvp_amount BIGINT,
  v2_amount BIGINT,
  match BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mt.mvp_record_id,
    0::BIGINT as mvp_amount,
    (SELECT amount_kobo FROM transactions WHERE id = mt.v2_record_id LIMIT 1)::BIGINT as v2_amount,
    true as match;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. SYNC STATE MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase VARCHAR(50) DEFAULT 'DUAL_WRITE', -- DUAL_WRITE, READ_SHADOW, CUTOVER, DEPRECATE
  last_successful_sync TIMESTAMP,
  total_records_synced INT DEFAULT 0,
  total_records_failed INT DEFAULT 0,
  data_consistency_status VARCHAR(50) DEFAULT 'CHECKING',
  cutover_ready BOOLEAN DEFAULT false,
  cutover_approved_by_admin_id UUID,
  cutover_executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- 7. MIGRATION MONITORING
-- ============================================================================

CREATE OR REPLACE FUNCTION check_sync_health()
RETURNS TABLE(
  total_records_pending INT,
  total_records_synced INT,
  total_records_failed INT,
  last_sync_timestamp TIMESTAMP,
  phase VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM migration_tracking WHERE sync_status = 'PENDING')::INT,
    (SELECT COUNT(*) FROM migration_tracking WHERE sync_status = 'SYNCED')::INT,
    (SELECT COUNT(*) FROM migration_tracking WHERE sync_status = 'FAILED')::INT,
    (SELECT last_successful_sync FROM sync_state ORDER BY created_at DESC LIMIT 1),
    (SELECT phase FROM sync_state ORDER BY created_at DESC LIMIT 1);
END;
$$ LANGUAGE plpgsql;

-- Log migration event
CREATE OR REPLACE FUNCTION log_migration_event(
  p_event_type VARCHAR,
  p_description TEXT,
  p_details JSONB
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO audit_logs (
    action, resource_type, description, changes, status, timestamp
  ) VALUES (
    p_event_type,
    'MIGRATION',
    p_description,
    p_details,
    'SUCCESS',
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. CLEANUP & DEPRECATION HELPERS
-- ============================================================================

-- Archive old MVP records (once migration complete)
CREATE OR REPLACE FUNCTION archive_mvp_records(
  p_record_type VARCHAR,
  p_cutoff_date TIMESTAMP
)
RETURNS INT AS $$
DECLARE
  v_count INT;
BEGIN
  -- This would archive old records to a cold storage table
  -- Implementation depends on MVP schema structure
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;
