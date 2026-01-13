-- Create RPC function to fetch pixels by coordinates
-- This avoids BigInt precision issues with pixel_id
CREATE OR REPLACE FUNCTION fetch_pixels_by_coords(coords jsonb)
RETURNS TABLE (
  id bigint,
  x bigint,
  y bigint,
  pixel_id bigint,
  owner_user_id uuid,
  owner_stake_pe bigint,
  color text,
  def_total bigint,
  atk_total bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.x, p.y, p.pixel_id, p.owner_user_id, p.owner_stake_pe, p.color, p.def_total, p.atk_total
  FROM pixels p
  INNER JOIN jsonb_to_recordset(coords) AS c(x bigint, y bigint)
  ON p.x = c.x AND p.y = c.y;
END;
$$;