import { WorkoutSession, WeeklyStats, SessionType } from '@/types/workout';
import { mockSessions } from '@/data/mockSessions';

// In-memory store – will be replaced by DB calls later
let sessions: WorkoutSession[] = [...mockSessions];

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

  add(session: Omit<WorkoutSession, 'id'>): WorkoutSession {
    const newSession: WorkoutSession = {
      ...session,
      id: crypto.randomUUID(),
    };
    sessions = [newSession, ...sessions];
    return newSession;
  },

  delete(id: string): void {
    sessions = sessions.filter(s => s.id !== id);
  },

  getWeeklyStats(): WeeklyStats {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const weekSessions = sessions.filter(s => new Date(s.date) >= weekAgo);

    const sessionsByType = {} as Record<SessionType, number>;
    const allTypes: SessionType[] = ['strength', 'running', 'cycling', 'swimming', 'yoga', 'hiit', 'walking', 'skiing', 'other'];
    allTypes.forEach(t => { sessionsByType[t] = 0; });
    weekSessions.forEach(s => { sessionsByType[s.type]++; });

    return {
      totalSessions: weekSessions.length,
      totalMinutes: weekSessions.reduce((sum, s) => sum + s.durationMinutes, 0),
      totalCalories: weekSessions.reduce((sum, s) => sum + (s.caloriesBurned || 0), 0),
      totalDistance: weekSessions.reduce((sum, s) => sum + (s.distance || 0), 0),
      sessionsByType,
    };
  },
};
