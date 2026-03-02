export type SessionType = 
  | 'styrke' 
  | 'løping' 
  | 'fjelltur' 
  | 'svømming' 
  | 'sykling' 
  | 'gå' 
  | 'tennis' 
  | 'yoga'
  | 'fotball'
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
  totalElevation: number;
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

export interface PrimaryGoalPeriod {
  id: string;
  inputPeriod: GoalPeriod;
  inputTarget: number;
  validFrom: string; // ISO date - when this goal period starts
  createdAt: string;
}

/** @deprecated Use PrimaryGoalPeriod[] instead */
export interface PrimaryGoal {
  id: string;
  inputPeriod: GoalPeriod;
  inputTarget: number;
  startDate: string;
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

export type HealthEventType = 'sickness' | 'injury';

export interface HealthEvent {
  id: string;
  type: HealthEventType;
  dateFrom: string; // ISO date
  dateTo?: string;  // ISO date
  notes?: string;
}
