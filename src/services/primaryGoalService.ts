import { PrimaryGoalPeriod, GoalPeriod } from '@/types/workout';

const STORAGE_KEY = 'treningslogg_primary_goal_periods';
const LEGACY_KEY = 'treningslogg_primary_goal';

function loadPeriods(): PrimaryGoalPeriod[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }

  // Migrate legacy single goal
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const old = JSON.parse(legacy);
      const migrated: PrimaryGoalPeriod = {
        id: old.id || crypto.randomUUID(),
        inputPeriod: old.inputPeriod,
        inputTarget: old.inputTarget,
        validFrom: old.startDate,
        createdAt: old.createdAt,
      };
      savePeriods([migrated]);
      localStorage.removeItem(LEGACY_KEY);
      return [migrated];
    }
  } catch { /* ignore */ }

  return [];
}

function savePeriods(periods: PrimaryGoalPeriod[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
}

/** Sort periods by validFrom ascending */
function sorted(periods: PrimaryGoalPeriod[]): PrimaryGoalPeriod[] {
  return [...periods].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
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
 * Get the active goal period for a given date.
 * Returns the latest period whose validFrom <= date.
 */
export function getActiveGoalForDate(periods: PrimaryGoalPeriod[], date: Date): PrimaryGoalPeriod | null {
  const dateStr = date.toISOString().slice(0, 10);
  const s = sorted(periods);
  let active: PrimaryGoalPeriod | null = null;
  for (const p of s) {
    if (p.validFrom <= dateStr) active = p;
    else break;
  }
  return active;
}

/**
 * Get the target for a specific month, using the latest goal active during that month.
 * If a new goal starts mid-month, the full month uses the new goal's target (no pro-rata).
 */
export function getMonthTarget(periods: PrimaryGoalPeriod[], year: number, month: number): number {
  const monthEnd = new Date(year, month + 1, 0); // last day of month
  const goal = getActiveGoalForDate(periods, monthEnd);
  if (!goal) return 0;

  return convertGoalValue(goal.inputTarget, goal.inputPeriod, 'month');
}

/**
 * Get the year target by summing monthly targets across all 12 months.
 * Each month uses its own active goal period.
 */
export function getYearTarget(periods: PrimaryGoalPeriod[], year: number): number {
  let total = 0;
  for (let m = 0; m < 12; m++) {
    total += getMonthTarget(periods, year, m);
  }
  return Math.round(total * 10) / 10;
}

/**
 * Get the earliest validFrom date across all periods.
 */
export function getEarliestStart(periods: PrimaryGoalPeriod[]): Date | null {
  if (periods.length === 0) return null;
  const s = sorted(periods);
  return new Date(s[0].validFrom);
}

/**
 * Get expected year progress up to a reference date, accounting for multiple goal periods.
 */
export function getYearExpectedProgress(periods: PrimaryGoalPeriod[], year: number, refDate: Date): { target: number; expected: number; fractionElapsed: number } {
  const target = getYearTarget(periods, year);
  if (target === 0) return { target: 0, expected: 0, fractionElapsed: 0 };

  // Sum expected for each completed month + partial current month
  let expected = 0;
  for (let m = 0; m < 12; m++) {
    const mTarget = getMonthTarget(periods, year, m);
    const monthEnd = new Date(year, m + 1, 0);
    const monthStart = new Date(year, m, 1);

    if (refDate >= monthEnd) {
      // Full month elapsed
      expected += mTarget;
    } else if (refDate >= monthStart) {
      // Partial month
      const daysInMonth = monthEnd.getDate();
      const dayOfMonth = refDate.getDate();
      expected += mTarget * (dayOfMonth / daysInMonth);
    }
    // Future months: 0
  }

  const fractionElapsed = target > 0 ? expected / target : 0;
  return { target, expected, fractionElapsed };
}

/** For backward compat: get current active goal as a "PrimaryGoal-like" object */
export function getCurrentGoal(periods: PrimaryGoalPeriod[]): PrimaryGoalPeriod | null {
  return getActiveGoalForDate(periods, new Date());
}

export const primaryGoalService = {
  /** Get all goal periods sorted by validFrom */
  getAll(): PrimaryGoalPeriod[] {
    return sorted(loadPeriods());
  },

  /** Get the currently active goal */
  get(): PrimaryGoalPeriod | null {
    return getCurrentGoal(loadPeriods());
  },

  /** Add a new goal period */
  add(data: { inputPeriod: GoalPeriod; inputTarget: number; validFrom: string }): PrimaryGoalPeriod {
    const periods = loadPeriods();
    const newPeriod: PrimaryGoalPeriod = {
      id: crypto.randomUUID(),
      inputPeriod: data.inputPeriod,
      inputTarget: data.inputTarget,
      validFrom: data.validFrom,
      createdAt: new Date().toISOString(),
    };
    periods.push(newPeriod);
    savePeriods(periods);
    return newPeriod;
  },

  /** Delete a specific goal period by id only */
  delete(id: string): void {
    const periods = loadPeriods().filter(p => p.id !== id);
    savePeriods(periods);
  },

  /** Update a specific goal period */
  update(id: string, data: Partial<Pick<PrimaryGoalPeriod, 'inputPeriod' | 'inputTarget' | 'validFrom'>>): void {
    const periods = loadPeriods();
    const idx = periods.findIndex(p => p.id === id);
    if (idx !== -1) {
      if (data.inputPeriod !== undefined) periods[idx].inputPeriod = data.inputPeriod;
      if (data.inputTarget !== undefined) periods[idx].inputTarget = data.inputTarget;
      if (data.validFrom !== undefined) periods[idx].validFrom = data.validFrom;
      savePeriods(periods);
    }
  },

  /** Clear all goal periods */
  clear(): void {
    savePeriods([]);
  },

  /** Legacy compat: set replaces with a single period (used by form) */
  set(data: { inputPeriod: GoalPeriod; inputTarget: number; startDate: string }): PrimaryGoalPeriod {
    return this.add({
      inputPeriod: data.inputPeriod,
      inputTarget: data.inputTarget,
      validFrom: data.startDate,
    });
  },
};
