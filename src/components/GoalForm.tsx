import { useState, useEffect } from 'react';
import { GoalMetric, GoalPeriod, SessionType, WorkoutGoal } from '@/types/workout';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import ActivityIcon from '@/components/ActivityIcon';
import { Button } from '@/components/ui/button';

interface GoalFormProps {
  goal?: WorkoutGoal;
  onSave: (data: Omit<WorkoutGoal, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const metricOptions: { id: GoalMetric; label: string; unit: string }[] = [
  { id: 'sessions', label: 'Antall økter', unit: 'økter' },
  { id: 'minutes', label: 'Treningstid', unit: 'minutter' },
  { id: 'distance', label: 'Distanse', unit: 'km' },
  { id: 'elevation', label: 'Høydemeter', unit: 'm' },
];

const periodOptions: { id: GoalPeriod; label: string }[] = [
  { id: 'week', label: 'Per uke' },
  { id: 'month', label: 'Per måned' },
  { id: 'year', label: 'Per år' },
];

const GoalForm = ({ goal, onSave, onCancel }: GoalFormProps) => {
  const [metric, setMetric] = useState<GoalMetric>(goal?.metric || 'sessions');
  const [period, setPeriod] = useState<GoalPeriod>(goal?.period || 'month');
  const [activityType, setActivityType] = useState<SessionType | 'all'>(goal?.activityType || 'all');
  const [target, setTarget] = useState(goal?.target?.toString() || '');

  useEffect(() => {
    if (goal) {
      setMetric(goal.metric);
      setPeriod(goal.period);
      setActivityType(goal.activityType);
      setTarget(goal.target.toString());
    }
  }, [goal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(target);
    if (!targetNum || targetNum <= 0) return;
    onSave({ metric, period, activityType, target: targetNum });
  };

  const selectedMetric = metricOptions.find(m => m.id === metric)!;

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-lg p-4 space-y-4">
      <h4 className="font-display font-semibold text-sm">
        {goal ? 'Rediger mål' : 'Nytt mål'}
      </h4>

      {/* Metric */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Måltype</label>
        <div className="grid grid-cols-2 gap-2">
          {metricOptions.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetric(m.id)}
              className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                metric === m.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Period */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Periode</label>
        <div className="flex gap-2">
          {periodOptions.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                period === p.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity type */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aktivitetstype</label>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActivityType('all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activityType === 'all'
                ? 'gradient-energy text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            Alle
          </button>
          {allSessionTypes.map(type => {
            const config = sessionTypeConfig[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActivityType(type)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activityType === type
                    ? 'gradient-energy text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <ActivityIcon type={type} className="w-3.5 h-3.5" />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Mål ({selectedMetric.unit})
        </label>
        <input
          type="number"
          min="1"
          step={metric === 'distance' ? '0.1' : '1'}
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder={`f.eks. ${metric === 'sessions' ? '12' : metric === 'minutes' ? '600' : metric === 'distance' ? '50' : '2000'}`}
          className="w-full bg-secondary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          Avbryt
        </Button>
        <Button type="submit" className="flex-1 gradient-energy text-primary-foreground">
          {goal ? 'Lagre' : 'Opprett'}
        </Button>
      </div>
    </form>
  );
};

export default GoalForm;
