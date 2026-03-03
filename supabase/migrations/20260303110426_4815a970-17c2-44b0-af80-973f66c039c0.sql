
-- Friendships table
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  friend_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update friendships"
  ON public.friendships FOR UPDATE USING (auth.uid() = friend_id OR auth.uid() = user_id);
CREATE POLICY "Users can delete friendships"
  ON public.friendships FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Challenges table
CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text,
  metric text NOT NULL,
  activity_type text NOT NULL DEFAULT 'all',
  target double precision NOT NULL DEFAULT 0,
  period_start date NOT NULL,
  period_end date NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Challenge participants
CREATE TABLE public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Community notifications
CREATE TABLE public.community_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  challenge_id uuid REFERENCES public.challenges(id) ON DELETE CASCADE,
  from_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;

-- Challenges RLS (after challenge_participants exists)
CREATE POLICY "View challenges" ON public.challenges FOR SELECT
  USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.challenge_participants cp WHERE cp.challenge_id = challenges.id AND cp.user_id = auth.uid()));
CREATE POLICY "Create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update challenges" ON public.challenges FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Delete challenges" ON public.challenges FOR DELETE USING (auth.uid() = created_by);

-- Challenge participants RLS
CREATE POLICY "View participants" ON public.challenge_participants FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.challenge_participants cp2 WHERE cp2.challenge_id = challenge_participants.challenge_id AND cp2.user_id = auth.uid()));
CREATE POLICY "Insert participants" ON public.challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.created_by = auth.uid()));
CREATE POLICY "Update participation" ON public.challenge_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete participation" ON public.challenge_participants FOR DELETE USING (auth.uid() = user_id);

-- Notifications RLS
CREATE POLICY "View own notifications" ON public.community_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert notifications" ON public.community_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Update own notifications" ON public.community_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete own notifications" ON public.community_notifications FOR DELETE USING (auth.uid() = user_id);

-- Update profiles to be viewable by friends
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.friendships f WHERE f.status = 'accepted' AND ((f.user_id = auth.uid() AND f.friend_id = profiles.id) OR (f.friend_id = auth.uid() AND f.user_id = profiles.id))));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_notifications;
