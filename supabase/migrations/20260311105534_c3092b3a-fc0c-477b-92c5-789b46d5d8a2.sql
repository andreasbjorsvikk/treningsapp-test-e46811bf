
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_workouts text NOT NULL DEFAULT 'me',
  ADD COLUMN IF NOT EXISTS privacy_stats text NOT NULL DEFAULT 'me',
  ADD COLUMN IF NOT EXISTS privacy_goals text NOT NULL DEFAULT 'me',
  ADD COLUMN IF NOT EXISTS privacy_workouts_friends jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_stats_friends jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_goals_friends jsonb DEFAULT '[]'::jsonb;
