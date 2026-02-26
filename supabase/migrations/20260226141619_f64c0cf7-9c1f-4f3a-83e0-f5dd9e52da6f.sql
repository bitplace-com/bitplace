
-- Add last_balance_verified_at to users table
-- This tracks the last time a user's wallet balance was successfully verified via Solana RPC
-- Distinct from last_energy_sync_at which is used for rate limiting
ALTER TABLE public.users
ADD COLUMN last_balance_verified_at timestamp with time zone DEFAULT NULL;

-- Initialize for existing wallet users: set to last_energy_sync_at if they have one
UPDATE public.users
SET last_balance_verified_at = last_energy_sync_at
WHERE auth_provider IN ('wallet', 'both')
AND last_energy_sync_at IS NOT NULL;
