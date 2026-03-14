
-- Create child_profiles table
CREATE TABLE public.child_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_user_id UUID NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies: parents can manage their own children
CREATE POLICY "Parents can view own children"
  ON public.child_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = parent_user_id);

CREATE POLICY "Parents can insert own children"
  ON public.child_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = parent_user_id);

CREATE POLICY "Parents can update own children"
  ON public.child_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = parent_user_id);

CREATE POLICY "Parents can delete own children"
  ON public.child_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = parent_user_id);

-- Allow everyone to view child profiles (for leaderboards)
CREATE POLICY "Authenticated users can view all children"
  ON public.child_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Add updated_at trigger
CREATE TRIGGER update_child_profiles_updated_at
  BEFORE UPDATE ON public.child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
