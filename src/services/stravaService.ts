import { supabase } from '@/integrations/supabase/client';

const FUNCTION_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/strava`;

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

export const stravaService = {
  async getAuthUrl(): Promise<string> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=auth-url`, { headers });
    if (!res.ok) throw new Error('Failed to get auth URL');
    const data = await res.json();
    return data.url;
  },

  async getStatus(): Promise<{ connected: boolean; athlete_id?: number }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=status`, { headers });
    if (!res.ok) throw new Error('Failed to get status');
    return res.json();
  },

  async disconnect(): Promise<void> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=disconnect`, { method: 'POST', headers });
    if (!res.ok) throw new Error('Failed to disconnect');
  },

  async sync(): Promise<{ synced: number; total: number }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${FUNCTION_URL}?action=sync`, { method: 'POST', headers });
    if (!res.ok) throw new Error('Failed to sync');
    return res.json();
  },
};
