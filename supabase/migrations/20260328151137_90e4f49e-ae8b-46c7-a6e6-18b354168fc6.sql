ALTER TABLE public.workout_sessions ADD COLUMN user_modified boolean NOT NULL DEFAULT false;
ALTER TABLE public.workout_sessions ADD COLUMN exclude_from_count boolean NOT NULL DEFAULT false;