import { PrimaryGoalPeriod, GoalPeriod } from '@/types/workout';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'treningslogg_primary_goal_periods';
const LEGACY_KEY = 'treningslogg_primary_goal';

function loadPeriods(): PrimaryGoalPeriod[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
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

export function getMonthTarget(periods: PrimaryGoalPeriod[], year: number, month: number): number {
  const monthEnd = new Date(year, month + 1, 0);
  const goal = getActiveGoalForDate(periods, monthEnd);
  if (!goal) return 0;
  return convertGoalValue(goal.inputTarget, goal.inputPeriod, 'month');
}

export function getYearTarget(periods: PrimaryGoalPeriod[], year: number): number {
  let total = 0;
  for (let m = 0; m < 12; m++) {
    total += getMonthTarget(periods, year, m);
  }
  return Math.round(total * 10) / 10;
}

export function getEarliestStart(periods: PrimaryGoalPeriod[]): Date | null {
  if (periods.length === 0) return null;
  const s = sorted(periods);
  return new Date(s[0].validFrom);
}

export function getYearExpectedProgress(periods: PrimaryGoalPeriod[], year: number, refDate: Date): { target: number; expected: number; fractionElapsed: number } {
  const target = getYearTarget(periods, year);
  if (target === 0) return { target: 0, expected: 0, fractionElapsed: 0 };
  let expected = 0;
  for (let m = 0; m < 12; m++) {
    const mTarget = getMonthTarget(periods, year, m);
    const monthEnd = new Date(year, m + 1, 0);
    const monthStart = new Date(year, m, 1);
    if (refDate >= monthEnd) {
      expected += mTarget;
    } else if (refDate >= monthStart) {
      const daysInMonth = monthEnd.getDate();
      const dayOfMonth = refDate.getDate();
      expected += mTarget * (dayOfMonth / daysInMonth);
    }
  }
  const fractionElapsed = target > 0 ? expected / target : 0;
  return { target, expected, fractionElapsed };
}

export function getCurrentGoal(periods: PrimaryGoalPeriod[]): PrimaryGoalPeriod | null {
  return getActiveGoalForDate(periods, new Date());
}

// ========== Local service ==========
export const primaryGoalService = {
  getAll(): PrimaryGoalPeriod[] {
    return sorted(loadPeriods());
  },

  get(): PrimaryGoalPeriod | null {
    return getCurrentGoal(loadPeriods());
  },

  add(data: { inputPeriod: GoalPeriod; inputTarget: number; validFrom: string }): PrimaryGoalPeriod {
    const periods = loadPeriods();
    const existingIdx = periods.findIndex(p => p.validFrom === data.validFrom);
    if (existingIdx !== -1) {
      periods[existingIdx].inputPeriod = data.inputPeriod;
      periods[existingIdx].inputTarget = data.inputTarget;
      savePeriods(periods);
      return periods[existingIdx];
    }
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

  delete(id: string): void {
    const periods = loadPeriods().filter(p => p.id !== id);
    savePeriods(periods);
  },

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

  clear(): void {
    savePeriods([]);
  },

  set(data: { inputPeriod: GoalPeriod; inputTarget: number; startDate: string }): PrimaryGoalPeriod {
    return this.add({
      inputPeriod: data.inputPeriod,
      inputTarget: data.inputTarget,
      validFrom: data.startDate,
    });
  },
};

// ========== Supabase async service ==========
function rowToPeriod(row: any): PrimaryGoalPeriod {
  return {
    id: row.id,
    inputPeriod: row.input_period as GoalPeriod,
    inputTarget: row.input_target,
    validFrom: row.valid_from,
    createdAt: row.created_at,
  };
}

export const primaryGoalServiceAsync = {
  async getAll(userId: string): Promise<PrimaryGoalPeriod[]> {
    const { data, error } = await supabase
      .from('primary_goal_periods')
      .select('*')
      .eq('user_id', userId)
      .order('valid_from', { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToPeriod);
  },

  async add(userId: string, data: { inputPeriod: GoalPeriod; inputTarget: number; validFrom: string }): Promise<PrimaryGoalPeriod> {
    // Check if one exists with same validFrom
    const { data: existing } = await supabase
      .from('primary_goal_periods')
      .select('id')
      .eq('user_id', userId)
      .eq('valid_from', data.validFrom)
      .maybeSingle();

    if (existing) {
      await supabase.from('primary_goal_periods').update({
        input_period: data.inputPeriod,
        input_target: data.inputTarget,
      }).eq('id', existing.id);
      return { id: existing.id, inputPeriod: data.inputPeriod, inputTarget: data.inputTarget, validFrom: data.validFrom, createdAt: '' };
    }

    const { data: row, error } = await supabase
      .from('primary_goal_periods')
      .insert({
        user_id: userId,
        input_period: data.inputPeriod,
        input_target: data.inputTarget,
        valid_from: data.validFrom,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToPeriod(row);
  },

  async update(id: string, data: Partial<Pick<PrimaryGoalPeriod, 'inputPeriod' | 'inputTarget' | 'validFrom'>>): Promise<void> {
    const updateObj: any = {};
    if (data.inputPeriod !== undefined) updateObj.input_period = data.inputPeriod;
    if (data.inputTarget !== undefined) updateObj.input_target = data.inputTarget;
    if (data.validFrom !== undefined) updateObj.valid_from = data.validFrom;
    const { error } = await supabase.from('primary_goal_periods').update(updateObj).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('primary_goal_periods').delete().eq('id', id);
    if (error) throw error;
  },

  async clear(userId: string): Promise<void> {
    const { error } = await supabase.from('primary_goal_periods').delete().eq('user_id', userId);
    if (error) throw error;
  },
};
