import { PrimaryGoalPeriod } from '@/types/workout';
import { getMonthTarget, getYearExpectedProgress, getActiveGoalForDate, getEarliestStart } from '@/services/primaryGoalService';
import { WorkoutSession } from '@/types/workout';

/**
 * Compute month wheel data for versioned goal periods.
 * Only counts sessions from the active goal's validFrom date onwards.
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
  const monthEnd = new Date(year, month + 1, 0);
  const activeGoal = getActiveGoalForDate(periods, monthEnd);
  const goalStart = activeGoal ? new Date(activeGoal.validFrom) : null;
  if (goalStart) goalStart.setHours(0, 0, 0, 0);

  const current = sessions.filter(s => {
    const d = new Date(s.date);
    if (d.getMonth() !== month || d.getFullYear() !== year) return false;
    // Only count sessions from goal start date onwards
    if (goalStart && d < goalStart) return false;
    return true;
  }).length;
  const percent = target === 0 ? 0 : (current / target) * 100;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();
  // Use fractional day progress for more precise marker placement
  // e.g. at noon on day 15 of 30 = (14 + 0.5) / 30 = 0.4833
  const expectedFraction = isCurrentMonth
    ? ((now.getDate() - 1) + now.getHours() / 24) / daysInMonth
    : 1;
  const expected = target * expectedFraction;
  const diff = current - expected;
  return { current, target: Math.round(target * 10) / 10, percent, unit: unitLabel, expectedFraction, diff };
}

/**
 * Compute year wheel data for versioned goal periods.
 * Only counts sessions from the earliest goal's validFrom date onwards.
 */
export function computeYearWheelData(
  periods: PrimaryGoalPeriod[],
  sessions: WorkoutSession[],
  year: number,
  now: Date,
  unitLabel: string
) {
  const earliestStart = getEarliestStart(periods);
  const current = sessions.filter(s => {
    const d = new Date(s.date);
    if (d.getFullYear() !== year) return false;
    // Only count sessions from the earliest goal start date onwards
    if (earliestStart && d < earliestStart) return false;
    return true;
  }).length;
  const refDate = year === now.getFullYear() ? now : new Date(year + 1, 0, 1);
  const { target, expected, fractionElapsed } = getYearExpectedProgress(periods, year, refDate);
  const diff = current - expected;
  const percent = target === 0 ? 0 : (current / target) * 100;
  return { current, target: Math.round(target), diff, expected, unit: unitLabel, expectedFraction: fractionElapsed, percent };
}
