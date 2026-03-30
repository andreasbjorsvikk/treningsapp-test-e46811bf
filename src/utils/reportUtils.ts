import { WorkoutSession, ExtraGoal, PrimaryGoalPeriod, SessionType } from '@/types/workout';
import { computeProgress, getSessionsInPeriod } from '@/utils/goalUtils';
import { allSessionTypes } from '@/utils/workoutUtils';

export interface ReportData {
  period: 'week' | 'month';
  periodLabel: string;
  sessions: WorkoutSession[];
  totalSessions: number;
  totalMinutes: number;
  totalDistance: number;
  totalElevation: number;
  sessionsByType: Record<string, number>;
  // Fun facts / records
  funFacts: string[];
  // Primary goal data
  primaryGoalTarget: number | null;
  primaryGoalCurrent: number | null;
  primaryGoalUnit: string;
  // Extra goals for this period
  extraGoals: { goal: ExtraGoal; current: number; reached: boolean }[];
  // Challenge results (placeholder - will be populated from community)
  challenges: { name: string; rank: number; total: number; progress: number; target: number; leaderboard: { username: string; avatarUrl: string | null; progress: number }[] }[];
}

export function computeWeeklyReport(
  allSessions: WorkoutSession[],
  primaryGoals: PrimaryGoalPeriod[],
  extraGoals: ExtraGoal[],
  allTimeSessionsForRecords: WorkoutSession[]
): ReportData {
  const now = new Date();
  // Always show the PREVIOUS completed week (Mon-Sun).
  // On Sunday evening we still show the week ending that Sunday.
  // On Monday we show the week that just ended (previous Mon-Sun).
  const dayOfWeek = now.getDay(); // 0=Sun
  // Calculate the Sunday that ends the target week
  let targetSunday: Date;
  if (dayOfWeek === 0) {
    // It's Sunday — target is today
    targetSunday = new Date(now);
  } else {
    // Mon-Sat — target is previous Sunday
    targetSunday = new Date(now);
    targetSunday.setDate(now.getDate() - dayOfWeek);
  }
  const monday = new Date(targetSunday);
  monday.setDate(targetSunday.getDate() - 6);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(targetSunday);
  sunday.setHours(23, 59, 59, 999);

  const weekSessions = allSessions.filter(s => {
    const d = new Date(s.date);
    return d >= monday && d <= sunday;
  });

  const stats = computeBasicStats(weekSessions);
  const funFacts = computeFunFacts('week', weekSessions, allTimeSessionsForRecords, now);

  // Weekly extra goals
  const weekGoals = extraGoals.filter(g => !g.archived && g.period === 'week');
  const goalResults = weekGoals.map(g => {
    const periodSessions = getSessionsInPeriod(allSessions, 'week', g.activityType, g.customStart, g.customEnd);
    const current = computeProgress(periodSessions, g.metric);
    return { goal: g, current, reached: current >= g.target };
  });

  const weekLabel = `${monday.getDate()}.${monday.getMonth() + 1} – ${sunday.getDate()}.${sunday.getMonth() + 1}`;

  return {
    period: 'week',
    periodLabel: `Uke ${getWeekNumber(targetSunday)} (${weekLabel})`,
    sessions: weekSessions,
    ...stats,
    funFacts,
    primaryGoalTarget: null,
    primaryGoalCurrent: null,
    primaryGoalUnit: 'økter',
    extraGoals: goalResults,
    challenges: [],
  };
}

export function computeMonthlyReport(
  allSessions: WorkoutSession[],
  primaryGoals: PrimaryGoalPeriod[],
  extraGoals: ExtraGoal[],
  allTimeSessionsForRecords: WorkoutSession[],
  monthTarget: number,
  monthCurrent: number
): ReportData {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const monthSessions = allSessions.filter(s => {
    const d = new Date(s.date);
    return d >= monthStart && d <= monthEnd;
  });

  const stats = computeBasicStats(monthSessions);
  const funFacts = computeFunFacts('month', monthSessions, allTimeSessionsForRecords, now);

  // Monthly extra goals
  const monthGoals = extraGoals.filter(g => !g.archived && g.period === 'month');
  const goalResults = monthGoals.map(g => {
    const periodSessions = getSessionsInPeriod(allSessions, 'month', g.activityType, g.customStart, g.customEnd);
    const current = computeProgress(periodSessions, g.metric);
    return { goal: g, current, reached: current >= g.target };
  });

  const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];

  return {
    period: 'month',
    periodLabel: monthNames[now.getMonth()] + ' ' + now.getFullYear(),
    sessions: monthSessions,
    ...stats,
    funFacts,
    primaryGoalTarget: monthTarget > 0 ? monthTarget : null,
    primaryGoalCurrent: monthCurrent,
    primaryGoalUnit: 'økter',
    extraGoals: goalResults,
    challenges: [],
  };
}

function computeBasicStats(sessions: WorkoutSession[]) {
  const sessionsByType: Record<string, number> = {};
  sessions.forEach(s => {
    sessionsByType[s.type] = (sessionsByType[s.type] || 0) + 1;
  });
  return {
    totalSessions: sessions.filter(s => !s.excludeFromCount).length,
    totalMinutes: sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    totalDistance: sessions.reduce((sum, s) => sum + (s.distance || 0), 0),
    totalElevation: sessions.reduce((sum, s) => sum + (s.elevationGain || 0), 0),
    sessionsByType,
  };
}

