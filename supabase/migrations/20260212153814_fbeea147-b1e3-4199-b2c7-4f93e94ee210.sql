
CREATE OR REPLACE FUNCTION public.get_user_total_staked_pe(uid uuid)
RETURNS TABLE(pixel_stake_total bigint, contribution_total bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    (SELECT COALESCE(SUM(owner_stake_pe), 0) FROM pixels WHERE owner_user_id = uid),
    (SELECT COALESCE(SUM(amount_pe), 0) FROM pixel_contributions WHERE user_id = uid);
$$;
