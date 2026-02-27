import { WorkoutSession, WorkoutGoal, GoalMetric, GoalPeriod, SessionType } from '@/types/workout';

export function getSessionsInPeriod(
  sessions: WorkoutSession[],
  period: GoalPeriod,
  activityType: SessionType | 'all'
): WorkoutSession[] {
  const now = new Date();
  let filtered = activityType === 'all' ? sessions : sessions.filter(s => s.type === activityType);

  if (period === 'week') {
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
    case 'sessions': return sessions.length;
    case 'minutes': return sessions.reduce((s, w) => s + w.durationMinutes, 0);
    case 'distance': return sessions.reduce((s, w) => s + (w.distance || 0), 0);
    case 'elevation': return sessions.reduce((s, w) => s + (w.elevationGain || 0), 0);
  }
}

export const metricLabels: Record<GoalMetric, string> = {
  sessions: 'økter',
  minutes: 'min',
  distance: 'km',
  elevation: 'm',
};

/**
 * Find the best goal for a given period (month or year).
 * Prefers 'sessions' metric with 'all' activity type, but returns first match otherwise.
 */
export function findGoalForPeriod(goals: WorkoutGoal[], period: GoalPeriod): WorkoutGoal | null {
  const periodGoals = goals.filter(g => g.period === period);
  if (periodGoals.length === 0) return null;
  // Prefer sessions + all
  const preferred = periodGoals.find(g => g.metric === 'sessions' && g.activityType === 'all');
  return preferred || periodGoals[0];
}
