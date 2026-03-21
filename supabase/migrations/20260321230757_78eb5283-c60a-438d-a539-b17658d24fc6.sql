
-- 1. Create hiking_records table for persistent hiking record storage
CREATE TABLE public.hiking_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  elevation integer,
  distance double precision,
  elevation_gain integer,
  entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hiking_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hiking records" ON public.hiking_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hiking records" ON public.hiking_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hiking records" ON public.hiking_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hiking records" ON public.hiking_records FOR DELETE USING (auth.uid() = user_id);

-- 2. Add checked_in_by column to peak_checkins for tracking who performed child checkins
ALTER TABLE public.peak_checkins ADD COLUMN checked_in_by uuid;
