import { supabase } from '@/integrations/supabase/client';

export interface PeakSuggestion {
  id: string;
  submitted_by: string;
  name: string;
  elevation_moh: number | null;
  comment: string | null;
  latitude: number;
  longitude: number;
  user_latitude?: number | null;
  user_longitude?: number | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_comment: string | null;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export async function submitSuggestion(s: {
  submitted_by: string;
  name: string;
  elevation_moh?: number | null;
  comment?: string | null;
  latitude: number;
  longitude: number;
}): Promise<PeakSuggestion> {
  const { data, error } = await supabase
    .from('peak_suggestions' as any)
    .insert(s as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as PeakSuggestion;
}

export async function fetchSuggestions(): Promise<PeakSuggestion[]> {
  const { data, error } = await supabase
    .from('peak_suggestions' as any)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as PeakSuggestion[];
}

export async function reviewSuggestion(
  id: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  adminComment?: string
): Promise<void> {
  const { error } = await supabase
    .from('peak_suggestions' as any)
    .update({
      status,
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      admin_comment: adminComment || null,
    } as any)
    .eq('id', id);
  if (error) throw error;
}
