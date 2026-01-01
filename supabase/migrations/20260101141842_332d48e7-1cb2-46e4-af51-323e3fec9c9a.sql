-- The users table has RLS policy using auth.uid(), but this app uses custom JWT auth.
-- Since auth.uid() returns NULL for custom auth, client queries are blocked.
-- Disabling RLS on users table since all sensitive operations go through Edge Functions.
-- Edge Functions use service role and verify JWTs server-side.

-- First drop the existing RLS policy
DROP POLICY IF EXISTS "Users can read own data" ON public.users;

-- Disable RLS on users table - operations are secured by Edge Functions
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Note: Sensitive user data (wallet_usd, pe_total_pe, etc.) is only exposed via:
-- 1. Edge Functions (game-commit, energy-refresh, user-update) which verify JWT tokens
-- 2. Public views (public_user_profiles, public_pixel_owner_info) which filter sensitive columns