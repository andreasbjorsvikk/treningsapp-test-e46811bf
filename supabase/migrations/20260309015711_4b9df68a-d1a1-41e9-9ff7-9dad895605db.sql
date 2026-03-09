-- Allow admins to insert checkins for any user
CREATE POLICY "Admins can insert checkins for any user"
ON public.peak_checkins
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
