-- Add computed pixel_id column for fast (x,y) lookups
-- pixel_id = (x << 32) | y gives a unique 64-bit identifier
ALTER TABLE pixels 
ADD COLUMN IF NOT EXISTS pixel_id bigint GENERATED ALWAYS AS ((x << 32) | y) STORED;

-- Create unique index on pixel_id for O(1) lookups
CREATE UNIQUE INDEX IF NOT EXISTS pixels_pixel_id_uq ON pixels(pixel_id);

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS pixels_updated_at_idx ON pixels(updated_at DESC);
CREATE INDEX IF NOT EXISTS pixels_owner_idx ON pixels(owner_user_id);

-- Comment for documentation
COMMENT ON COLUMN pixels.pixel_id IS 'Computed (x << 32 | y) for fast coordinate lookups via IN clause';