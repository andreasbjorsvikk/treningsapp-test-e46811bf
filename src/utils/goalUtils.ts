import { WorkoutSession, WorkoutGoal, ExtraGoal, GoalMetric, GoalPeriod, SessionType } from '@/types/workout';

export function getSessionsInPeriod(
  sessions: WorkoutSession[],
  period: GoalPeriod | 'custom',
  activityType: string, // 'all' | single type | comma-separated
  customStart?: string,
  customEnd?: string
): WorkoutSession[] {
  const now = new Date();
  
  // Filter by activity type(s)
  let filtered: WorkoutSession[];
  if (activityType === 'all') {
    filtered = sessions;
  } else if (activityType.includes(',')) {
    const types = activityType.split(',');
    filtered = sessions.filter(s => types.includes(s.type));
  } else {
    filtered = sessions.filter(s => s.type === activityType);
  }

  if (period === 'custom' && customStart && customEnd) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter(s => {
      const d = new Date(s.date);
      return d >= start && d <= end;
    });
  } else if (period === 'week') {
    const day = now.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    filtered = filtered.filter(s => new Date(s.date) >= monday);
  } else if (period === 'month') {
    filtered = filtered.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  } else {
    filtered = filtered.filter(s => new Date(s.date).getFullYear() === now.getFullYear());
  }

  return filtered;
}

export function computeProgress(sessions: WorkoutSession[], metric: GoalMetric): number {
  switch (metric) {
    case 'sessions': return sessions.filter(s => !s.excludeFromCount).length;
    case 'minutes': return sessions.reduce((s, w) => s + w.durationMinutes / 60, 0);
    case 'distance': return sessions.reduce((s, w) => s + (w.distance || 0), 0);
    case 'elevation': return sessions.reduce((s, w) => s + (w.elevationGain || 0), 0);
  }
}

export const metricLabels: Record<GoalMetric, string> = {
  sessions: 'økter',
  minutes: 'timer',
  distance: 'km',
  elevation: 'm',
};

export function findGoalForPeriod(goals: WorkoutGoal[], period: GoalPeriod): WorkoutGoal | null {
  const periodGoals = goals.filter(g => g.period === period);
  if (periodGoals.length === 0) return null;
  const preferred = periodGoals.find(g => g.metric === 'sessions' && g.activityType === 'all');
  return preferred || periodGoals[0];
}

export function getDaysRemainingInPeriod(period: GoalPeriod | 'custom', customEnd?: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (period === 'custom' && customEnd) {
    const end = new Date(customEnd);
    end.setHours(0, 0, 0, 0);
    return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }

  if (period === 'week') {
    const day = now.getDay();
    return day === 0 ? 0 : 7 - day;
  }

  if (period === 'month') {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return lastDay - now.getDate();
  }

  // year
  const lastDay = new Date(now.getFullYear(), 11, 31);
  return Math.ceil((lastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function getPeriodFractionElapsed(period: GoalPeriod | 'custom', customStart?: string, customEnd?: string): number {
  const now = new Date();

  if (period === 'custom' && customStart && customEnd) {
    const start = new Date(customStart).getTime();
    const end = new Date(customEnd).getTime();
    if (end <= start) return 1;
    return Math.min(1, Math.max(0, (now.getTime() - start) / (end - start)));
  }

  if (period === 'week') {
    const day = now.getDay();
    const daysSinceMonday = day === 0 ? 6 : day - 1;
    return (daysSinceMonday + now.getHours() / 24) / 7;
  }

  if (period === 'month') {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return (now.getDate() - 1 + now.getHours() / 24) / daysInMonth;
  }

  // year
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear() + 1, 0, 1).getTime();
  return (now.getTime() - start) / (end - start);
}