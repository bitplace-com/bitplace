-- Add rebalance tracking columns to users table
ALTER TABLE public.users 
  ADD COLUMN owner_health_multiplier numeric NOT NULL DEFAULT 1,
  ADD COLUMN rebalance_active boolean NOT NULL DEFAULT false,
  ADD COLUMN rebalance_started_at timestamptz,
  ADD COLUMN rebalance_ends_at timestamptz,
  ADD COLUMN rebalance_target_multiplier numeric;

-- Add constraint to ensure multiplier is between 0 and 1
ALTER TABLE public.users 
  ADD CONSTRAINT users_health_multiplier_range 
  CHECK (owner_health_multiplier >= 0 AND owner_health_multiplier <= 1);