-- Create alliances table
CREATE TABLE public.alliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag text NOT NULL UNIQUE,
  created_by uuid NOT NULL REFERENCES public.users(id),
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alliances ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Alliances are publicly readable"
  ON public.alliances FOR SELECT
  USING (true);

-- Create alliance_members table
CREATE TABLE public.alliance_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alliance_id uuid NOT NULL REFERENCES public.alliances(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.alliance_members ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Alliance members are publicly readable"
  ON public.alliance_members FOR SELECT
  USING (true);

-- Indexes for fast lookups
CREATE INDEX idx_alliance_members_user ON public.alliance_members(user_id);
CREATE INDEX idx_alliance_members_alliance ON public.alliance_members(alliance_id);