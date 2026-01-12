-- ============================================
-- PLACES SYSTEM: Tables + Indexes + RLS + Triggers
-- ============================================

-- 1. Create places table
CREATE TABLE public.places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Creator
  creator_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Content
  title text NOT NULL CHECK (char_length(title) >= 1 AND char_length(title) <= 100),
  description text CHECK (description IS NULL OR char_length(description) <= 500),
  
  -- Location
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  zoom integer NOT NULL DEFAULT 12,
  
  -- Pixel-space bounding box (computed from lat/lng at GRID_ZOOM=12)
  center_x bigint,
  center_y bigint,
  bbox_xmin bigint,
  bbox_ymin bigint,
  bbox_xmax bigint,
  bbox_ymax bigint,
  
  -- Visibility
  is_public boolean NOT NULL DEFAULT true,
  
  -- Denormalized counters for fast queries
  likes_count integer NOT NULL DEFAULT 0,
  saves_count integer NOT NULL DEFAULT 0
);

-- Indexes for places
CREATE INDEX places_created_at_idx ON public.places(created_at DESC);
CREATE INDEX places_creator_user_id_idx ON public.places(creator_user_id);
CREATE INDEX places_is_public_created_idx ON public.places(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX places_likes_count_idx ON public.places(likes_count DESC);

-- Enable RLS on places
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;

-- RLS: Public places are readable by everyone via service role
CREATE POLICY "Public places readable" ON public.places
  FOR SELECT USING (is_public = true);

-- 2. Create place_likes table
CREATE TABLE public.place_likes (
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, user_id)
);

-- Indexes for place_likes
CREATE INDEX place_likes_place_id_idx ON public.place_likes(place_id);
CREATE INDEX place_likes_user_id_idx ON public.place_likes(user_id);
CREATE INDEX place_likes_created_at_idx ON public.place_likes(created_at DESC);

-- Enable RLS on place_likes
ALTER TABLE public.place_likes ENABLE ROW LEVEL SECURITY;

-- RLS: Likes readable via service role
CREATE POLICY "Likes readable via service role" ON public.place_likes
  FOR SELECT USING (true);

-- 3. Create place_saves table
CREATE TABLE public.place_saves (
  place_id uuid NOT NULL REFERENCES public.places(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (place_id, user_id)
);

-- Indexes for place_saves
CREATE INDEX place_saves_user_id_idx ON public.place_saves(user_id);
CREATE INDEX place_saves_place_id_idx ON public.place_saves(place_id);

-- Enable RLS on place_saves
ALTER TABLE public.place_saves ENABLE ROW LEVEL SECURITY;

-- RLS: Saves readable via service role
CREATE POLICY "Saves readable via service role" ON public.place_saves
  FOR SELECT USING (true);

-- 4. Trigger to update likes_count on places
CREATE OR REPLACE FUNCTION public.update_place_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE places SET likes_count = likes_count + 1 WHERE id = NEW.place_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE places SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.place_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER place_likes_count_trigger
AFTER INSERT OR DELETE ON public.place_likes
FOR EACH ROW EXECUTE FUNCTION public.update_place_likes_count();

-- 5. Trigger to update saves_count on places
CREATE OR REPLACE FUNCTION public.update_place_saves_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE places SET saves_count = saves_count + 1 WHERE id = NEW.place_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE places SET saves_count = GREATEST(0, saves_count - 1) WHERE id = OLD.place_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER place_saves_count_trigger
AFTER INSERT OR DELETE ON public.place_saves
FOR EACH ROW EXECUTE FUNCTION public.update_place_saves_count();

-- 6. Trigger for updated_at on places
CREATE TRIGGER update_places_updated_at
BEFORE UPDATE ON public.places
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();