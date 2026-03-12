import { useMemo } from 'react';
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

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function computePastPeriods(goal: ExtraGoal, sessions: WorkoutSession[]): PeriodEntry[] {
  const now = new Date();
  const createdAt = new Date(goal.createdAt);
  const periods: PeriodEntry[] = [];

  if (goal.period === 'week') {
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
      const weekNum = getWeekNumber(weekStart);

      periods.push({
        label: `Uke ${weekNum}`,
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

      const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
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

/** For non-repeating archived goals, compute the period boundaries based on goal period & createdAt */
function getArchivedGoalPeriodBounds(goal: ExtraGoal): { start: Date; end: Date; label: string } {
  const created = new Date(goal.createdAt);

  if (goal.period === 'custom' && goal.customStart && goal.customEnd) {
    return {
      start: new Date(goal.customStart),
      end: new Date(goal.customEnd + 'T23:59:59.999'),
      label: `${goal.customStart} – ${goal.customEnd}`,
    };
  }

  if (goal.period === 'week') {
    const day = created.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const monday = new Date(created);
    monday.setDate(created.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    const weekNum = getWeekNumber(monday);
    return { start: monday, end: sunday, label: `Uke ${weekNum}` };
  }

  if (goal.period === 'month') {
    const monthStart = new Date(created.getFullYear(), created.getMonth(), 1);
    const monthEnd = new Date(created.getFullYear(), created.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
    return { start: monthStart, end: monthEnd, label: `${monthNames[created.getMonth()]} ${created.getFullYear()}` };
  }

  // year
  const yearStart = new Date(created.getFullYear(), 0, 1);
  const yearEnd = new Date(created.getFullYear(), 11, 31, 23, 59, 59, 999);
  return { start: yearStart, end: yearEnd, label: `${created.getFullYear()}` };
}

/** Check if unarchiving is allowed (still within the goal's period) */
function canUnarchive(goal: ExtraGoal): boolean {
  const now = new Date();
  const bounds = getArchivedGoalPeriodBounds(goal);
  return now <= bounds.end;
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

function formatValue(value: number, metric: GoalMetric): string {
  if (metric === 'distance' || metric === 'minutes') return value.toFixed(1);
  return Math.round(value).toString();
}

function parseActivityTypes(activityType: string): string[] {
  if (activityType === 'all') return ['all'];
  return activityType.split(',').filter(Boolean);
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

  const renderActivityIcons = (activityType: string) => {
    const types = parseActivityTypes(activityType);
    if (types.includes('all')) return null;
    return (
      <div className="flex items-center gap-0.5">
        {types.slice(0, 3).map((type) => {
          const c = getActivityColors(type as SessionType, isDark);
          return (
            <div key={type} className="rounded-full p-0.5" style={{ backgroundColor: c.bg }}>
              <ActivityIcon type={type as SessionType} className="w-3.5 h-3.5" colorOverride={!isDark ? c.text : undefined} />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Repeating goals as folders */}
      {repeatingWithHistory.map(({ goal, periods }) => {
        const isExpanded = expandedId === goal.id;
        const metricLabel = t(`metric.${goal.metric}`);
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
                  <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    {renderActivityIcons(goal.activityType)}
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
        const bounds = getArchivedGoalPeriodBounds(goal);
        const periodSessions = filterSessionsByPeriodAndType(
          sessions,
          bounds.start,
          bounds.end,
          goal.activityType
        );
        const progress = computeProgress(periodSessions, goal.metric);
        const achieved = progress >= goal.target;
        const allowUnarchive = canUnarchive(goal);

        return (
          <div key={goal.id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${
            achieved ? 'bg-success/10 border border-success/20' : 'bg-secondary/50'
          }`}>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                {renderActivityIcons(goal.activityType)}
                {goal.target} {metricLabel}
                {achieved ? (
                  <Check className="w-3.5 h-3.5 text-success" />
                ) : (
                  <X className="w-3.5 h-3.5 text-destructive/60" />
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatValue(progress, goal.metric)} / {formatValue(goal.target, goal.metric)} · {bounds.label}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {allowUnarchive && (
                <button
                  onClick={() => onUnarchive(goal.id)}
                  className="text-muted-foreground/60 hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors"
                  title={t('goals.unarchive')}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
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
