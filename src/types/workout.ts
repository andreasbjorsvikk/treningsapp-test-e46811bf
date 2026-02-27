export type SessionType = 
  | 'strength' 
  | 'running' 
  | 'cycling' 
  | 'swimming' 
  | 'yoga' 
  | 'hiit' 
  | 'walking' 
  | 'skiing'
  | 'other';

export interface WorkoutSession {
  id: string;
  type: SessionType;
  title: string;
  date: string; // ISO date
  durationMinutes: number;
  caloriesBurned?: number;
  distance?: number; // km
  notes?: string;
  feeling: 1 | 2 | 3 | 4 | 5; // 1=dårlig, 5=fantastisk
  userId?: string; // for future multi-user support
}

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface WeeklyStats {
  totalSessions: number;
  totalMinutes: number;
  totalCalories: number;
  totalDistance: number;
  sessionsByType: Record<SessionType, number>;
}
