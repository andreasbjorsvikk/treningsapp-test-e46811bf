
ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_strava_activity_id_key;
DROP INDEX IF EXISTS public.workout_sessions_user_strava_unique;
DROP INDEX IF EXISTS public.idx_workout_sessions_user_strava;
ALTER TABLE public.workout_sessions ADD CONSTRAINT uq_workout_sessions_user_strava UNIQUE (user_id, strava_activity_id);
