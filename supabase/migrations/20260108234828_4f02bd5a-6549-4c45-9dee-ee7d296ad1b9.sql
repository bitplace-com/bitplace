-- Create user_pins table for storing favorite locations
CREATE TABLE public.user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  zoom INTEGER DEFAULT 12,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE (user_id, lat, lng)
);

-- Create index for faster lookups by user
CREATE INDEX idx_user_pins_user_id ON public.user_pins(user_id);

-- Enable RLS
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read via edge function (service role bypasses RLS)
CREATE POLICY "Pins are readable via service role" ON public.user_pins
  FOR SELECT USING (true);

CREATE POLICY "Pins are insertable via service role" ON public.user_pins
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Pins are updatable via service role" ON public.user_pins
  FOR UPDATE USING (true);

CREATE POLICY "Pins are deletable via service role" ON public.user_pins
  FOR DELETE USING (true);