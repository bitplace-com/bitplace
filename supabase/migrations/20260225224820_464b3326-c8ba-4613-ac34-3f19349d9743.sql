CREATE POLICY "Users publicly readable"
ON public.users FOR SELECT USING (true);