function computeFunFacts(period: 'week' | 'month', periodSessions: WorkoutSession[], allSessions: WorkoutSession[], now: Date): string[] {
  const facts: string[] = [];
  if (periodSessions.length === 0) return facts;

  const periodMinutes = periodSessions.reduce((s, w) => s + w.durationMinutes, 0);
  const periodDist = periodSessions.reduce((s, w) => s + (w.distance || 0), 0);
  const periodElev = periodSessions.reduce((s, w) => s + (w.elevationGain || 0), 0);

  // Compare with all other same-type periods
  if (period === 'month') {
    // Group all sessions by month
    const monthGroups = new Map<string, WorkoutSession[]>();
    allSessions.forEach(s => {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!monthGroups.has(key)) monthGroups.set(key, []);
      monthGroups.get(key)!.push(s);
    });
    const currentKey = `${now.getFullYear()}-${now.getMonth()}`;
    
    const checkRecord = (metric: string, getValue: (sessions: WorkoutSession[]) => number) => {
      const currentVal = getValue(periodSessions);
      if (currentVal <= 0) return;
      let isBestEver = true;
      let isBestThisYear = true;
      for (const [key, sessions] of monthGroups) {
        if (key === currentKey) continue;
        const val = getValue(sessions);
        if (val >= currentVal) {
          isBestEver = false;
          if (key.startsWith(String(now.getFullYear()))) isBestThisYear = false;
        }
      }
      if (isBestEver && monthGroups.size > 1) {
        facts.push(`Beste måned noen gang for ${metric}!`);
      } else if (isBestThisYear) {
        facts.push(`Beste måned i ${now.getFullYear()} for ${metric}!`);
      }
    };

    checkRecord('antall økter', ss => ss.length);
    checkRecord('distanse', ss => ss.reduce((s, w) => s + (w.distance || 0), 0));
    checkRecord('høydemeter', ss => ss.reduce((s, w) => s + (w.elevationGain || 0), 0));
    checkRecord('varighet', ss => ss.reduce((s, w) => s + w.durationMinutes, 0));
  } else {
    // Week: group by week
    const weekGroups = new Map<string, WorkoutSession[]>();
    allSessions.forEach(s => {
      const d = new Date(s.date);
      const wn = getWeekNumber(d);
      const key = `${d.getFullYear()}-W${wn}`;
      if (!weekGroups.has(key)) weekGroups.set(key, []);
      weekGroups.get(key)!.push(s);
    });
    const currentKey = `${now.getFullYear()}-W${getWeekNumber(now)}`;

    const checkRecord = (metric: string, getValue: (sessions: WorkoutSession[]) => number) => {
      const currentVal = getValue(periodSessions);
      if (currentVal <= 0) return;
      let isBestEver = true;
      let isBestThisYear = true;
      for (const [key, sessions] of weekGroups) {
        if (key === currentKey) continue;
        const val = getValue(sessions);
        if (val >= currentVal) {
          isBestEver = false;
          if (key.startsWith(String(now.getFullYear()))) isBestThisYear = false;
        }
      }
      if (isBestEver && weekGroups.size > 1) {
        facts.push(`Beste uke noen gang for ${metric}!`);
      } else if (isBestThisYear) {
        facts.push(`Beste uke i ${now.getFullYear()} for ${metric}!`);
      }
    };

    checkRecord('antall økter', ss => ss.length);
    checkRecord('distanse', ss => ss.reduce((s, w) => s + (w.distance || 0), 0));
    checkRecord('høydemeter', ss => ss.reduce((s, w) => s + (w.elevationGain || 0), 0));
    checkRecord('varighet', ss => ss.reduce((s, w) => s + w.durationMinutes, 0));
  }

  return facts;
}

function getWeekNumber(d: Date): number {
  const target = new Date(d.valueOf());
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + 3 - ((target.getDay() + 6) % 7));
  const week1 = new Date(target.getFullYear(), 0, 4);
  return 1 + Math.round(((target.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}

// Check if report should be shown
export function shouldShowWeeklyReport(): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon
  const hour = now.getHours();
  
  // Sunday after 17:00 or Monday all day
  if (dayOfWeek === 0 && hour >= 17) return true;
  if (dayOfWeek === 1) return true;
  return false;
}

export function shouldShowMonthlyReport(): boolean {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  
  // Last day of month or first day of next month
  if (dayOfMonth === lastDay) return true;
  if (dayOfMonth === 1) return true;
  return false;
}

export function getReportDismissKey(type: 'week' | 'month'): string {
  const now = new Date();
  if (type === 'week') {
    // Use the same target week logic as computeWeeklyReport
    const dayOfWeek = now.getDay();
    let targetSunday: Date;
    if (dayOfWeek === 0) {
      targetSunday = new Date(now);
    } else {
      targetSunday = new Date(now);
      targetSunday.setDate(now.getDate() - dayOfWeek);
    }
    return `treningslogg_report_week_${targetSunday.getFullYear()}_W${getWeekNumber(targetSunday)}`;
  }
  return `treningslogg_report_month_${now.getFullYear()}_${now.getMonth()}`;
}

export function getReportLaterKey(type: 'week' | 'month'): string {
  return getReportDismissKey(type) + '_later';
}
