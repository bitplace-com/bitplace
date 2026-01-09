-- Create user_follows table for tracking who follows whom
CREATE TABLE public.user_follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL,
  followed_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(follower_id, followed_id)
);

-- Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own follows"
ON public.user_follows FOR SELECT
USING (true);

CREATE POLICY "Follows managed via service role"
ON public.user_follows FOR ALL
USING (true)
WITH CHECK (true);