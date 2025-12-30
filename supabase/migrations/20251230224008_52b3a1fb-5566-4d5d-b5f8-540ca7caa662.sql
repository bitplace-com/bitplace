-- Add unique constraint on pixels (x, y) for atomic upserts
CREATE UNIQUE INDEX IF NOT EXISTS pixels_x_y_unique ON public.pixels (x, y);