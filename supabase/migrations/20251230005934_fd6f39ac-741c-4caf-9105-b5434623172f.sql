-- Table 1: users
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text UNIQUE,
  display_name text,
  avatar_url text,
  country_code text,
  alliance_tag text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users are publicly readable"
  ON public.users FOR SELECT
  TO anon, authenticated
  USING (true);

-- Table 2: pixels
CREATE TABLE public.pixels (
  id bigserial PRIMARY KEY,
  x bigint NOT NULL,
  y bigint NOT NULL,
  color text NOT NULL,
  owner_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  owner_stake_pe bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX pixels_xy_unique ON public.pixels (x, y);
CREATE INDEX pixels_xy_range ON public.pixels (x, y);

ALTER TABLE public.pixels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pixels are publicly readable"
  ON public.pixels FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.pixels;

-- Table 3: pixel_contributions
CREATE TABLE public.pixel_contributions (
  id bigserial PRIMARY KEY,
  pixel_id bigint NOT NULL REFERENCES public.pixels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  side text NOT NULL CHECK (side IN ('DEF', 'ATK')),
  amount_pe bigint NOT NULL
);

CREATE UNIQUE INDEX pixel_contributions_unique ON public.pixel_contributions (pixel_id, user_id);

ALTER TABLE public.pixel_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Contributions are publicly readable"
  ON public.pixel_contributions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Table 4: paint_events (audit)
CREATE TABLE public.paint_events (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  action_type text NOT NULL,
  pixel_count int,
  bbox jsonb,
  details jsonb
);

ALTER TABLE public.paint_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events are publicly readable"
  ON public.paint_events FOR SELECT
  TO anon, authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_pixels_updated_at
  BEFORE UPDATE ON public.pixels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();