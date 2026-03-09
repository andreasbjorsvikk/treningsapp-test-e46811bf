
-- Add privacy setting for peak checkins to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_peak_checkins text NOT NULL DEFAULT 'friends';

-- Add privacy selected friends for peak checkins  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS privacy_peak_checkins_friends jsonb DEFAULT '[]'::jsonb;

-- Update the SELECT policy on peak_checkins to allow viewing all checkins for leaderboard (public data)
DROP POLICY IF EXISTS "Users can view own or admins view all" ON public.peak_checkins;
CREATE POLICY "Anyone authenticated can view checkins"
  ON public.peak_checkins FOR SELECT TO authenticated
  USING (true);
