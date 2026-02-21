-- Issue 1: Block direct client access to notifications (all access via edge functions)
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (false);

-- Issue 2: Remove unnecessary authenticated insert policy on place-snapshots
DROP POLICY IF EXISTS "Auth insert place-snapshots" ON storage.objects;