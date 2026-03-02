
-- Add heartrate and polyline columns to workout_sessions
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS average_heartrate integer,
  ADD COLUMN IF NOT EXISTS max_heartrate integer,
  ADD COLUMN IF NOT EXISTS summary_polyline text;

-- Create workout_streams table for detailed stream data
CREATE TABLE public.workout_streams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  heartrate_data jsonb,
  altitude_data jsonb,
  latlng_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workout_streams_session_id_key UNIQUE (session_id)
);

-- Enable RLS
ALTER TABLE public.workout_streams ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own streams"
  ON public.workout_streams FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streams"
  ON public.workout_streams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own streams"
  ON public.workout_streams FOR DELETE
  USING (auth.uid() = user_id);
