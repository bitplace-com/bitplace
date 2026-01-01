-- Remove the overly permissive SELECT policy on users table
-- This policy allows anyone to read sensitive financial data (wallet_usd, native_balance, pe_total_pe)
DROP POLICY IF EXISTS "Allow select for public views" ON public.users;

-- Create a more restrictive policy: users can only read their own data
-- Edge Functions using service role are unaffected and can still access all columns
CREATE POLICY "Users can read own data"
ON public.users FOR SELECT
USING (auth.uid()::text = id::text);

-- Note: The public views (public_user_profiles, public_pixel_owner_info) 
-- already filter sensitive columns and should be used by client apps for public data