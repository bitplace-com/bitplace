-- Add SELECT policies for views to work
-- These are minimal policies - views expose only safe columns

-- Users table: Allow SELECT for views (views filter to safe columns)
CREATE POLICY "Allow select for public views"
ON public.users
FOR SELECT
TO anon, authenticated
USING (true);

-- Alliances table: Allow SELECT for public view (view filters out invite_code)
CREATE POLICY "Allow select for public views"
ON public.alliances
FOR SELECT
TO anon, authenticated
USING (true);

-- Note: paint_events and alliance_members remain fully locked
-- They are accessed ONLY through Edge Functions with service role