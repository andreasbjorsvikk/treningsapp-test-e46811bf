import { useMemo } from 'react';
import { Pencil, Trash2, Target } from 'lucide-react';
import { ExtraGoal, WorkoutSession, GoalMetric, GoalPeriod } from '@/types/workout';
import { sessionTypeConfig } from '@/utils/workoutUtils';
import { Progress } from '@/components/ui/progress';
import { getSessionsInPeriod, computeProgress, metricLabels, getDaysRemainingInPeriod, getPeriodFractionElapsed } from '@/utils/goalUtils';

const periodLabels: Record<GoalPeriod | 'custom', string> = {
  week: 'denne uken',
  month: 'denne måneden',
  year: 'i år',
  custom: 'egendefinert',
};

function formatValue(value: number, metric: GoalMetric): string {
  if (metric === 'distance') return value.toFixed(1);
  return Math.round(value).toString();
}

interface GoalCardProps {
  goal: ExtraGoal;
  sessions: WorkoutSession[];
  onEdit: (goal: ExtraGoal) => void;
  onDelete: (id: string) => void;
}

const GoalCard = ({ goal, sessions, onEdit, onDelete }: GoalCardProps) => {
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

  const typeLabel = goal.activityType === 'all'
    ? 'Alle aktiviteter'
    : sessionTypeConfig[goal.activityType].label;

  const periodLabel = goal.period === 'custom'
    ? `${goal.customStart?.slice(5)} – ${goal.customEnd?.slice(5)}`
    : periodLabels[goal.period];

  return (
    <div className="glass-card rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Target className={`w-4 h-4 ${done ? 'text-success' : 'text-primary'}`} />
          <div>
            <p className="text-sm font-medium">
              {formatValue(current, goal.metric)}/{formatValue(goal.target, goal.metric)} {metricLabels[goal.metric]}
            </p>
            <p className="text-xs text-muted-foreground">
              {typeLabel} · {periodLabel}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(goal)} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => onDelete(goal.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <Progress value={pct} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {done ? '✓ Nådd!' : `${formatValue(remaining, goal.metric)} igjen`}
            {' · '}{daysLeft} dager igjen
          </span>
          {!done && (
            <span className={ahead ? 'text-success font-medium' : 'text-warning font-medium'}>
              {ahead ? 'Foran skjema' : 'Bak skjema'}
            </span>
          )}
          {done && <span className="text-success font-medium">✓ Nådd!</span>}
        </div>
      </div>
    </div>
  );
};

export default GoalCard;
