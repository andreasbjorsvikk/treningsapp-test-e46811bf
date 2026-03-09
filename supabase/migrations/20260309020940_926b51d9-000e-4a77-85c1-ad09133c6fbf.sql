
-- Drop both INSERT policies (they are both RESTRICTIVE, which means both must pass)
DROP POLICY IF EXISTS "Users can insert own checkins" ON public.peak_checkins;
DROP POLICY IF EXISTS "Admins can insert checkins for any user" ON public.peak_checkins;

-- Create a single PERMISSIVE INSERT policy that allows either self-insert OR admin insert
CREATE POLICY "Users or admins can insert checkins"
ON public.peak_checkins
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to view all checkins
DROP POLICY IF EXISTS "Users can view own checkins" ON public.peak_checkins;
CREATE POLICY "Users can view own or admins view all"
ON public.peak_checkins
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow admins to delete any checkin
DROP POLICY IF EXISTS "Users can delete own checkins" ON public.peak_checkins;
CREATE POLICY "Users can delete own or admins delete any"
ON public.peak_checkins
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);
