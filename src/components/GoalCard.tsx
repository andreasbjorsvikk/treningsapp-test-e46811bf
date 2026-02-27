import { useMemo } from 'react';
import { Pencil, Trash2, Target } from 'lucide-react';
import { WorkoutGoal, WorkoutSession, GoalMetric, GoalPeriod, SessionType } from '@/types/workout';
import { sessionTypeConfig } from '@/utils/workoutUtils';
import { Progress } from '@/components/ui/progress';

interface GoalCardProps {
  goal: WorkoutGoal;
  sessions: WorkoutSession[];
  onEdit: (goal: WorkoutGoal) => void;
  onDelete: (id: string) => void;
}

const metricLabels: Record<GoalMetric, string> = {
  sessions: 'økter',
  minutes: 'min',
  distance: 'km',
  elevation: 'm',
};

const periodLabels: Record<GoalPeriod, string> = {
  week: 'denne uken',
  month: 'denne måneden',
  year: 'i år',
};

function getSessionsInPeriod(sessions: WorkoutSession[], period: GoalPeriod, activityType: SessionType | 'all'): WorkoutSession[] {
  const now = new Date();
  let filtered = activityType === 'all' ? sessions : sessions.filter(s => s.type === activityType);

  if (period === 'week') {
    const day = now.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    filtered = filtered.filter(s => new Date(s.date) >= monday);
  } else if (period === 'month') {
    filtered = filtered.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  } else {
    filtered = filtered.filter(s => new Date(s.date).getFullYear() === now.getFullYear());
  }

  return filtered;
}

function computeProgress(sessions: WorkoutSession[], metric: GoalMetric): number {
  switch (metric) {
    case 'sessions': return sessions.length;
    case 'minutes': return sessions.reduce((s, w) => s + w.durationMinutes, 0);
    case 'distance': return sessions.reduce((s, w) => s + (w.distance || 0), 0);
    case 'elevation': return sessions.reduce((s, w) => s + (w.elevationGain || 0), 0);
  }
}

function formatValue(value: number, metric: GoalMetric): string {
  if (metric === 'distance') return value.toFixed(1);
  return Math.round(value).toString();
}

const GoalCard = ({ goal, sessions, onEdit, onDelete }: GoalCardProps) => {
  const periodSessions = useMemo(
    () => getSessionsInPeriod(sessions, goal.period, goal.activityType),
    [sessions, goal]
  );

  const current = computeProgress(periodSessions, goal.metric);
  const pct = Math.min((current / goal.target) * 100, 100);
  const done = current >= goal.target;

  const typeLabel = goal.activityType === 'all'
    ? 'Alle aktiviteter'
    : sessionTypeConfig[goal.activityType].label;

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
              {typeLabel} · {periodLabels[goal.period]}
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
          <span>{Math.round(pct)}%</span>
          {done && <span className="text-success font-medium">✓ Nådd!</span>}
        </div>
      </div>
    </div>
  );
};

export default GoalCard;
