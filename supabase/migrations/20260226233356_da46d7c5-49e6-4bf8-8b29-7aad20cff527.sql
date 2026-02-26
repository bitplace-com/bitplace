
DROP FUNCTION IF EXISTS public.leaderboard_top_investors(integer);
DROP FUNCTION IF EXISTS public.leaderboard_top_defenders(integer);
DROP FUNCTION IF EXISTS public.leaderboard_top_attackers(integer);

CREATE OR REPLACE FUNCTION public.leaderboard_top_investors(lim integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, total_pe bigint, display_name text, country_code text, alliance_tag text, avatar_url text, google_avatar_url text, bio text, social_x text, social_instagram text, social_website text, wallet_address text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    p.owner_user_id AS user_id,
    SUM(p.owner_stake_pe)::bigint AS total_pe,
    u.display_name, u.country_code, u.alliance_tag, u.avatar_url, u.google_avatar_url,
    u.bio, u.social_x, u.social_instagram, u.social_website, u.wallet_address
  FROM pixels p
  JOIN users u ON u.id = p.owner_user_id
  WHERE p.owner_user_id IS NOT NULL
  GROUP BY p.owner_user_id, u.display_name, u.country_code, u.alliance_tag, u.avatar_url, u.google_avatar_url, u.bio, u.social_x, u.social_instagram, u.social_website, u.wallet_address
  ORDER BY total_pe DESC
  LIMIT lim;
$function$;

CREATE OR REPLACE FUNCTION public.leaderboard_top_defenders(lim integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, total_pe bigint, display_name text, country_code text, alliance_tag text, avatar_url text, google_avatar_url text, bio text, social_x text, social_instagram text, social_website text, wallet_address text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    u.id AS user_id,
    (COALESCE(c.live_pe, 0) + u.takeover_def_pe_total)::bigint AS total_pe,
    u.display_name, u.country_code, u.alliance_tag, u.avatar_url, u.google_avatar_url,
    u.bio, u.social_x, u.social_instagram, u.social_website, u.wallet_address
  FROM users u
  LEFT JOIN (
    SELECT user_id, SUM(amount_pe) AS live_pe FROM pixel_contributions WHERE side = 'DEF' GROUP BY user_id
  ) c ON c.user_id = u.id
  WHERE COALESCE(c.live_pe, 0) + u.takeover_def_pe_total > 0
  ORDER BY total_pe DESC
  LIMIT lim;
$function$;

CREATE OR REPLACE FUNCTION public.leaderboard_top_attackers(lim integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, total_pe bigint, display_name text, country_code text, alliance_tag text, avatar_url text, google_avatar_url text, bio text, social_x text, social_instagram text, social_website text, wallet_address text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    u.id AS user_id,
    (COALESCE(c.live_pe, 0) + u.takeover_atk_pe_total)::bigint AS total_pe,
    u.display_name, u.country_code, u.alliance_tag, u.avatar_url, u.google_avatar_url,
    u.bio, u.social_x, u.social_instagram, u.social_website, u.wallet_address
  FROM users u
  LEFT JOIN (
    SELECT user_id, SUM(amount_pe) AS live_pe FROM pixel_contributions WHERE side = 'ATK' GROUP BY user_id
  ) c ON c.user_id = u.id
  WHERE COALESCE(c.live_pe, 0) + u.takeover_atk_pe_total > 0
  ORDER BY total_pe DESC
  LIMIT lim;
$function$;
