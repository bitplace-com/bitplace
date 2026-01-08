-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'ALLIANCE_INVITE', 'PIXEL_TAKEOVER', 'PIXEL_DEFENDED', 'PIXEL_ATTACKED', 'SYSTEM'
  title TEXT NOT NULL,
  body TEXT,
  meta JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX notifications_user_unread_idx ON public.notifications(user_id, is_read, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (true);

-- No direct insert/update/delete from client - handled by edge functions with service role