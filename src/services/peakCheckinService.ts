import { supabase } from '@/integrations/supabase/client';
import { enqueue } from '@/services/syncQueue';

export interface PeakCheckin {
  id: string;
  user_id: string;
  peak_id: string;
  checked_in_at: string;
  verified: boolean;
  activity_id: string | null;
}

export async function getUserCheckins(userId: string): Promise<PeakCheckin[]> {
  const { data, error } = await supabase
    .from('peak_checkins')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []) as unknown as PeakCheckin[];
}

export async function checkinPeak(userId: string, peakId: string, checkedInAt?: string, imageFile?: File | null, checkedInBy?: string): Promise<PeakCheckin> {
  const payload: any = { user_id: userId, peak_id: peakId };
  if (checkedInAt) {
    payload.checked_in_at = checkedInAt;
  }
  // Track who performed the checkin (for child checkins)
  if (checkedInBy) {
    payload.checked_in_by = checkedInBy;
  }

  // Upload image if provided
  if (imageFile) {
    const ext = imageFile.name.split('.').pop() || 'jpg';
    const path = `${userId}/${peakId}/${Date.now()}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from('peak-images')
      .upload(path, imageFile, { contentType: imageFile.type, upsert: false });
    if (uploadErr) throw uploadErr;
    const { data: urlData } = supabase.storage.from('peak-images').getPublicUrl(path);
    payload.image_url = urlData.publicUrl;
  }
  
  const { data, error } = await supabase
    .from('peak_checkins')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PeakCheckin;
}

export async function updateCheckinImage(checkinId: string, userId: string, imageFile: File): Promise<string> {
  const ext = imageFile.name.split('.').pop() || 'jpg';
  const path = `${userId}/${checkinId}/${Date.now()}.${ext}`;
  const { error: uploadErr } = await supabase.storage
    .from('peak-images')
    .upload(path, imageFile, { contentType: imageFile.type, upsert: false });
  if (uploadErr) throw uploadErr;
  const { data: urlData } = supabase.storage.from('peak-images').getPublicUrl(path);
  const imageUrl = urlData.publicUrl;

  const { error } = await supabase
    .from('peak_checkins')
    .update({ image_url: imageUrl })
    .eq('id', checkinId);
  if (error) throw error;
  return imageUrl;
}

export async function deleteCheckin(checkinId: string): Promise<void> {
  const { error } = await supabase
    .from('peak_checkins')
    .delete()
    .eq('id', checkinId);
  if (error) throw error;
}

export async function adminCheckinPeak(targetUserId: string, peakId: string, checkedInAt: string): Promise<PeakCheckin> {
  console.log('adminCheckinPeak called:', { targetUserId, peakId, checkedInAt });
  
  // Verify current auth session
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  console.log('Current auth user:', currentUser?.id);
  
  const { data, error } = await supabase
    .from('peak_checkins')
    .insert({ user_id: targetUserId, peak_id: peakId, checked_in_at: checkedInAt })
    .select()
    .single();
  
  if (error) {
    console.error('Supabase insert error:', JSON.stringify(error, null, 2));
    throw error;
  }
  console.log('Checkin inserted successfully:', data);
  return data as unknown as PeakCheckin;
}

export async function searchProfiles(query: string): Promise<{ id: string; username: string | null; avatar_url: string | null }[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${query}%`)
    .limit(10);
  if (error) throw error;
  return data || [];
}

export interface CheckinWithProfile extends PeakCheckin {
  profiles?: { username: string | null; avatar_url: string | null } | null;
}

export async function getAllCheckinsForPeak(peakId: string): Promise<CheckinWithProfile[]> {
  // First get all checkins for this peak
  const { data: checkins, error } = await supabase
    .from('peak_checkins')
    .select('*')
    .eq('peak_id', peakId)
    .order('checked_in_at', { ascending: false });
  if (error) throw error;
  
  if (!checkins || checkins.length === 0) return [];
  
  // Get unique user IDs
  const userIds = [...new Set(checkins.map((c: any) => c.user_id))];
  
  // Fetch profiles for these users
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);
  if (profilesError) throw profilesError;
  
  // Map profiles to checkins
  const profileMap = new Map((profiles || []).map(p => [p.id, p]));
  
  return checkins.map((checkin: any) => ({
    ...checkin,
    profiles: profileMap.get(checkin.user_id) || null
  })) as CheckinWithProfile[];
}

export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
