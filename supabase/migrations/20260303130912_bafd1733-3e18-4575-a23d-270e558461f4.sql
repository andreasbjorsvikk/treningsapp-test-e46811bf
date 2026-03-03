-- Allow friends to view each other's primary goal periods
CREATE POLICY "Friends can view each others goals"
ON public.primary_goal_periods
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM friendships
    WHERE friendships.status = 'accepted'
    AND (
      (friendships.user_id = auth.uid() AND friendships.friend_id = primary_goal_periods.user_id)
      OR (friendships.friend_id = auth.uid() AND friendships.user_id = primary_goal_periods.user_id)
    )
  )
);