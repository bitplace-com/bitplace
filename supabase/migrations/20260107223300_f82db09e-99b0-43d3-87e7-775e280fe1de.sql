-- Re-enable Row Level Security on users table
-- This protects sensitive financial data (wallet_address, wallet_usd, native_balance, pe_total_pe)
-- Access to user data is only allowed through:
-- 1. Edge Functions using service role key (bypasses RLS)
-- 2. Public views (public_user_profiles, public_pixel_owner_info) with security_barrier=true
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;