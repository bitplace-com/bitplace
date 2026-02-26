DROP FUNCTION IF EXISTS public.fetch_pixels_by_coords(jsonb);

CREATE OR REPLACE FUNCTION public.fetch_pixels_by_coords(coords jsonb)
  RETURNS TABLE(id bigint, x bigint, y bigint, pixel_id bigint, owner_user_id uuid, owner_stake_pe bigint, color text, def_total bigint, atk_total bigint, updated_at timestamptz)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.x, p.y, p.pixel_id, p.owner_user_id, p.owner_stake_pe, p.color, p.def_total, p.atk_total, p.updated_at
  FROM pixels p
  INNER JOIN jsonb_to_recordset(coords) AS c(x bigint, y bigint)
  ON p.x = c.x AND p.y = c.y;
END;
$$;