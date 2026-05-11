ALTER TABLE bank_accounts
  ADD COLUMN IF NOT EXISTS country_code text NOT NULL DEFAULT 'NG',
  ADD COLUMN IF NOT EXISTS currency_code text NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS payout_method_type text NOT NULL DEFAULT 'BANK_ACCOUNT',
  ADD COLUMN IF NOT EXISTS provider_name text,
  ADD COLUMN IF NOT EXISTS provider_recipient_id text,
  ADD COLUMN IF NOT EXISTS provider_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE bank_accounts
SET provider_recipient_id = COALESCE(provider_recipient_id, paystack_recipient_code),
    provider_name = COALESCE(provider_name, CASE WHEN paystack_recipient_code IS NOT NULL THEN 'paystack' ELSE provider_name END),
    country_code = COALESCE(NULLIF(country_code, ''), 'NG'),
    currency_code = COALESCE(NULLIF(currency_code, ''), 'NGN'),
    payout_method_type = COALESCE(NULLIF(payout_method_type, ''), 'BANK_ACCOUNT')
WHERE provider_recipient_id IS NULL
   OR provider_name IS NULL
   OR country_code IS NULL
   OR currency_code IS NULL
   OR payout_method_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_bank_accounts_country_method ON bank_accounts(country_code, payout_method_type);
