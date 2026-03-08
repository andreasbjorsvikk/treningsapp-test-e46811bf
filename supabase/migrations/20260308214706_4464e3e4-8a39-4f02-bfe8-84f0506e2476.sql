
CREATE TABLE public.peak_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  peak_id TEXT NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified BOOLEAN NOT NULL DEFAULT true,
  activity_id UUID NULL
);

ALTER TABLE public.peak_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkins" ON public.peak_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own checkins" ON public.peak_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own checkins" ON public.peak_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE UNIQUE INDEX peak_checkins_user_peak_unique ON public.peak_checkins (user_id, peak_id);
