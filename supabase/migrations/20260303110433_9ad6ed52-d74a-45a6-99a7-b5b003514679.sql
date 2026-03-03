
DROP POLICY "Insert notifications" ON public.community_notifications;
CREATE POLICY "Authenticated insert notifications" ON public.community_notifications FOR INSERT 
  TO authenticated
  WITH CHECK (true);
