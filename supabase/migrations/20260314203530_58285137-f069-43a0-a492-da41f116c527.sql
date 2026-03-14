
-- Update peak_checkins UPDATE policy to allow admins and parents to update
DROP POLICY IF EXISTS "Users can update own checkins" ON public.peak_checkins;
CREATE POLICY "Users admins or parents can update checkins"
  ON public.peak_checkins FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_parent_of(auth.uid(), user_id)
  )
  WITH CHECK (
    (auth.uid() = user_id)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_parent_of(auth.uid(), user_id)
  );
