-- Add paint cooldown column to users table
ALTER TABLE public.users 
ADD COLUMN paint_cooldown_until timestamptz NULL;

COMMENT ON COLUMN public.users.paint_cooldown_until IS 
  'Timestamp until which the user cannot perform PAINT actions (30s after last paint)';