-- Enable realtime on pixel_contributions for contribution removal notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.pixel_contributions;