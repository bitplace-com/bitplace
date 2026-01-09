-- Drop and recreate public_pixel_owner_info view to include bio and social links
DROP VIEW IF EXISTS public_pixel_owner_info;

CREATE VIEW public_pixel_owner_info AS
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
    WHEN wallet_address IS NOT NULL AND length(wallet_address) > 8
    THEN substring(wallet_address from 1 for 4) || '...' || substring(wallet_address from length(wallet_address) - 3)
    ELSE wallet_address
  END AS wallet_short,
  bio,
  social_x,
  social_instagram,
  social_website
FROM public.users;