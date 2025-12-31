-- Add energy-related columns to users table for SOL-based PE calculation
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS energy_asset text DEFAULT 'SOL',
ADD COLUMN IF NOT EXISTS native_symbol text DEFAULT 'SOL',
ADD COLUMN IF NOT EXISTS native_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS usd_price numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS wallet_usd numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_energy_sync_at timestamptz;

-- Reset pe_total_pe default to 0 for new users (will be computed from SOL balance)
ALTER TABLE users ALTER COLUMN pe_total_pe SET DEFAULT 0;