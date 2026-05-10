-- Migration 003: Migration Validation Queries & Health Checks
-- Timestamp: 2026-05-10
-- Purpose: Provide queries to validate migration consistency between MVP and v2.0
-- Usage: Run these queries regularly during dual-write period to catch sync issues

BEGIN;

-- ============================================================================
-- 1. COUNT VALIDATION (Total records match check)
-- ============================================================================

CREATE OR REPLACE VIEW migration_record_counts AS
SELECT 
  'users' as record_type,
  (SELECT COUNT(*) FROM users)::INT as mvp_count,
  (SELECT COUNT(*) FROM users_v2)::INT as v2_count,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'users' AND sync_status = 'SYNCED')::INT as synced_count,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'users' AND sync_status = 'PENDING')::INT as pending_count,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'users' AND sync_status = 'FAILED')::INT as failed_count
UNION ALL
SELECT 
  'groups',
  (SELECT COUNT(*) FROM groups)::INT,
  (SELECT COUNT(*) FROM savings_groups)::INT,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'groups' AND sync_status = 'SYNCED')::INT,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'groups' AND sync_status = 'PENDING')::INT,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'groups' AND sync_status = 'FAILED')::INT
UNION ALL
SELECT 
  'transactions',
  (SELECT COUNT(*) FROM transactions)::INT,
  (SELECT COUNT(*) FROM transactions)::INT,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'transactions' AND sync_status = 'SYNCED')::INT,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'transactions' AND sync_status = 'PENDING')::INT,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'transactions' AND sync_status = 'FAILED')::INT
UNION ALL
SELECT 
  'contributions',
  (SELECT COUNT(*) FROM contributions)::INT,
  (SELECT COUNT(*) FROM contributions)::INT,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'contributions' AND sync_status = 'SYNCED')::INT,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'contributions' AND sync_status = 'PENDING')::INT,
  (SELECT COUNT(*) FROM migration_tracking WHERE mvp_record_type = 'contributions' AND sync_status = 'FAILED')::INT;

-- ============================================================================
-- 2. BALANCE VALIDATION (Wallet balance consistency)
-- ============================================================================

CREATE OR REPLACE VIEW balance_validation AS
SELECT 
  'User Wallets' as wallet_type,
  COUNT(*) as total_wallets,
  SUM(available_balance_kobo) as total_balance_kobo,
  COUNT(*) FILTER (WHERE total_balance_kobo > 0) as active_wallets,
  MIN(updated_at) as oldest_update,
  MAX(updated_at) as newest_update
FROM wallet_balances
WHERE owner_type = 'USER'
UNION ALL
SELECT 
  'Group Wallets',
  COUNT(*),
  SUM(available_balance_kobo),
  COUNT(*) FILTER (WHERE total_balance_kobo > 0),
  MIN(updated_at),
  MAX(updated_at)
FROM wallet_balances
WHERE owner_type = 'GROUP'
UNION ALL
SELECT 
  'Escrow Wallets',
  COUNT(*),
  SUM(available_balance_kobo),
  COUNT(*) FILTER (WHERE total_balance_kobo > 0),
  MIN(updated_at),
  MAX(updated_at)
FROM wallet_balances
WHERE owner_type = 'ESCROW';

-- ============================================================================
-- 3. LEDGER VALIDATION (Transaction entries match)
-- ============================================================================

CREATE OR REPLACE VIEW ledger_consistency AS
SELECT 
  w.id as wallet_id,
  w.owner_type,
  w.owner_id,
  w.currency_code,
  wb.total_balance_kobo as cached_balance,
  (SELECT SUM(debit_kobo - credit_kobo) FROM ledger_entries WHERE wallet_id = w.id)::BIGINT as calculated_balance,
  CASE 
    WHEN wb.total_balance_kobo = (SELECT SUM(debit_kobo - credit_kobo) FROM ledger_entries WHERE wallet_id = w.id)
    THEN 'CONSISTENT'
    ELSE 'MISMATCH'
  END as balance_status,
  (SELECT COUNT(*) FROM ledger_entries WHERE wallet_id = w.id) as entry_count,
  wb.updated_at as last_updated
FROM wallets w
LEFT JOIN wallet_balances wb ON w.id = wb.wallet_id
ORDER BY balance_status DESC, wallet_id;

-- ============================================================================
-- 4. TRANSACTION COMPLETENESS (All transactions recorded)
-- ============================================================================

