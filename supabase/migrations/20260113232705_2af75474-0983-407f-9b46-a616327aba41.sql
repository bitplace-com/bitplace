-- Create index for tile-based queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_pixels_tile_coords ON pixels(tile_x, tile_y);

-- Create RPC function to fetch pixels by tile coordinates
CREATE OR REPLACE FUNCTION get_pixels_by_tiles(
  tile_x_list bigint[],
  tile_y_list bigint[]
)
RETURNS TABLE (
  id bigint,
  x bigint,
  y bigint,
  color text,
  tile_x bigint,
  tile_y bigint
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.x, p.y, p.color, p.tile_x::bigint, p.tile_y::bigint
  FROM pixels p
  WHERE p.tile_x = ANY(tile_x_list)
    AND p.tile_y = ANY(tile_y_list);
$$;