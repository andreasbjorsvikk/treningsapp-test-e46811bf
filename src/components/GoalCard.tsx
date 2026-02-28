import { useMemo } from 'react';
import { Pencil, Trash2, Home } from 'lucide-react';
import { ExtraGoal, WorkoutSession, GoalMetric, GoalPeriod } from '@/types/workout';
import { sessionTypeConfig } from '@/utils/workoutUtils';
import { getSessionsInPeriod, computeProgress, metricLabels, getDaysRemainingInPeriod, getPeriodFractionElapsed } from '@/utils/goalUtils';
import GoalProgressVisual from '@/components/GoalProgressVisual';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';

const periodLabels: Record<GoalPeriod | 'custom', string> = {
  week: 'denne uken',
  month: 'denne måneden',
  year: 'i år',
  custom: 'egendefinert',
};

function formatValue(value: number, metric: GoalMetric): string {
  if (metric === 'distance' || metric === 'minutes') return value.toFixed(1);
  return Math.round(value).toString();
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
  const ahead = current >= expected;

  const type = goal.activityType === 'all' ? 'styrke' : goal.activityType;
  const colors = getActivityColors(type, isDark);

  const periodLabel = goal.period === 'custom'
    ? `${goal.customStart?.slice(5)} – ${goal.customEnd?.slice(5)}`
    : periodLabels[goal.period];

  return (
    <div className="glass-card rounded-xl p-4 flex flex-col items-center text-center gap-3 relative group">
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
      <div className="w-20 h-20">
        <GoalProgressVisual
          metric={goal.metric}
          activityType={goal.activityType}
          percent={pct}
          current={current}
          target={goal.target}
        />
      </div>

      {/* Activity icon + period */}
      <div className="flex items-center gap-1.5">
        <div className="rounded-md p-1" style={{ backgroundColor: colors.bg }}>
          <ActivityIcon type={type} className="w-3.5 h-3.5" colorOverride={!isDark ? colors.text : undefined} />
        </div>
        <span className="text-xs text-muted-foreground">{periodLabel}</span>
      </div>

      {/* Progress text */}
      <div className="space-y-0.5">
        <p className="text-sm font-bold">
          {formatValue(current, goal.metric)}/{formatValue(goal.target, goal.metric)}
          <span className="text-xs font-normal text-muted-foreground ml-1">{metricLabels[goal.metric]}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {done ? '✓ Nådd!' : `${formatValue(remaining, goal.metric)} igjen · ${daysLeft}d`}
        </p>
        {!done && (
          <p className={`text-xs font-medium ${ahead ? 'text-success' : 'text-warning'}`}>
            {ahead ? 'Foran' : 'Bak'}
          </p>
        )}
      </div>

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