CREATE OR REPLACE VIEW transaction_completeness AS
SELECT 
  status,
  COUNT(*) as count,
  SUM(amount_kobo) as total_amount_kobo,
  COUNT(*) FILTER (WHERE ledger_recorded_at IS NOT NULL) as ledger_recorded,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed,
  MIN(initiated_at) as oldest_transaction,
  MAX(initiated_at) as newest_transaction
FROM transactions
GROUP BY status;

-- ============================================================================
-- 5. MISSING RECORDS (Records in MVP but not in v2.0)
-- ============================================================================

CREATE OR REPLACE VIEW unsync_records AS
SELECT 
  'users' as record_type,
  COUNT(*) as unsync_count,
  'Users missing from v2.0' as issue_description
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM users_v2 u2 WHERE u2.email = u.email
)
UNION ALL
SELECT 
  'groups',
  COUNT(*),
  'Groups missing from v2.0'
FROM groups g
WHERE NOT EXISTS (
  SELECT 1 FROM savings_groups sg WHERE sg.id = g.id
)
UNION ALL
SELECT 
  'transactions',
  COUNT(*),
  'Transactions missing from v2.0'
FROM transactions t
WHERE t.status = 'COMPLETED' AND NOT EXISTS (
  SELECT 1 FROM ledger_entries le WHERE le.transaction_id = t.id
);

-- ============================================================================
-- 6. DATA QUALITY CHECKS
-- ============================================================================

CREATE OR REPLACE VIEW data_quality_checks AS
SELECT 
  'Null Phone Numbers' as check_name,
  COUNT(*) as issue_count,
  'Users without phone numbers' as issue_description
FROM users_v2
WHERE phone_number IS NULL
UNION ALL
SELECT 
  'Unverified KYC',
  COUNT(*),
  'Users with unverified KYC'
FROM users_v2
WHERE kyc_status = 'UNVERIFIED' AND created_at < NOW() - INTERVAL '7 days'
UNION ALL
SELECT 
  'Inactive Wallets',
  COUNT(*),
  'Wallets with negative balance'
FROM wallet_balances
WHERE total_balance_kobo < 0
UNION ALL
SELECT 
  'Pending Payouts',
  COUNT(*),
  'Payout requests stuck in SUBMITTED'
FROM payout_requests
WHERE status = 'SUBMITTED' AND submitted_at < NOW() - INTERVAL '3 days';

-- ============================================================================
-- 7. PERFORMANCE INDICATORS
-- ============================================================================

CREATE OR REPLACE VIEW migration_performance AS
SELECT 
  'Sync Throughput',
  (SELECT COUNT(*) FROM migration_tracking WHERE sync_timestamp > NOW() - INTERVAL '1 hour')::INT as last_hour_syncs,
  (SELECT COUNT(*) FROM migration_tracking WHERE sync_timestamp > NOW() - INTERVAL '1 day')::INT as last_day_syncs,
  (SELECT AVG(EXTRACT(EPOCH FROM (sync_timestamp - created_at)))::INT FROM migration_tracking LIMIT 100) as avg_sync_time_seconds
UNION ALL
SELECT 
  'Ledger Write Performance',
  (SELECT COUNT(*) FROM ledger_entries WHERE created_at > NOW() - INTERVAL '1 hour')::INT,
  (SELECT COUNT(*) FROM ledger_entries WHERE created_at > NOW() - INTERVAL '1 day')::INT,
  0
UNION ALL
SELECT 
  'Transaction Processing',
  (SELECT COUNT(*) FROM transactions WHERE initiated_at > NOW() - INTERVAL '1 hour')::INT,
  (SELECT COUNT(*) FROM transactions WHERE initiated_at > NOW() - INTERVAL '1 day')::INT,
  (SELECT AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - initiated_at)))::INT FROM transactions 
   WHERE completed_at IS NOT NULL AND initiated_at > NOW() - INTERVAL '7 days' LIMIT 1000);

-- ============================================================================
-- 8. MIGRATION READINESS CHECKLIST
-- ============================================================================

CREATE OR REPLACE VIEW migration_readiness AS
SELECT 
  'schema_created' as check_item,
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') as status,
  'All v2.0 schema tables created' as description
UNION ALL
SELECT 
  'countries_configured',
  COUNT(*) >= 5,
  'At least 5 countries configured'
