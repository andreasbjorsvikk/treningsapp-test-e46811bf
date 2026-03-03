-- Fix infinite recursion in challenge_participants SELECT policy
-- by using a security definer function

CREATE OR REPLACE FUNCTION public.is_challenge_participant(_challenge_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = _challenge_id AND user_id = _user_id
  )
$$;

-- Drop the old recursive policy
DROP POLICY IF EXISTS "View participants" ON public.challenge_participants;

-- Create new non-recursive policy
CREATE POLICY "View participants"
ON public.challenge_participants
FOR SELECT
USING (
  auth.uid() = user_id
  OR public.is_challenge_participant(challenge_id, auth.uid())
);
