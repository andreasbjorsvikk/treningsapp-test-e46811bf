
-- Create a security definer function to check if a user is a parent of a child
CREATE OR REPLACE FUNCTION public.is_parent_of(_parent_id uuid, _child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.child_profiles
    WHERE parent_user_id = _parent_id AND id = _child_id
  )
$$;

-- Drop and recreate the insert policy for peak_checkins to allow parent checkins for children
DROP POLICY IF EXISTS "Users or admins can insert checkins" ON public.peak_checkins;
CREATE POLICY "Users or admins or parents can insert checkins"
  ON public.peak_checkins FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_parent_of(auth.uid(), user_id::uuid)
  );

-- Allow parents to delete their children's checkins  
DROP POLICY IF EXISTS "Users can delete own or admins delete any" ON public.peak_checkins;
CREATE POLICY "Users admins or parents can delete checkins"
  ON public.peak_checkins FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = user_id) 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_parent_of(auth.uid(), user_id::uuid)
  );
