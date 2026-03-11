import { useMemo, useState } from 'react';
import { ChevronDown, RotateCcw, Trash2, Check, X, FolderOpen, Repeat } from 'lucide-react';
import { ExtraGoal, WorkoutSession, GoalMetric, SessionType } from '@/types/workout';
import { computeProgress } from '@/utils/goalUtils';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';

interface PeriodEntry {
  label: string;
  start: Date;
  end: Date;
  progress: number;
  target: number;
  achieved: boolean;
}

function computePastPeriods(goal: ExtraGoal, sessions: WorkoutSession[]): PeriodEntry[] {
  const now = new Date();
  const createdAt = new Date(goal.createdAt);
  const periods: PeriodEntry[] = [];

  if (goal.period === 'week') {
    // Start from the Monday of the creation week
    const day = createdAt.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const monday = new Date(createdAt);
    monday.setDate(createdAt.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const currentMonday = new Date(now);
    const currentDay = now.getDay();
    const currentMondayOffset = currentDay === 0 ? 6 : currentDay - 1;
    currentMonday.setDate(now.getDate() - currentMondayOffset);
    currentMonday.setHours(0, 0, 0, 0);

    let weekStart = new Date(monday);
    while (weekStart < currentMonday) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekSessions = filterSessionsByPeriodAndType(sessions, weekStart, weekEnd, goal.activityType);
      const progress = computeProgress(weekSessions, goal.metric);

      periods.push({
        label: `${formatShortDate(weekStart)} – ${formatShortDate(weekEnd)}`,
        start: new Date(weekStart),
        end: new Date(weekEnd),
        progress,
        target: goal.target,
        achieved: progress >= goal.target,
      });

      weekStart.setDate(weekStart.getDate() + 7);
    }
  } else if (goal.period === 'month') {
    let year = createdAt.getFullYear();
    let month = createdAt.getMonth();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    while (year < currentYear || (year === currentYear && month < currentMonth)) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

      const monthSessions = filterSessionsByPeriodAndType(sessions, monthStart, monthEnd, goal.activityType);
      const progress = computeProgress(monthSessions, goal.metric);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
      periods.push({
        label: `${monthNames[month]} ${year}`,
        start: new Date(monthStart),
        end: new Date(monthEnd),
        progress,
        target: goal.target,
        achieved: progress >= goal.target,
      });

      month++;
      if (month > 11) { month = 0; year++; }
    }
  }

  return periods.reverse(); // Most recent first
}

function filterSessionsByPeriodAndType(
  sessions: WorkoutSession[],
  start: Date,
  end: Date,
  activityType: string
): WorkoutSession[] {
  let filtered = sessions.filter(s => {
    const d = new Date(s.date);
    return d >= start && d <= end;
  });

  if (activityType !== 'all') {
    if (activityType.includes(',')) {
      const types = activityType.split(',');
      filtered = filtered.filter(s => types.includes(s.type));
    } else {
      filtered = filtered.filter(s => s.type === activityType);
    }
  }

  return filtered;
}

function formatShortDate(d: Date): string {
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

function formatValue(value: number, metric: GoalMetric): string {
  if (metric === 'distance' || metric === 'minutes') return value.toFixed(1);
  return Math.round(value).toString();
}

interface ArchivedGoalsSectionProps {
  archivedGoals: ExtraGoal[];
  repeatingGoals: ExtraGoal[];
  sessions: WorkoutSession[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
}

const ArchivedGoalsSection = ({
  archivedGoals,
  repeatingGoals,
  sessions,
  expandedId,
  onToggleExpand,
  onUnarchive,
  onDelete,
}: ArchivedGoalsSectionProps) => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const isDark = settings.darkMode;

  // Combine: archived non-repeating + active repeating goals with past periods
  const repeatingWithHistory = useMemo(() => {
    return repeatingGoals
      .map(g => ({
        goal: g,
        periods: computePastPeriods(g, sessions),
      }))
      .filter(r => r.periods.length > 0);
  }, [repeatingGoals, sessions]);

  const nonRepeatingArchived = archivedGoals.filter(g => !g.repeating);

  if (nonRepeatingArchived.length === 0 && repeatingWithHistory.length === 0) {
    return <p className="text-center py-4 text-sm text-muted-foreground">{t('goals.noArchivedGoals')}</p>;
  }

  return (
    <div className="space-y-2">
      {/* Repeating goals as folders */}
      {repeatingWithHistory.map(({ goal, periods }) => {
        const isExpanded = expandedId === goal.id;
        const metricLabel = t(`metric.${goal.metric}`);
        const periodLabel = goal.period === 'week' ? t('goalCard.thisWeek') : t('goalCard.thisMonth');
        const achievedCount = periods.filter(p => p.achieved).length;

        return (
          <div key={`repeating-${goal.id}`} className="rounded-xl overflow-hidden">
            <button
              onClick={() => onToggleExpand(goal.id)}
              className="w-full flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3 hover:bg-secondary/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-semibold text-sm text-foreground flex items-center gap-1">
                    {goal.target} {metricLabel}
                    <Repeat className="w-3 h-3 text-muted-foreground" />
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {achievedCount}/{periods.length} {t('goalCompletion.folder').toLowerCase()}
                  </span>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
            </button>

            {isExpanded && (
              <div className="mt-1 space-y-1 pl-2 pr-2 pb-2">
                {periods.map((period, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${
                      period.achieved
                        ? 'bg-success/10 border border-success/20'
                        : 'bg-destructive/5 border border-destructive/10'
                    }`}
                  >
                    <span className="text-xs font-medium text-foreground">{period.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatValue(period.progress, goal.metric)} / {formatValue(period.target, goal.metric)}
                      </span>
                      {period.achieved ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-destructive/60" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Non-repeating archived goals */}
      {nonRepeatingArchived.map(goal => {
        const metricLabel = t(`metric.${goal.metric}`);
        const periodSessions = filterSessionsByPeriodAndType(
          sessions,
          goal.customStart ? new Date(goal.customStart) : new Date(goal.createdAt),
          goal.customEnd ? new Date(goal.customEnd) : new Date(),
          goal.activityType
        );
        const progress = computeProgress(periodSessions, goal.metric);
        const achieved = progress >= goal.target;
        const periodLabel = goal.period === 'custom'
          ? `${goal.customStart} – ${goal.customEnd}`
          : goal.period === 'week' ? t('goalCard.thisWeek')
          : goal.period === 'month' ? t('goalCard.thisMonth')
          : goal.period === 'year' ? t('goalCard.thisYear') : goal.period;

        return (
          <div key={goal.id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${
            achieved ? 'bg-success/10 border border-success/20' : 'bg-secondary/50'
          }`}>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                {goal.target} {metricLabel}
                {achieved ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <X className="w-3.5 h-3.5 text-destructive/60" />
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatValue(progress, goal.metric)} / {formatValue(goal.target, goal.metric)} · {periodLabel}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onUnarchive(goal.id)}
                className="text-muted-foreground/60 hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
                title={t('goals.unarchive')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(goal.id)}
                className="text-destructive/60 hover:text-destructive p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                title={t('common.delete')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ArchivedGoalsSection;
