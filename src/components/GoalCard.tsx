import { useMemo } from 'react';
import { Pencil, Trash2, Home } from 'lucide-react';
import { ExtraGoal, WorkoutSession, GoalMetric, GoalPeriod, SessionType } from '@/types/workout';
import { getSessionsInPeriod, computeProgress, metricLabels, getDaysRemainingInPeriod, getPeriodFractionElapsed } from '@/utils/goalUtils';
import GoalProgressVisual from '@/components/GoalProgressVisual';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import { Layers } from 'lucide-react';

const periodLabels: Record<GoalPeriod | 'custom', string> = {
  week: 'Denne uken',
  month: 'Denne måneden',
  year: 'I år',
  custom: '',
};

function formatValue(value: number, metric: GoalMetric): string {
  if (metric === 'distance' || metric === 'minutes') return value.toFixed(1);
  return Math.round(value).toString();
}

function formatCustomDate(isoDate?: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const day = d.getDate();
  const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
  return `${day}. ${months[d.getMonth()]}`;
}

function getScheduleStatus(current: number, expected: number, done: boolean): { label: string; className: string } {
  if (done) return { label: '✓ Nådd!', className: 'text-success font-semibold' };
  const diff = current - expected;
  const tolerance = expected * 0.05; // 5% tolerance for "i rute"
  if (Math.abs(diff) <= tolerance && expected > 0) return { label: 'I rute', className: 'text-primary font-medium' };
  if (current >= expected) return { label: 'Foran skjema', className: 'text-success font-medium' };
  return { label: 'Bak skjema', className: 'text-warning font-medium' };
}

interface GoalCardProps {
  goal: ExtraGoal;
  sessions: WorkoutSession[];
  onEdit: (goal: ExtraGoal) => void;
  onDelete: (id: string) => void;
  onToggleHome: (id: string) => void;
}

const GoalCard = ({ goal, sessions, onEdit, onDelete, onToggleHome }: GoalCardProps) => {
  const { settings } = useSettings();
  const isDark = settings.darkMode;

  const periodSessions = useMemo(
    () => getSessionsInPeriod(sessions, goal.period, goal.activityType, goal.customStart, goal.customEnd),
    [sessions, goal]
  );

  const current = computeProgress(periodSessions, goal.metric);
  const pct = Math.min((current / goal.target) * 100, 100);
  const done = current >= goal.target;
  const remaining = Math.max(0, goal.target - current);
  const daysLeft = getDaysRemainingInPeriod(goal.period, goal.customEnd);
  const fraction = getPeriodFractionElapsed(goal.period, goal.customStart, goal.customEnd);
  const expected = goal.target * fraction;

  const type = goal.activityType === 'all' ? 'styrke' : goal.activityType;
  const colors = getActivityColors(type, isDark);
  const isActivitySpecific = goal.activityType !== 'all';

  const periodLabel = goal.period === 'custom'
    ? `${formatCustomDate(goal.customStart)} – ${formatCustomDate(goal.customEnd)}`
    : periodLabels[goal.period];

  const schedule = getScheduleStatus(current, expected, done);

  // Subtle tinted background for activity-specific goals
  const cardBg = isActivitySpecific
    ? { backgroundColor: isDark ? `${colors.bg}15` : `${colors.bg}22` }
    : {};

  return (
    <div
      className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-2 relative group"
      style={cardBg}
    >
      {/* Top-right actions */}
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(goal)} className="p-1 rounded-md hover:bg-secondary transition-colors">
          <Pencil className="w-3 h-3 text-muted-foreground" />
        </button>
        <button onClick={() => onDelete(goal.id)} className="p-1 rounded-md hover:bg-destructive/10 transition-colors">
          <Trash2 className="w-3 h-3 text-destructive" />
        </button>
      </div>

      {/* Progress visual - larger */}
      <div className="w-24 h-24">
        <GoalProgressVisual
          metric={goal.metric}
          activityType={goal.activityType}
          percent={pct}
          current={current}
          target={goal.target}
        />
      </div>

      {/* Activity icon */}
      <div className="flex items-center justify-center">
        {goal.activityType === 'all' ? (
          <div className="rounded-full p-1.5 bg-secondary">
            <Layers className="w-4 h-4 text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-full p-1.5" style={{ backgroundColor: colors.bg }}>
            <ActivityIcon type={goal.activityType} className="w-4 h-4" colorOverride={!isDark ? colors.text : undefined} />
          </div>
        )}
      </div>

      {/* Period */}
      <p className="text-xs text-muted-foreground">{periodLabel}</p>

      {/* Days left */}
      {!done && (
        <p className="text-xs text-muted-foreground">{daysLeft} dager igjen</p>
      )}

      {/* Progress: current / target */}
      <p className="text-sm font-bold">
        {formatValue(current, goal.metric)} / {formatValue(goal.target, goal.metric)}
        <span className="text-xs font-normal text-muted-foreground ml-1">{metricLabels[goal.metric]}</span>
      </p>

      {/* Remaining */}
      {!done && (
        <p className="text-xs text-muted-foreground">
          {formatValue(remaining, goal.metric)} {metricLabels[goal.metric]} igjen
        </p>
      )}

      {/* Schedule status */}
      <p className={`text-xs ${schedule.className}`}>{schedule.label}</p>

      {/* Home toggle */}
      <button
        onClick={() => onToggleHome(goal.id)}
        className={`absolute bottom-2 left-2 p-1 rounded-md transition-colors ${
          goal.showOnHome
            ? 'text-primary bg-primary/10'
            : 'text-muted-foreground/40 hover:text-muted-foreground'
        }`}
        title={goal.showOnHome ? 'Fjern fra hjemskjerm' : 'Vis på hjemskjerm'}
      >
        <Home className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default GoalCard;
