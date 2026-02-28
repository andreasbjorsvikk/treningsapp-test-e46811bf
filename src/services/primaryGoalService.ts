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
  // Convert to yearly first, then to target period
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
