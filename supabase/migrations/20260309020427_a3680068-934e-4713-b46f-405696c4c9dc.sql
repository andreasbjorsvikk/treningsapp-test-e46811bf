
-- Drop the restrictive admin insert policy and recreate as permissive
DROP POLICY IF EXISTS "Admins can insert checkins for any user" ON public.peak_checkins;

CREATE POLICY "Admins can insert checkins for any user"
ON public.peak_checkins
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
