
-- =====================================================
-- Phase 1: Google Auth + Virtual PE Schema Changes
-- =====================================================

-- 1. Users table: add Google auth and virtual PE columns
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'wallet',
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS google_avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS google_user_id TEXT,
  ADD COLUMN IF NOT EXISTS virtual_pe_total BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS virtual_pe_used BIGINT NOT NULL DEFAULT 0;

-- Index for google_user_id lookups
CREATE INDEX IF NOT EXISTS idx_users_google_user_id ON public.users(google_user_id) WHERE google_user_id IS NOT NULL;

-- 2. Pixels table: add expiry and virtual stake columns
ALTER TABLE public.pixels
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_virtual_stake BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS virtual_pe_cost BIGINT NOT NULL DEFAULT 0;

-- Partial index for efficient expired pixel queries
CREATE INDEX IF NOT EXISTS idx_pixels_expires_at ON public.pixels(expires_at) WHERE expires_at IS NOT NULL;

-- 3. Drop and recreate public_pixel_owner_info view with new columns
DROP VIEW IF EXISTS public.public_pixel_owner_info;
CREATE VIEW public.public_pixel_owner_info AS
SELECT
  u.id,
  u.display_name,
  u.avatar_url,
  u.country_code,
  u.alliance_tag,
  LEFT(u.wallet_address, 4) || '...' || RIGHT(u.wallet_address, 4) AS wallet_short,
  u.bio,
  u.social_x,
  u.social_instagram,
  u.social_website,
  u.social_discord,
  u.level,
  u.pixels_painted_total,
  u.owner_health_multiplier,
  u.rebalance_active,
  u.rebalance_started_at,
  u.rebalance_ends_at,
  u.rebalance_target_multiplier,
  u.auth_provider,
  u.email,
  u.google_avatar_url
FROM public.users u;

-- 4. Drop and recreate public_user_profiles view with new column
DROP VIEW IF EXISTS public.public_user_profiles;
CREATE VIEW public.public_user_profiles AS
SELECT
  u.id,
  u.display_name,
  u.avatar_url,
  u.country_code,
  u.alliance_tag,
  LEFT(u.wallet_address, 4) || '...' || RIGHT(u.wallet_address, 4) AS wallet_short,
  u.wallet_address,
  u.level,
  u.xp,
  u.pixels_painted_total,
  u.pe_used_pe,
  u.created_at,
  u.auth_provider
FROM public.users u;

-- 5. DB function: cleanup_expired_pixels
CREATE OR REPLACE FUNCTION public.cleanup_expired_pixels()
RETURNS TABLE(owner_id UUID, pixel_x BIGINT, pixel_y BIGINT, refund_amount BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    SELECT p.id, p.x, p.y, p.owner_user_id, p.virtual_pe_cost
    FROM pixels p
    WHERE p.expires_at IS NOT NULL AND p.expires_at < NOW()
  ),
  deleted_contributions AS (
    DELETE FROM pixel_contributions pc
    USING expired e
    WHERE pc.pixel_id = e.id
    RETURNING pc.pixel_id
  ),
  deleted_pixels AS (
    DELETE FROM pixels p
    USING expired e
    WHERE p.id = e.id
    RETURNING p.id, p.owner_user_id, p.virtual_pe_cost, p.x, p.y
  ),
  refunds AS (
    SELECT dp.owner_user_id, SUM(dp.virtual_pe_cost) AS total_refund
    FROM deleted_pixels dp
    WHERE dp.owner_user_id IS NOT NULL AND dp.virtual_pe_cost > 0
    GROUP BY dp.owner_user_id
  ),
  applied_refunds AS (
    UPDATE users u
    SET virtual_pe_used = GREATEST(0, u.virtual_pe_used - r.total_refund)
    FROM refunds r
    WHERE u.id = r.owner_user_id
    RETURNING u.id
  )
  SELECT dp.owner_user_id AS owner_id, dp.x AS pixel_x, dp.y AS pixel_y, dp.virtual_pe_cost AS refund_amount
  FROM deleted_pixels dp;
END;
$$;
