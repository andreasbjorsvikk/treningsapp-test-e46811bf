import { useState, useEffect } from 'react';
import { GoalMetric, GoalPeriod, SessionType, ExtraGoal } from '@/types/workout';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import ActivityIcon from '@/components/ActivityIcon';
import { Button } from '@/components/ui/button';
import { Hash, Clock, MapPin, Mountain, Layers } from 'lucide-react';

interface GoalFormProps {
  goal?: ExtraGoal;
  onSave: (data: Omit<ExtraGoal, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}

const metricOptions: { id: GoalMetric; label: string; unit: string; icon: typeof Hash }[] = [
  { id: 'sessions', label: 'Økter', unit: 'økter', icon: Hash },
  { id: 'minutes', label: 'Tid', unit: 'timer', icon: Clock },
  { id: 'distance', label: 'Distanse', unit: 'km', icon: MapPin },
  { id: 'elevation', label: 'Høydemeter', unit: 'm', icon: Mountain },
];

const periodOptions: { id: GoalPeriod | 'custom'; label: string }[] = [
  { id: 'week', label: 'Uke' },
  { id: 'month', label: 'Måned' },
  { id: 'year', label: 'År' },
  { id: 'custom', label: 'Egendefinert' },
];

const GoalForm = ({ goal, onSave, onCancel }: GoalFormProps) => {
  const { settings } = useSettings();
  const isDark = settings.darkMode;

  const [metric, setMetric] = useState<GoalMetric>(goal?.metric || 'sessions');
  const [period, setPeriod] = useState<GoalPeriod | 'custom'>(goal?.period || 'month');
  const [activityType, setActivityType] = useState<SessionType | 'all'>(goal?.activityType || 'all');
  const [target, setTarget] = useState(goal?.target?.toString() || '');
  const [customStart, setCustomStart] = useState(goal?.customStart || '');
  const [customEnd, setCustomEnd] = useState(goal?.customEnd || '');

  useEffect(() => {
    if (goal) {
      setMetric(goal.metric);
      setPeriod(goal.period);
      setActivityType(goal.activityType);
      setTarget(goal.target.toString());
      setCustomStart(goal.customStart || '');
      setCustomEnd(goal.customEnd || '');
    }
  }, [goal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(target);
    if (!targetNum || targetNum <= 0) return;
    if (period === 'custom' && (!customStart || !customEnd)) return;
    onSave({
      metric,
      period,
      activityType,
      target: targetNum,
      ...(period === 'custom' ? { customStart, customEnd } : {}),
    });
  };

  const selectedMetric = metricOptions.find(m => m.id === metric)!;

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-lg p-4 space-y-4">
      <h4 className="font-display font-semibold text-sm">
        {goal ? 'Rediger mål' : 'Nytt ekstra mål'}
      </h4>

      {/* Metric - icon buttons */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Måltype</label>
        <div className="grid grid-cols-4 gap-2">
          {metricOptions.map(m => {
            const Icon = m.icon;
            const selected = metric === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMetric(m.id)}
                className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  selected
                    ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{m.label}</span>
              </button>
            );
          })}
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
              className={`flex-1 py-2 px-2 rounded-md text-sm font-medium transition-colors ${
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

      {/* Custom date pickers */}
      {period === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Fra</label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="w-full bg-secondary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Til</label>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="w-full bg-secondary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
        </div>
      )}

      {/* Activity type - colored buttons */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aktivitetstype</label>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActivityType('all')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activityType === 'all'
                ? 'gradient-energy text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Alle
          </button>
          {allSessionTypes.map(type => {
            const config = sessionTypeConfig[type];
            const colors = getActivityColors(type, isDark);
            const selected = activityType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActivityType(type)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: selected ? colors.bg : undefined,
                  color: selected ? colors.text : undefined,
                }}
              >
                <ActivityIcon type={type} className="w-3.5 h-3.5" colorOverride={selected ? colors.text : undefined} />
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
          placeholder={`f.eks. ${metric === 'sessions' ? '12' : metric === 'minutes' ? '10' : metric === 'distance' ? '50' : '2000'}`}
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
