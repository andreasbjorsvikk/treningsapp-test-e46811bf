import { supabase } from '@/integrations/supabase/client';

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
    .from('peak_checkins' as any)
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || []) as unknown as PeakCheckin[];
}

export async function checkinPeak(userId: string, peakId: string, checkedInAt?: string): Promise<PeakCheckin> {
  const payload: any = { user_id: userId, peak_id: peakId };
  if (checkedInAt) {
    payload.checked_in_at = checkedInAt;
  }
  
  const { data, error } = await supabase
    .from('peak_checkins' as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PeakCheckin;
}

export async function deleteCheckin(checkinId: string): Promise<void> {
  const { error } = await supabase
    .from('peak_checkins' as any)
    .delete()
    .eq('id', checkinId);
  if (error) throw error;
}

export async function adminCheckinPeak(targetUserId: string, peakId: string, checkedInAt: string): Promise<PeakCheckin> {
  const { data, error } = await supabase
    .from('peak_checkins' as any)
    .insert({ user_id: targetUserId, peak_id: peakId, checked_in_at: checkedInAt })
    .select()
    .single();
  if (error) throw error;
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
  const { data, error } = await supabase
    .from('peak_checkins' as any)
    .select('*, profiles:user_id(username, avatar_url)')
    .eq('peak_id', peakId)
    .order('checked_in_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as CheckinWithProfile[];
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
