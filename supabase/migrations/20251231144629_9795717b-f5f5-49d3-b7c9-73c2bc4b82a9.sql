-- Fix views to use SECURITY INVOKER (default, safer)
-- Drop and recreate with explicit SECURITY INVOKER

DROP VIEW IF EXISTS public.public_user_profiles;
DROP VIEW IF EXISTS public.public_pixel_owner_info;
DROP VIEW IF EXISTS public.public_alliances;

-- View for public user profiles (no financial data)
CREATE VIEW public.public_user_profiles 
WITH (security_invoker = on) AS
SELECT 
  id,
  display_name,
  avatar_url,
  country_code,
  alliance_tag,
  level,
  xp
FROM public.users;

-- View for pixel owner info (includes rebalance state for game mechanics)
CREATE VIEW public.public_pixel_owner_info 
WITH (security_invoker = on) AS
SELECT 
  id,
  display_name,
  avatar_url,
  country_code,
  alliance_tag,
  level,
  owner_health_multiplier,
  rebalance_active,
  rebalance_started_at,
  rebalance_ends_at,
  rebalance_target_multiplier
FROM public.users;

-- View for public alliance info (no invite codes)
CREATE VIEW public.public_alliances 
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  tag,
  created_at,
  created_by
FROM public.alliances;

-- Grant SELECT on views
GRANT SELECT ON public.public_user_profiles TO anon, authenticated;
GRANT SELECT ON public.public_pixel_owner_info TO anon, authenticated;
GRANT SELECT ON public.public_alliances TO anon, authenticated;

-- Add minimal RLS policies for tables that now have no policies
-- These tables will be accessed ONLY through views or Edge Functions

-- Users: No direct client access - use views or Edge Functions
-- No policy needed, access blocked by default with RLS enabled

-- Paint events: No direct client access - use Edge Functions only
-- No policy needed, access blocked by default

-- Alliances: No direct client access - use view or Edge Functions
-- No policy needed, access blocked by default

-- Alliance members: No direct client access - use Edge Functions
-- No policy needed, access blocked by default