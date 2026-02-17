-- Fix RLS on user_follows: restrict ALL policy to service_role only
DROP POLICY IF EXISTS "Follows managed via service role" ON public.user_follows;
CREATE POLICY "Follows managed via service role"
  ON public.user_follows FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Fix RLS on user_pins: restrict write policies to service_role only
DROP POLICY IF EXISTS "Pins are insertable via service role" ON public.user_pins;
CREATE POLICY "Pins are insertable via service role"
  ON public.user_pins FOR INSERT TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Pins are updatable via service role" ON public.user_pins;
CREATE POLICY "Pins are updatable via service role"
  ON public.user_pins FOR UPDATE TO service_role
  USING (true);

DROP POLICY IF EXISTS "Pins are deletable via service role" ON public.user_pins;
CREATE POLICY "Pins are deletable via service role"
  ON public.user_pins FOR DELETE TO service_role
  USING (true);

-- Keep the SELECT policy for user_pins readable (needed for pins-manage edge function reads)
-- "Pins are readable via service role" remains unchanged