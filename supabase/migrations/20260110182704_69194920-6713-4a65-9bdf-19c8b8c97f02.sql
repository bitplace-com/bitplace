-- Add computed tile columns for efficient batch fetching
-- Using TILE_SIZE = 512 to match map tile size
ALTER TABLE pixels
ADD COLUMN IF NOT EXISTS tile_x integer GENERATED ALWAYS AS (floor(x::numeric / 512)::integer) STORED,
ADD COLUMN IF NOT EXISTS tile_y integer GENERATED ALWAYS AS (floor(y::numeric / 512)::integer) STORED;

-- Create composite index on tile coordinates for fast batch lookups
CREATE INDEX IF NOT EXISTS idx_pixels_tile ON pixels(tile_x, tile_y);

-- Comment for documentation
COMMENT ON COLUMN pixels.tile_x IS 'Computed tile X coordinate (floor(x/512)) for viewport-based loading';
COMMENT ON COLUMN pixels.tile_y IS 'Computed tile Y coordinate (floor(y/512)) for viewport-based loading';