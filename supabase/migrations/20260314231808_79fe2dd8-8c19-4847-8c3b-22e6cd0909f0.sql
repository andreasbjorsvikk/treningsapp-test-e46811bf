
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS privacy_child_profile text NOT NULL DEFAULT 'friends',
  ADD COLUMN IF NOT EXISTS privacy_child_checkins text NOT NULL DEFAULT 'friends';
