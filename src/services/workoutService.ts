import { WorkoutSession, WeeklyStats, SessionType } from '@/types/workout';
import { mockSessions } from '@/data/mockSessions';
import { allSessionTypes } from '@/utils/workoutUtils';

const STORAGE_KEY = 'treningslogg_sessions';

function loadSessions(): WorkoutSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  // First run: seed with mock data
  saveSessions(mockSessions);
  return [...mockSessions];
}

function saveSessions(sessions: WorkoutSession[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

let sessions: WorkoutSession[] = loadSessions();

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
    const newSession: WorkoutSession = {
      ...session,
      id: crypto.randomUUID(),
    };
    sessions = [newSession, ...sessions];
    saveSessions(sessions);
    return newSession;
  },

  update(id: string, data: Partial<Omit<WorkoutSession, 'id'>>): WorkoutSession | undefined {
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    sessions[idx] = { ...sessions[idx], ...data };
    saveSessions(sessions);
    return sessions[idx];
  },

  delete(id: string): void {
    sessions = sessions.filter(s => s.id !== id);
    saveSessions(sessions);
  },

  exportAll(): WorkoutSession[] {
    return [...sessions];
  },

  importMerge(newSessions: WorkoutSession[]): number {
    const existingIds = new Set(sessions.map(s => s.id));
    const toAdd = newSessions.filter(s => !existingIds.has(s.id));
    sessions = [...sessions, ...toAdd];
    saveSessions(sessions);
    return toAdd.length;
  },

  importReplace(newSessions: WorkoutSession[]): void {
    sessions = [...newSessions];
    saveSessions(sessions);
  },

  getWeeklyStats(): WeeklyStats {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekSessions = sessions.filter(s => new Date(s.date) >= weekAgo);

    const sessionsByType = {} as Record<SessionType, number>;
    allSessionTypes.forEach(t => { sessionsByType[t] = 0; });
    weekSessions.forEach(s => { sessionsByType[s.type]++; });

    return {
      totalSessions: weekSessions.length,
      totalMinutes: weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0),
      totalDistance: weekSessions.reduce((sum, s) => sum + (s.distance || 0), 0),
      totalElevation: weekSessions.reduce((sum, s) => sum + (s.elevationGain || 0), 0),
      sessionsByType,
    };
  },
};