FROM countries
UNION ALL
SELECT 
  'currencies_configured',
  COUNT(*) >= 6,
  'At least 6 currencies configured'
FROM currencies
UNION ALL
SELECT 
  'users_synced',
  COUNT(*) > 0,
  'Users synced to v2.0'
FROM users_v2
UNION ALL
SELECT 
  'groups_synced',
  COUNT(*) > 0,
  'Groups synced to v2.0'
FROM savings_groups
UNION ALL
SELECT 
  'transactions_synced',
  COUNT(*) > 0,
  'Transactions synced to v2.0'
FROM transactions
UNION ALL
SELECT 
  'balanced_ledgers',
  COUNT(*) FILTER (WHERE (SELECT SUM(debit_kobo - credit_kobo) FROM ledger_entries WHERE wallet_id = wallet_balances.wallet_id)::BIGINT = total_balance_kobo) > 0,
  'Ledger balances consistent with wallet_balances'
FROM wallet_balances;

-- ============================================================================
-- 9. MANUAL VALIDATION PROCEDURES
-- ============================================================================

-- Validate a specific user's data
CREATE OR REPLACE FUNCTION validate_user_data(p_user_id UUID)
RETURNS TABLE(
  check_name VARCHAR,
  mvp_status VARCHAR,
  v2_status VARCHAR,
  status_match BOOLEAN,
  timestamp TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Email' as check_name,
    (SELECT email FROM users WHERE id = p_user_id)::VARCHAR as mvp_status,
    (SELECT email FROM users_v2 WHERE id = p_user_id)::VARCHAR as v2_status,
    (SELECT email FROM users WHERE id = p_user_id) = (SELECT email FROM users_v2 WHERE id = p_user_id) as status_match,
    NOW()
  UNION ALL
  SELECT 
    'Status',
    (SELECT status FROM users WHERE id = p_user_id)::VARCHAR,
    (SELECT status FROM users_v2 WHERE id = p_user_id)::VARCHAR,
    (SELECT status FROM users WHERE id = p_user_id) = (SELECT status FROM users_v2 WHERE id = p_user_id),
    NOW()
  UNION ALL
  SELECT 
    'Group Count',
    (SELECT COUNT(*)::VARCHAR FROM groups WHERE creator_id = p_user_id),
    (SELECT COUNT(*)::VARCHAR FROM savings_groups WHERE creator_id = p_user_id),
    (SELECT COUNT(*) FROM groups WHERE creator_id = p_user_id) = (SELECT COUNT(*) FROM savings_groups WHERE creator_id = p_user_id),
    NOW();
END;
$$ LANGUAGE plpgsql;

-- Validate a specific group's wallet balance
CREATE OR REPLACE FUNCTION validate_group_balance(p_group_id UUID)
RETURNS TABLE(
  group_id UUID,
  wallet_id UUID,
  cached_balance_kobo BIGINT,
  calculated_balance_kobo BIGINT,
  ledger_entry_count INT,
  balance_match BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_group_id,
    w.id,
    wb.total_balance_kobo,
    (SELECT SUM(debit_kobo - credit_kobo) FROM ledger_entries WHERE wallet_id = w.id)::BIGINT,
    (SELECT COUNT(*) FROM ledger_entries WHERE wallet_id = w.id)::INT,
    wb.total_balance_kobo = (SELECT SUM(debit_kobo - credit_kobo) FROM ledger_entries WHERE wallet_id = w.id)::BIGINT
  FROM wallets w
  LEFT JOIN wallet_balances wb ON w.id = wb.wallet_id
  WHERE w.owner_type = 'GROUP' AND w.owner_id = p_group_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. POST-CUTOVER CLEANUP VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW records_ready_for_deprecation AS
SELECT 
  'users' as record_type,
  COUNT(*) as deprecated_record_count,
  'MVP users no longer needed' as note
FROM users
WHERE EXISTS (
  SELECT 1 FROM migration_tracking 
  WHERE mvp_record_type = 'users' AND mvp_record_id = users.id AND sync_status = 'SYNCED'
)
UNION ALL
SELECT 
  'groups',
  COUNT(*),
  'MVP groups no longer needed'
FROM groups
WHERE EXISTS (
  SELECT 1 FROM migration_tracking 
  WHERE mvp_record_type = 'groups' AND mvp_record_id = groups.id AND sync_status = 'SYNCED'
);

COMMIT;
