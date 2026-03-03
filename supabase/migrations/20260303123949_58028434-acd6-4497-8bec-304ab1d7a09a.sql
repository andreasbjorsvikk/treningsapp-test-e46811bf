
-- Allow friends to view each other's workout sessions (read-only)
CREATE POLICY "Friends can view each others sessions"
ON public.workout_sessions
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND (
      (user_id = auth.uid() AND friend_id = workout_sessions.user_id)
      OR (friend_id = auth.uid() AND user_id = workout_sessions.user_id)
    )
  )
);

-- Drop the old policy that only allowed own sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON public.workout_sessions;
