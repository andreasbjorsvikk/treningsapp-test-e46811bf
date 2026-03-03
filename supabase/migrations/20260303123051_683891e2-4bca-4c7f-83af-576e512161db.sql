
-- Allow all authenticated users to search profiles (needed for friend search)
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);
