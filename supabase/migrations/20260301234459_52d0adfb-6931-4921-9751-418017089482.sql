
-- ========== PROFILES ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ========== WORKOUT SESSIONS ==========
CREATE TABLE public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  distance DOUBLE PRECISION,
  elevation_gain INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.workout_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.workout_sessions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.workout_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_workout_sessions_user_date ON public.workout_sessions(user_id, date DESC);

-- ========== EXTRA GOALS ==========
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  period TEXT NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'all',
  target DOUBLE PRECISION NOT NULL,
  custom_start DATE,
  custom_end DATE,
  show_on_home BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- ========== PRIMARY GOAL PERIODS ==========
CREATE TABLE public.primary_goal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_period TEXT NOT NULL,
  input_target DOUBLE PRECISION NOT NULL,
  valid_from DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.primary_goal_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own primary goals"
  ON public.primary_goal_periods FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own primary goals"
  ON public.primary_goal_periods FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own primary goals"
  ON public.primary_goal_periods FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own primary goals"
  ON public.primary_goal_periods FOR DELETE USING (auth.uid() = user_id);

-- ========== HEALTH EVENTS ==========
CREATE TABLE public.health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  date_from DATE NOT NULL,
  date_to DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health events"
  ON public.health_events FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health events"
  ON public.health_events FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health events"
  ON public.health_events FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health events"
  ON public.health_events FOR DELETE USING (auth.uid() = user_id);

-- ========== UPDATED_AT TRIGGER ==========
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
