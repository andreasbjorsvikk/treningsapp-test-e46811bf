import { PrimaryGoalPeriod } from '@/types/workout';
import { getMonthTarget, getYearTarget, getYearExpectedProgress, getEarliestStart } from '@/services/primaryGoalService';
import { WorkoutSession } from '@/types/workout';

/**
 * Compute month wheel data for versioned goal periods.
 */
export function computeMonthWheelData(
  periods: PrimaryGoalPeriod[],
  sessions: WorkoutSession[],
  month: number,
  year: number,
  now: Date,
  unitLabel: string
) {
  const target = getMonthTarget(periods, year, month);
  const earliest = getEarliestStart(periods);
  const current = sessions.filter(s => {
    const d = new Date(s.date);
    if (d.getMonth() !== month || d.getFullYear() !== year) return false;
    if (earliest && d < earliest) return false;
    return true;
  }).length;
  const percent = target === 0 ? 0 : (current / target) * 100;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  const expectedFraction = isCurrentMonth ? now.getDate() / daysInMonth : 1;
  const expected = target * expectedFraction;
  const diff = current - expected;
  return { current, target: Math.round(target * 10) / 10, percent, unit: unitLabel, expectedFraction, diff };
}

/**
 * Compute year wheel data for versioned goal periods.
 */
export function computeYearWheelData(
  periods: PrimaryGoalPeriod[],
  sessions: WorkoutSession[],
  year: number,
  now: Date,
  unitLabel: string
) {
  const earliest = getEarliestStart(periods);
  const current = sessions.filter(s => {
    const d = new Date(s.date);
    if (d.getFullYear() !== year) return false;
    if (earliest && d < earliest) return false;
    return true;
  }).length;
  const refDate = year === now.getFullYear() ? now : new Date(year + 1, 0, 1);
  const { target, expected, fractionElapsed } = getYearExpectedProgress(periods, year, refDate);
  const diff = current - expected;
  const percent = target === 0 ? 0 : (current / target) * 100;
  return { current, target: Math.round(target), diff, expected, unit: unitLabel, expectedFraction: fractionElapsed, percent };
}
