-- Add progression columns to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS xp bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;

-- Add index for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_users_level_xp ON public.users (level DESC, xp DESC);