DROP VIEW IF EXISTS public.public_user_profiles;

CREATE VIEW public.public_user_profiles AS
SELECT id,
    display_name,
    avatar_url,
    country_code,
    alliance_tag,
    level,
    xp,
    pixels_painted_total,
    created_at,
    pe_used_pe,
    wallet_address,
    CASE
        WHEN wallet_address IS NOT NULL AND length(wallet_address) > 8 THEN (SUBSTRING(wallet_address FROM 1 FOR 4) || '...'::text) || SUBSTRING(wallet_address FROM length(wallet_address) - 3)
        ELSE wallet_address
    END AS wallet_short
FROM users;