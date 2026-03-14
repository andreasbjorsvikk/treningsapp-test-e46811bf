import { supabase } from '@/integrations/supabase/client';

export interface ChildProfile {
  id: string;
  parent_user_id: string;
  name: string;
  avatar_url: string | null;
  emoji: string;
  created_at: string;
  updated_at: string;
}

export async function getChildProfiles(parentUserId: string): Promise<ChildProfile[]> {
  const { data, error } = await supabase
    .from('child_profiles')
    .select('*')
    .eq('parent_user_id', parentUserId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as ChildProfile[];
}

export async function getSharedChildProfiles(userId: string): Promise<ChildProfile[]> {
  const { data: access, error: accessErr } = await supabase
    .from('child_shared_access')
    .select('child_id')
    .eq('shared_with_user_id', userId)
    .eq('status', 'accepted');
  if (accessErr) throw accessErr;
  if (!access || access.length === 0) return [];

  const childIds = access.map((a: any) => a.child_id);
  const { data, error } = await supabase
    .from('child_profiles')
    .select('*')
    .in('id', childIds);
  if (error) throw error;
  return (data || []) as unknown as ChildProfile[];
}

export async function createChildProfile(parentUserId: string, name: string, emoji: string = '👶'): Promise<ChildProfile> {
  const { data, error } = await supabase
    .from('child_profiles')
    .insert({ parent_user_id: parentUserId, name, emoji })
    .select()
    .single();
  if (error) throw error;
  return data as unknown as ChildProfile;
}

export async function updateChildProfile(childId: string, updates: { name?: string; avatar_url?: string | null; emoji?: string }): Promise<void> {
  const { error } = await supabase
    .from('child_profiles')
    .update(updates)
    .eq('id', childId);
  if (error) throw error;
}

export async function deleteChildProfile(childId: string): Promise<void> {
  // Also delete child's checkins
  await supabase
    .from('peak_checkins')
    .delete()
    .eq('user_id', childId);
  
  const { error } = await supabase
    .from('child_profiles')
    .delete()
    .eq('id', childId);
  if (error) throw error;
}

export async function uploadChildAvatar(childId: string, parentUserId: string, file: File): Promise<string> {
  const path = `children/${parentUserId}/${childId}/avatar.png`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;
  await updateChildProfile(childId, { avatar_url: url });
  return url;
}

export async function getAllChildProfiles(): Promise<ChildProfile[]> {
  const { data, error } = await supabase
    .from('child_profiles')
    .select('*');
  if (error) throw error;
  return (data || []) as unknown as ChildProfile[];
}
