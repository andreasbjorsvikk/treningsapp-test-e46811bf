import { PrimaryGoal, GoalPeriod } from '@/types/workout';

const STORAGE_KEY = 'treningslogg_primary_goal';

function load(): PrimaryGoal | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

function save(goal: PrimaryGoal | null): void {
  if (goal) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goal));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function convertGoalValue(value: number, from: GoalPeriod, to: GoalPeriod): number {
  let yearly: number;
  switch (from) {
    case 'week': yearly = value * 52; break;
    case 'month': yearly = value * 12; break;
    case 'year': yearly = value; break;
  }
  switch (to) {
    case 'week': return Math.round((yearly / 52) * 10) / 10;
    case 'month': return Math.round((yearly / 12) * 10) / 10;
    case 'year': return yearly;
  }
}

/**
 * Calculate pro-rated target for a period based on startDate.
 * If the goal starts mid-period, only a fraction of the target applies.
 */
export function getProratedTarget(goal: PrimaryGoal, period: GoalPeriod): number {
  const fullTarget = convertGoalValue(goal.inputTarget, goal.inputPeriod, period);
  const startDate = new Date(goal.startDate);
  const now = new Date();

  if (period === 'month') {
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const totalDays = periodEnd.getDate();
    
    if (startDate > periodEnd) return 0;
    if (startDate <= periodStart) return fullTarget;
    
    const effectiveDays = totalDays - startDate.getDate() + 1;
    return Math.round((fullTarget * effectiveDays / totalDays) * 10) / 10;
  }

  if (period === 'year') {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const totalDays = 365;
    
    if (startDate > yearEnd) return 0;
    if (startDate <= yearStart) return fullTarget;
    
    const dayOfYear = Math.floor((startDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
    const effectiveDays = totalDays - dayOfYear;
    return Math.round((fullTarget * effectiveDays / totalDays) * 10) / 10;
  }

  // week - just return full target (week is short enough)
  return fullTarget;
}

export const primaryGoalService = {
  get(): PrimaryGoal | null {
    return load();
  },

  set(data: Omit<PrimaryGoal, 'id' | 'createdAt'>): PrimaryGoal {
    const goal: PrimaryGoal = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    save(goal);
    return goal;
  },

  clear(): void {
    save(null);
  },

  getTargetForPeriod(period: GoalPeriod): number {
    const goal = load();
    if (!goal) return 0;
    return convertGoalValue(goal.inputTarget, goal.inputPeriod, period);
  },
};
