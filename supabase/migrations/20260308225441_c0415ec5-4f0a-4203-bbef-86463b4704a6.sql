
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS for user_roles: users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 5. Only admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. Create peaks_db table (DB-managed peaks)
CREATE TABLE public.peaks_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_no TEXT NOT NULL,
  elevation_moh INTEGER NOT NULL DEFAULT 0,
  area TEXT NOT NULL DEFAULT '',
  description_no TEXT DEFAULT '',
  image_url TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.peaks_db ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can see published peaks
CREATE POLICY "Anyone can view published peaks"
ON public.peaks_db FOR SELECT
TO authenticated
USING (is_published = true OR public.has_role(auth.uid(), 'admin'));

-- Only admins can insert/update/delete
CREATE POLICY "Admins can insert peaks"
ON public.peaks_db FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update peaks"
ON public.peaks_db FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete peaks"
ON public.peaks_db FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. Create peak_suggestions table
CREATE TABLE public.peak_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  elevation_moh INTEGER,
  comment TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.peak_suggestions ENABLE ROW LEVEL SECURITY;

-- Users can view their own suggestions, admins can see all
CREATE POLICY "Users can view own suggestions"
ON public.peak_suggestions FOR SELECT
TO authenticated
USING (auth.uid() = submitted_by OR public.has_role(auth.uid(), 'admin'));

-- Users can insert their own suggestions
CREATE POLICY "Users can insert suggestions"
ON public.peak_suggestions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = submitted_by);

-- Only admins can update suggestions (approve/reject)
CREATE POLICY "Admins can update suggestions"
ON public.peak_suggestions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete suggestions
CREATE POLICY "Admins can delete suggestions"
ON public.peak_suggestions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 8. Create storage bucket for peak images
INSERT INTO storage.buckets (id, name, public)
VALUES ('peak-images', 'peak-images', true);

-- Storage policies for peak images
CREATE POLICY "Anyone can view peak images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'peak-images');

CREATE POLICY "Admins can upload peak images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'peak-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update peak images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'peak-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete peak images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'peak-images' AND public.has_role(auth.uid(), 'admin'));

-- 9. Updated_at trigger for peaks_db
CREATE TRIGGER update_peaks_db_updated_at
  BEFORE UPDATE ON public.peaks_db
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
