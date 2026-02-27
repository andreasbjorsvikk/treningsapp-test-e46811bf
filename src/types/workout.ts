export type SessionType = 
  | 'styrke' 
  | 'løping' 
  | 'fjelltur' 
  | 'svømming' 
  | 'sykling' 
  | 'gå' 
  | 'tennis' 
  | 'yoga'
  | 'annet';

export interface WorkoutSession {
  id: string;
  type: SessionType;
  title?: string; // optional manual name
  date: string; // ISO date
  durationMinutes: number;
  distance?: number; // km
  elevationGain?: number; // meters
  notes?: string;
  userId?: string;
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
  totalDistance: number;
  sessionsByType: Record<SessionType, number>;
}

export type GoalMetric = 'sessions' | 'minutes' | 'distance' | 'elevation';
export type GoalPeriod = 'week' | 'month' | 'year';

export interface WorkoutGoal {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod;
  activityType: SessionType | 'all';
  target: number;
  createdAt: string;
}
