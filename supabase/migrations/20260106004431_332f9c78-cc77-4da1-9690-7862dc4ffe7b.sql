-- Drop and recreate views with wallet_short computed field
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
    WHEN wallet_address IS NOT NULL 
    THEN CONCAT(LEFT(wallet_address, 4), '...', RIGHT(wallet_address, 4))
    ELSE NULL 
  END AS wallet_short
FROM users;

DROP VIEW IF EXISTS public_user_profiles;
CREATE VIEW public_user_profiles AS
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

-- Fix existing users with NULL display_name
UPDATE users 
SET display_name = CONCAT(LEFT(wallet_address, 4), '...', RIGHT(wallet_address, 4))
WHERE display_name IS NULL AND wallet_address IS NOT NULL;