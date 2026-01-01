-- Re-enable RLS on users table with NO policies
-- This blocks ALL direct client access to users table
-- Clients MUST use public views: public_user_profiles, public_pixel_owner_info
-- Edge Functions with service role key bypass RLS automatically

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies = blocked for all client roles
-- Service role (used by Edge Functions) bypasses RLS