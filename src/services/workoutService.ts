import { WorkoutSession, WeeklyStats, SessionType } from '@/types/workout';
import { mockSessions } from '@/data/mockSessions';
import { allSessionTypes } from '@/utils/workoutUtils';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'treningslogg_sessions';

function loadLocalSessions(): WorkoutSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  saveLocalSessions(mockSessions);
  return [...mockSessions];
}

function saveLocalSessions(sessions: WorkoutSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

function computeStats(subset: WorkoutSession[]): WeeklyStats {
  const sessionsByType = {} as Record<SessionType, number>;
  allSessionTypes.forEach(t => { sessionsByType[t] = 0; });
  subset.forEach(s => { sessionsByType[s.type]++; });
  return {
    totalSessions: subset.length,
    totalMinutes: subset.reduce((sum, s) => sum + s.durationMinutes, 0),
    totalDistance: subset.reduce((sum, s) => sum + (s.distance || 0), 0),
    totalElevation: subset.reduce((sum, s) => sum + (s.elevationGain || 0), 0),
    sessionsByType,
  };
}

// Map DB row to WorkoutSession
function rowToSession(row: any): WorkoutSession {
  return {
    id: row.id,
    type: row.type as SessionType,
    title: row.title || undefined,
    date: row.date,
    durationMinutes: row.duration_minutes,
    distance: row.distance || undefined,
    elevationGain: row.elevation_gain || undefined,
    notes: row.notes || undefined,
    userId: row.user_id,
    averageHeartrate: row.average_heartrate || undefined,
    maxHeartrate: row.max_heartrate || undefined,
    summaryPolyline: row.summary_polyline || undefined,
    stravaActivityId: row.strava_activity_id || undefined,
  };
}

// ========== Supabase-backed async service ==========
export const workoutServiceAsync = {
  async getAll(userId: string): Promise<WorkoutSession[]> {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToSession);
  },

  async add(userId: string, session: Omit<WorkoutSession, 'id'>): Promise<WorkoutSession> {
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: userId,
        type: session.type,
        title: session.title || null,
        date: session.date,
        duration_minutes: session.durationMinutes,
        distance: session.distance || null,
        elevation_gain: session.elevationGain || null,
        notes: session.notes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToSession(data);
  },

  async update(id: string, data: Partial<Omit<WorkoutSession, 'id'>>): Promise<void> {
    const updateObj: any = {};
    if (data.type !== undefined) updateObj.type = data.type;
    if (data.title !== undefined) updateObj.title = data.title || null;
    if (data.date !== undefined) updateObj.date = data.date;
    if (data.durationMinutes !== undefined) updateObj.duration_minutes = data.durationMinutes;
    if (data.distance !== undefined) updateObj.distance = data.distance || null;
    if (data.elevationGain !== undefined) updateObj.elevation_gain = data.elevationGain || null;
    if (data.notes !== undefined) updateObj.notes = data.notes || null;
    const { error } = await supabase
      .from('workout_sessions')
      .update(updateObj)
      .eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};

// ========== Local (offline / not logged in) service ==========
let sessions: WorkoutSession[] = loadLocalSessions();

export const workoutService = {
  getAll(): WorkoutSession[] {
    return [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getById(id: string): WorkoutSession | undefined {
    return sessions.find(s => s.id === id);
  },

  getByType(type: SessionType): WorkoutSession[] {
    return this.getAll().filter(s => s.type === type);
  },

  getByDate(dateStr: string): WorkoutSession[] {
    return this.getAll().filter(s => s.date.startsWith(dateStr));
  },

  add(session: Omit<WorkoutSession, 'id'>): WorkoutSession {
    const newSession: WorkoutSession = { ...session, id: crypto.randomUUID() };
    sessions = [newSession, ...sessions];
    saveLocalSessions(sessions);
    return newSession;
  },

  update(id: string, data: Partial<Omit<WorkoutSession, 'id'>>): WorkoutSession | undefined {
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    sessions[idx] = { ...sessions[idx], ...data };
    saveLocalSessions(sessions);
    return sessions[idx];
  },

  delete(id: string): void {
    sessions = sessions.filter(s => s.id !== id);
    saveLocalSessions(sessions);
  },

  exportAll(): WorkoutSession[] {
    return [...sessions];
  },

  importMerge(newSessions: WorkoutSession[]): number {
    const existingIds = new Set(sessions.map(s => s.id));
    const toAdd = newSessions.filter(s => !existingIds.has(s.id));
    sessions = [...sessions, ...toAdd];
    saveLocalSessions(sessions);
    return toAdd.length;
  },

  importReplace(newSessions: WorkoutSession[]): void {
    sessions = [...newSessions];
    saveLocalSessions(sessions);
  },

  getWeeklyStats(): WeeklyStats {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return computeStats(sessions.filter(s => new Date(s.date) >= weekAgo));
  },

  getMonthlyStats(): WeeklyStats {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return computeStats(sessions.filter(s => new Date(s.date) >= monthStart));
  },
};

// Utility to compute stats from any session array
export function computeStatsFromSessions(sessions: WorkoutSession[]): {
  weekly: WeeklyStats;
  monthly: WeeklyStats;
} {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    weekly: computeStats(sessions.filter(s => new Date(s.date) >= weekAgo)),
    monthly: computeStats(sessions.filter(s => new Date(s.date) >= monthStart)),
  };
}
