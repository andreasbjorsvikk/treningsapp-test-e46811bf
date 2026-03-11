ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS repeating boolean DEFAULT false;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;