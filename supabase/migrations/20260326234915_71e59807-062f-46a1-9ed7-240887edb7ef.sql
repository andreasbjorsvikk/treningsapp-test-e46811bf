
-- Apple Health connections table
CREATE TABLE public.apple_health_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connected_at timestamp with time zone NOT NULL DEFAULT now(),
  disconnected_at timestamp with time zone,
  steps_enabled boolean NOT NULL DEFAULT true,
  calories_enabled boolean NOT NULL DEFAULT true,
  workouts_enabled boolean NOT NULL DEFAULT false,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.apple_health_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own apple health connection"
  ON public.apple_health_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own apple health connection"
  ON public.apple_health_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own apple health connection"
  ON public.apple_health_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own apple health connection"
  ON public.apple_health_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Daily health metrics table (steps, calories per day)
CREATE TABLE public.daily_health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  steps integer,
  active_calories double precision,
  source text NOT NULL DEFAULT 'apple_health',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, date, source)
);

ALTER TABLE public.daily_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health metrics"
  ON public.daily_health_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health metrics"
  ON public.daily_health_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health metrics"
  ON public.daily_health_metrics FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health metrics"
  ON public.daily_health_metrics FOR DELETE
  USING (auth.uid() = user_id);

-- Add source tracking fields to workout_sessions
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS source_primary text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS apple_health_workout_id text,
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced',
  ADD COLUMN IF NOT EXISTS imported_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS source_history jsonb DEFAULT '[]'::jsonb;
