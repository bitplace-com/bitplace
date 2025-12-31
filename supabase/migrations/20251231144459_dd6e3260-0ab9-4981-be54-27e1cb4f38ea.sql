-- ============================================
-- PHASE 1: Create Safe Public Views
-- ============================================

-- View for public user profiles (no financial data)
CREATE OR REPLACE VIEW public.public_user_profiles AS
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
CREATE OR REPLACE VIEW public.public_pixel_owner_info AS
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
CREATE OR REPLACE VIEW public.public_alliances AS
SELECT 
  id,
  name,
  tag,
  created_at,
  created_by
FROM public.alliances;

-- Grant SELECT on views to anon and authenticated roles
GRANT SELECT ON public.public_user_profiles TO anon, authenticated;
GRANT SELECT ON public.public_pixel_owner_info TO anon, authenticated;
GRANT SELECT ON public.public_alliances TO anon, authenticated;

-- ============================================
-- PHASE 2: Remove Permissive RLS Policies
-- ============================================

-- Remove public access from users table (sensitive financial data)
DROP POLICY IF EXISTS "Users are publicly readable" ON public.users;

-- Remove public access from paint_events table (behavioral profiling risk)
DROP POLICY IF EXISTS "Events are publicly readable" ON public.paint_events;

-- Remove public access from alliances table (invite_code exposed)
DROP POLICY IF EXISTS "Alliances are publicly readable" ON public.alliances;

-- Remove public access from alliance_members table
DROP POLICY IF EXISTS "Alliance members are publicly readable" ON public.alliance_members;