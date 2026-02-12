CREATE OR REPLACE FUNCTION public.sum_owner_stake_in_bbox(
  p_xmin bigint, p_ymin bigint,
  p_xmax bigint, p_ymax bigint,
  p_owner_id uuid
) RETURNS bigint AS $$
  SELECT COALESCE(SUM(owner_stake_pe), 0)
  FROM pixels
  WHERE x >= p_xmin AND x <= p_xmax
    AND y >= p_ymin AND y <= p_ymax
    AND owner_user_id = p_owner_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public';