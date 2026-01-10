-- Enable realtime for notifications table so we can subscribe to new notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;