
-- Add emoji column to child_profiles
ALTER TABLE public.child_profiles ADD COLUMN emoji text NOT NULL DEFAULT '👶';

-- Create shared child access table for multi-parent support
CREATE TABLE public.child_shared_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(child_id, shared_with_user_id)
);

ALTER TABLE public.child_shared_access ENABLE ROW LEVEL SECURITY;

-- Owner (parent) and shared users can view shared access records for their children
CREATE POLICY "Parents can view shared access for own children"
  ON public.child_shared_access FOR SELECT TO authenticated
  USING (
    invited_by = auth.uid() 
    OR shared_with_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.child_profiles WHERE id = child_id AND parent_user_id = auth.uid())
  );

-- Only the parent can invite others
CREATE POLICY "Parents can insert shared access"
  ON public.child_shared_access FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.child_profiles WHERE id = child_id AND parent_user_id = auth.uid())
  );

-- Parent can delete shared access
CREATE POLICY "Parents can delete shared access"
  ON public.child_shared_access FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.child_profiles WHERE id = child_id AND parent_user_id = auth.uid())
  );

-- Shared user can update (accept/decline)
CREATE POLICY "Shared users can update status"
  ON public.child_shared_access FOR UPDATE TO authenticated
  USING (shared_with_user_id = auth.uid());

-- Update is_parent_of to also check shared access
CREATE OR REPLACE FUNCTION public.is_parent_of(_parent_id uuid, _child_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.child_profiles
    WHERE parent_user_id = _parent_id AND id = _child_id
  ) OR EXISTS (
    SELECT 1 FROM public.child_shared_access
    WHERE shared_with_user_id = _parent_id AND child_id = _child_id AND status = 'accepted'
  )
$$;
