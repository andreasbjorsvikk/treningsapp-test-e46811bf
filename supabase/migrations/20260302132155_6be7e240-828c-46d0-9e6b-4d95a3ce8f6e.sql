
-- Table to store Strava OAuth tokens per user
CREATE TABLE public.strava_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  strava_athlete_id bigint NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.strava_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own strava connection"
ON public.strava_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strava connection"
ON public.strava_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strava connection"
ON public.strava_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strava connection"
ON public.strava_connections FOR DELETE
USING (auth.uid() = user_id);

-- Add strava_activity_id to workout_sessions to avoid duplicates
ALTER TABLE public.workout_sessions
ADD COLUMN strava_activity_id bigint UNIQUE;

-- Trigger for updated_at
CREATE TRIGGER update_strava_connections_updated_at
BEFORE UPDATE ON public.strava_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
