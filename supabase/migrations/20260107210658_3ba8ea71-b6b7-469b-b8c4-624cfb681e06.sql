-- Drop and recreate views with SECURITY DEFINER (not INVOKER)
-- This allows views to read from users table despite RLS

DROP VIEW IF EXISTS public.public_pixel_owner_info;
CREATE VIEW public.public_pixel_owner_info
WITH (security_barrier = true)
AS
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
  rebalance_target_multiplier,
  CASE 
    WHEN wallet_address IS NOT NULL 
    THEN CONCAT(LEFT(wallet_address, 4), '...', RIGHT(wallet_address, 4))
    ELSE NULL 
  END AS wallet_short
FROM users;

DROP VIEW IF EXISTS public.public_user_profiles;
CREATE VIEW public.public_user_profiles
WITH (security_barrier = true)
AS
SELECT 
  id,
  display_name,
  avatar_url,
  country_code,
  alliance_tag,
  level,
  xp,
  CASE 
    WHEN wallet_address IS NOT NULL 
    THEN CONCAT(LEFT(wallet_address, 4), '...', RIGHT(wallet_address, 4))
    ELSE NULL 
  END AS wallet_short
FROM users;

-- Grant SELECT to anon and authenticated roles
GRANT SELECT ON public.public_pixel_owner_info TO anon, authenticated;
GRANT SELECT ON public.public_user_profiles TO anon, authenticated;