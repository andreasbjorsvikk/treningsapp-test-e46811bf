import { supabase } from '@/integrations/supabase/client';

export interface DbPeak {
  id: string;
  name_no: string;
  elevation_moh: number;
  area: string;
  description_no: string;
  image_url: string | null;
  latitude: number;
  longitude: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Convert DB peak to the Peak interface used by map components
export function dbPeakToLegacy(p: DbPeak) {
  return {
    id: p.id,
    name: p.name_no,
    heightMoh: p.elevation_moh,
    latitude: p.latitude,
    longitude: p.longitude,
    area: p.area,
    description: p.description_no || '',
    imageUrl: p.image_url,
    isPublished: p.is_published,
  };
}

export async function fetchPeaks(): Promise<DbPeak[]> {
  const { data, error } = await supabase
    .from('peaks_db' as any)
    .select('*')
    .order('name_no');
  if (error) throw error;
  return (data || []) as unknown as DbPeak[];
}

export async function createPeak(peak: Omit<DbPeak, 'id' | 'created_at' | 'updated_at'>): Promise<DbPeak> {
  const { data, error } = await supabase
    .from('peaks_db' as any)
    .insert(peak as any)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DbPeak;
}

export async function updatePeak(id: string, patch: Partial<DbPeak>): Promise<DbPeak> {
  const { data, error } = await supabase
    .from('peaks_db' as any)
    .update(patch as any)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as DbPeak;
}

export async function deletePeak(id: string): Promise<void> {
  const { error } = await supabase
    .from('peaks_db' as any)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function uploadPeakImage(peakId: string, file: File): Promise<string> {
  const path = `${peakId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from('peak-images').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('peak-images').getPublicUrl(path);
  return data.publicUrl;
}
