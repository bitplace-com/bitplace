-- Add pixels_painted_total column to users table
ALTER TABLE public.users 
ADD COLUMN pixels_painted_total BIGINT NOT NULL DEFAULT 0;

-- Update public_user_profiles view to include pixels_painted_total
DROP VIEW IF EXISTS public.public_user_profiles;
CREATE VIEW public.public_user_profiles AS
SELECT 
  id,
  display_name,
  avatar_url,
  country_code,
  alliance_tag,
  level,
  xp,
  pixels_painted_total,
  CASE
    WHEN wallet_address IS NOT NULL AND length(wallet_address) > 8
    THEN substring(wallet_address FROM 1 FOR 4) || '...' || substring(wallet_address FROM length(wallet_address) - 3)
    ELSE wallet_address
  END AS wallet_short
FROM users;

-- Update public_pixel_owner_info view to include pixels_painted_total
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
  CASE
    WHEN wallet_address IS NOT NULL AND length(wallet_address) > 8
    THEN substring(wallet_address FROM 1 FOR 4) || '...' || substring(wallet_address FROM length(wallet_address) - 3)
    ELSE wallet_address
  END AS wallet_short,
  bio,
  social_x,
  social_instagram,
  social_website
FROM users;