
-- Add route_description field to hiking_records
ALTER TABLE public.hiking_records ADD COLUMN IF NOT EXISTS route_description text;

-- Create hiking_record_shares table for sharing hikes with friends
CREATE TABLE public.hiking_record_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiking_record_id uuid NOT NULL REFERENCES public.hiking_records(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  shared_with_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(hiking_record_id, shared_with_user_id)
);

ALTER TABLE public.hiking_record_shares ENABLE ROW LEVEL SECURITY;

-- Owner and shared user can view shares
CREATE POLICY "Users can view own shares"
ON public.hiking_record_shares FOR SELECT TO authenticated
USING (auth.uid() = owner_id OR auth.uid() = shared_with_user_id);

-- Owner can insert shares
CREATE POLICY "Owner can insert shares"
ON public.hiking_record_shares FOR INSERT TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Owner can delete shares
CREATE POLICY "Owner can delete shares"
ON public.hiking_record_shares FOR DELETE TO authenticated
USING (auth.uid() = owner_id OR auth.uid() = shared_with_user_id);

-- Shared user can update status (accept/decline)
CREATE POLICY "Shared user can update status"
ON public.hiking_record_shares FOR UPDATE TO authenticated
USING (auth.uid() = shared_with_user_id);

-- Allow shared users to view the hiking record
CREATE POLICY "Shared users can view shared hiking records"
ON public.hiking_records FOR SELECT TO authenticated
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.hiking_record_shares 
    WHERE hiking_record_id = hiking_records.id 
    AND shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

-- Create shared_hiking_entries table for friend entries on shared hikes
CREATE TABLE public.shared_hiking_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hiking_record_id uuid NOT NULL REFERENCES public.hiking_records(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  time text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  avg_heartrate integer,
  max_heartrate integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_hiking_entries ENABLE ROW LEVEL SECURITY;

-- Users can view entries on records they own or are shared with
CREATE POLICY "Users can view shared entries"
ON public.shared_hiking_entries FOR SELECT TO authenticated
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.hiking_records 
    WHERE id = shared_hiking_entries.hiking_record_id AND user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.hiking_record_shares 
    WHERE hiking_record_id = shared_hiking_entries.hiking_record_id 
    AND shared_with_user_id = auth.uid() 
    AND status = 'accepted'
  )
);

-- Users can insert their own entries on records they own or are shared with
CREATE POLICY "Users can insert own entries"
ON public.shared_hiking_entries FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (
    EXISTS (SELECT 1 FROM public.hiking_records WHERE id = shared_hiking_entries.hiking_record_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.hiking_record_shares WHERE hiking_record_id = shared_hiking_entries.hiking_record_id AND shared_with_user_id = auth.uid() AND status = 'accepted')
  )
);

-- Users can delete own entries
CREATE POLICY "Users can delete own entries"
ON public.shared_hiking_entries FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Users can update own entries
CREATE POLICY "Users can update own entries"
ON public.shared_hiking_entries FOR UPDATE TO authenticated
USING (auth.uid() = user_id);
