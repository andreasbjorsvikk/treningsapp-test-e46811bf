import { useMemo } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { ExtraGoal, WorkoutSession, GoalMetric, GoalPeriod } from '@/types/workout';
import { sessionTypeConfig } from '@/utils/workoutUtils';
import { getSessionsInPeriod, computeProgress, metricLabels, getDaysRemainingInPeriod, getPeriodFractionElapsed } from '@/utils/goalUtils';
import GoalProgressVisual from '@/components/GoalProgressVisual';

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
    <div className="glass-card rounded-lg p-4">
      <div className="flex items-center gap-3">
        {/* Themed progress visual */}
        <GoalProgressVisual
          metric={goal.metric}
          activityType={goal.activityType}
          percent={pct}
          current={current}
          target={goal.target}
        />

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">
                {formatValue(current, goal.metric)}/{formatValue(goal.target, goal.metric)} {metricLabels[goal.metric]}
              </p>
              <p className="text-xs text-muted-foreground">
                {typeLabel} · {periodLabel}
              </p>
            </div>
            <div className="flex gap-0.5 shrink-0">
              <button onClick={() => onEdit(goal)} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => onDelete(goal.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          </div>

          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {done ? '✓ Nådd!' : `${formatValue(remaining, goal.metric)} igjen`}
              {' · '}{daysLeft} d igjen
            </span>
            {!done && (
              <span className={ahead ? 'text-success font-medium' : 'text-warning font-medium'}>
                {ahead ? 'Foran' : 'Bak'}
              </span>
            )}
            {done && <span className="text-success font-medium">✓</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalCard;
