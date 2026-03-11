import { useState, useEffect } from 'react';
import { GoalMetric, GoalPeriod, SessionType, ExtraGoal } from '@/types/workout';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import ActivityIcon from '@/components/ActivityIcon';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Hash, Clock, MapPin, Mountain, Layers } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface GoalFormProps {
  goal?: ExtraGoal;
  onSave: (data: Omit<ExtraGoal, 'id' | 'createdAt'>) => void | Promise<void>;
  onCancel: () => void;
  embedded?: boolean;
}

const metricOptions: { id: GoalMetric; labelKey: string; unit: string; icon: typeof Hash }[] = [
  { id: 'sessions', labelKey: 'metric.sessions.label', unit: 'økter', icon: Hash },
  { id: 'minutes', labelKey: 'metric.minutes.label', unit: 'timer', icon: Clock },
  { id: 'distance', labelKey: 'metric.distance.label', unit: 'km', icon: MapPin },
  { id: 'elevation', labelKey: 'metric.elevation.label', unit: 'm', icon: Mountain },
];

const periodOptions: { id: GoalPeriod | 'custom'; labelKey: string }[] = [
  { id: 'week', labelKey: 'goalForm.week' },
  { id: 'month', labelKey: 'goalForm.month' },
  { id: 'year', labelKey: 'goalForm.year' },
  { id: 'custom', labelKey: 'goalForm.custom' },
];

// Parse activityType string into array of selected types
function parseActivityTypes(activityType: string): string[] {
  if (activityType === 'all') return ['all'];
  return activityType.split(',').filter(Boolean);
}

// Serialize selected types to string
function serializeActivityTypes(selected: string[]): string {
  if (selected.includes('all') || selected.length === 0) return 'all';
  return selected.join(',');
}

const GoalForm = ({ goal, onSave, onCancel, embedded }: GoalFormProps) => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const isDark = settings.darkMode;
  const disabledTypes = settings.disabledSessionTypes || [];

  const [metric, setMetric] = useState<GoalMetric>(goal?.metric || 'sessions');
  const [period, setPeriod] = useState<GoalPeriod | 'custom'>(goal?.period || 'month');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    goal ? parseActivityTypes(goal.activityType) : ['all']
  );
  const [target, setTarget] = useState(goal?.target?.toString() || '');
  const [customStart, setCustomStart] = useState(goal?.customStart || '');
  const [customEnd, setCustomEnd] = useState(goal?.customEnd || '');
  const [repeating, setRepeating] = useState(goal?.repeating || false);

  useEffect(() => {
    if (goal) {
      setMetric(goal.metric);
      setPeriod(goal.period);
      setSelectedTypes(parseActivityTypes(goal.activityType));
      setTarget(goal.target.toString());
      setCustomStart(goal.customStart || '');
      setCustomEnd(goal.customEnd || '');
      setRepeating(goal.repeating || false);
    }
  }, [goal]);

  const toggleType = (type: string) => {
    if (type === 'all') {
      setSelectedTypes(['all']);
      return;
    }
    setSelectedTypes(prev => {
      const filtered = prev.filter(t => t !== 'all');
      if (filtered.includes(type)) {
        const next = filtered.filter(t => t !== type);
        return next.length === 0 ? ['all'] : next;
      }
      return [...filtered, type];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetNum = parseFloat(target);
    if (!targetNum || targetNum <= 0) return;
    if (period === 'custom' && (!customStart || !customEnd)) return;
    onSave({
      metric,
      period,
      activityType: serializeActivityTypes(selectedTypes),
      target: targetNum,
      repeating: (period === 'week' || period === 'month') ? repeating : false,
      ...(period === 'custom' ? { customStart, customEnd } : {}),
    });
  };

  const selectedMetric = metricOptions.find(m => m.id === metric)!;
  const showRepeat = period === 'week' || period === 'month';

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 overflow-hidden ${embedded ? '' : 'glass-card rounded-lg p-4'}`}>
      {!embedded && (
        <h4 className="font-display font-semibold text-sm">
          {goal ? t('goalForm.editGoal') : t('goalForm.newGoal')}
        </h4>
      )}

      {/* Metric - icon buttons */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('goalForm.metricType')}</label>
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
                <span>{t(m.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Period */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('goalForm.period')}</label>
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
              {t(p.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Repeat checkbox */}
      {showRepeat && (
        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={repeating}
            onCheckedChange={(checked) => setRepeating(!!checked)}
          />
          <span className="text-sm font-medium">
            {period === 'week' ? t('goalForm.repeatWeekly') : t('goalForm.repeatMonthly')}
          </span>
        </label>
      )}

      {/* Custom date pickers */}
      {period === 'custom' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('goalForm.from')}</label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="w-full bg-secondary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">{t('goalForm.to')}</label>
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

      {/* Activity type - colored buttons with multi-select */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('goalForm.activityType')}</label>
        <div className="flex flex-wrap gap-1.5 justify-center">
          <button
            type="button"
            onClick={() => toggleType('all')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedTypes.includes('all')
                ? 'gradient-energy text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {t('goalForm.all')}
          </button>
          {allSessionTypes.filter(tp => !disabledTypes.includes(tp)).map(type => {
            const config = sessionTypeConfig[type];
            const colors = getActivityColors(type, isDark);
            const selected = selectedTypes.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: selected ? colors.bg : undefined,
                  color: selected ? colors.text : undefined,
                }}
              >
                <ActivityIcon type={type} className="w-3.5 h-3.5" colorOverride={selected ? colors.text : undefined} />
                {t(`activity.${type}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('goalForm.target')} ({selectedMetric.unit})
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
          {t('common.cancel')}
        </Button>
        <Button type="submit" className="flex-1 gradient-energy text-primary-foreground">
          {goal ? t('common.save') : t('goalForm.create')}
        </Button>
      </div>
    </form>
  );
};

export default GoalForm;