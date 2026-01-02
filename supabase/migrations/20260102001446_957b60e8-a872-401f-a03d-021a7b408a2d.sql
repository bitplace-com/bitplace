-- Add indexes for efficient PE usage queries
CREATE INDEX IF NOT EXISTS idx_pixels_owner_user_id ON public.pixels(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pixels_updated_at ON public.pixels(updated_at);
CREATE INDEX IF NOT EXISTS idx_pixel_contributions_user_id ON public.pixel_contributions(user_id);