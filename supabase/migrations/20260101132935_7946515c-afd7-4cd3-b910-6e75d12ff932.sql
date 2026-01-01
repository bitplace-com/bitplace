-- Drop the permissive RLS policy that exposes financial data
DROP POLICY IF EXISTS "Allow select for public views" ON public.users;