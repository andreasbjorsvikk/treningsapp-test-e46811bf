
-- Allow all authenticated users to view pending peak suggestions (so they appear on the map)
DROP POLICY IF EXISTS "Users can view own suggestions" ON public.peak_suggestions;
CREATE POLICY "Authenticated users can view pending suggestions"
ON public.peak_suggestions
FOR SELECT
TO authenticated
USING (
  auth.uid() = submitted_by 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR status = 'pending'
);
