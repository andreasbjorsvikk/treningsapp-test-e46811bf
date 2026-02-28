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
  title?: string;
  date: string;
  durationMinutes: number;
  distance?: number;
  elevationGain?: number;
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

export interface PrimaryGoal {
  id: string;
  inputPeriod: GoalPeriod;
  inputTarget: number;
  startDate: string; // ISO date - when the goal starts
  createdAt: string;
}

export interface ExtraGoal {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod | 'custom';
  activityType: SessionType | 'all';
  target: number;
  customStart?: string;
  customEnd?: string;
  showOnHome?: boolean;
  createdAt: string;
}
