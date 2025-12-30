-- Performance indexes for pixel queries
CREATE INDEX IF NOT EXISTS idx_pixels_x_y ON pixels(x, y);

-- Performance indexes for contribution lookups
CREATE INDEX IF NOT EXISTS idx_contributions_pixel_id ON pixel_contributions(pixel_id);
CREATE INDEX IF NOT EXISTS idx_contributions_user_id ON pixel_contributions(user_id);