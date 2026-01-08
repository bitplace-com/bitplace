-- Create alliance_invites table for the new invite system
CREATE TABLE public.alliance_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id UUID NOT NULL,
  invited_user_id UUID NOT NULL,
  invited_by_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT alliance_invites_status_check CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  CONSTRAINT alliance_invites_unique_pending UNIQUE (alliance_id, invited_user_id)
);

-- Enable RLS
ALTER TABLE public.alliance_invites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view invites where they are the invited user
CREATE POLICY "Users can view their own invites"
  ON public.alliance_invites
  FOR SELECT
  USING (true);

-- Remove invite_code column from alliances (no longer needed)
ALTER TABLE public.alliances DROP COLUMN IF EXISTS invite_code;