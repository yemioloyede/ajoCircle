-- Add currency to groups, contributions, payouts
ALTER TABLE savings_groups ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'NGN';
ALTER TABLE contributions ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS currency TEXT;

-- Backfill existing contributions/payouts with group currency (or NGN fallback)
UPDATE contributions SET currency = (
  SELECT currency FROM savings_groups WHERE savings_groups.id = contributions.group_id
) WHERE currency IS NULL;
UPDATE contributions SET currency = 'NGN' WHERE currency IS NULL;

UPDATE payouts SET currency = (
  SELECT currency FROM savings_groups WHERE savings_groups.id = payouts.group_id
) WHERE currency IS NULL;
UPDATE payouts SET currency = 'NGN' WHERE currency IS NULL;

-- Make new columns NOT NULL
ALTER TABLE contributions ALTER COLUMN currency SET NOT NULL;
ALTER TABLE payouts ALTER COLUMN currency SET NOT NULL;
