
-- Add snapshot_url column
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS snapshot_url text;

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('place-snapshots', 'place-snapshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read place-snapshots"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'place-snapshots');

-- Allow authenticated insert
CREATE POLICY "Auth insert place-snapshots"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'place-snapshots');
