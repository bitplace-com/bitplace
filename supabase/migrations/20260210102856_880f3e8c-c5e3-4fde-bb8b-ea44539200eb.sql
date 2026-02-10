-- Add social_discord column
ALTER TABLE public.users ADD COLUMN social_discord text;

-- Recreate view with social_discord
DROP VIEW IF EXISTS public.public_pixel_owner_info;
CREATE VIEW public.public_pixel_owner_info AS
SELECT
  id,
  display_name,
  avatar_url,
  country_code,
  alliance_tag,
  level,
  pixels_painted_total,
  owner_health_multiplier,
  rebalance_active,
  rebalance_started_at,
  rebalance_ends_at,
  rebalance_target_multiplier,
  LEFT(wallet_address, 4) || '...' || RIGHT(wallet_address, 4) AS wallet_short,
  bio,
  social_x,
  social_instagram,
  social_website,
  social_discord
FROM public.users;