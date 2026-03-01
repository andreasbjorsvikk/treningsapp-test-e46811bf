import { useState } from 'react';
import { GoalPeriod, PrimaryGoalPeriod } from '@/types/workout';
import { convertGoalValue, primaryGoalService } from '@/services/primaryGoalService';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

interface PrimaryGoalFormProps {
  existing?: PrimaryGoalPeriod | null;
  onSave: () => void;
  onCancel: () => void;
}

const periodOptions: { id: GoalPeriod; labelKey: string }[] = [
  { id: 'week', labelKey: 'goalForm.week' },
  { id: 'month', labelKey: 'goalForm.month' },
  { id: 'year', labelKey: 'goalForm.year' },
];

const PrimaryGoalForm = ({ existing, onSave, onCancel }: PrimaryGoalFormProps) => {
  const { t } = useTranslation();
  const isEditing = !!existing;
  const [period, setPeriod] = useState<GoalPeriod>(existing?.inputPeriod || 'month');
  const [target, setTarget] = useState(existing?.inputTarget?.toString() || '');
  const today = new Date().toISOString().slice(0, 10);
  const [validFrom, setValidFrom] = useState(today);
  const [useToday, setUseToday] = useState(true);

  const targetNum = parseFloat(target) || 0;

  const equivalents = periodOptions
    .filter(p => p.id !== period)
    .map(p => ({
      label: t(`goals.period.${p.id}`),
      value: targetNum > 0 ? convertGoalValue(targetNum, period, p.id) : 0,
    }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetNum <= 0) return;
    const fromDate = useToday ? today : validFrom;
    primaryGoalService.add({
      inputPeriod: period,
      inputTarget: targetNum,
      validFrom: fromDate,
    });
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-lg p-4 space-y-4">
      <h4 className="font-display font-semibold text-sm">
        {isEditing ? t('goals.updateGoal') : t('primaryGoal.setGoal')}
      </h4>
      <p className="text-xs text-muted-foreground">
        {t('primaryGoal.description')}
      </p>

      {/* Period selector */}
      <div className="flex rounded-lg bg-muted p-1">
        {periodOptions.map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriod(p.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
              period === p.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>

      {/* Target input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('primaryGoal.sessionsPerPeriod')} {t(`goals.period.${period}`)}
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder={`${t('goalForm.eg')} 12`}
          className="w-full bg-secondary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
      </div>

      {/* Valid from */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t('goals.validFrom')}
        </label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={useToday}
              onChange={() => setUseToday(true)}
              className="accent-primary"
            />
            {t('common.today')} ({today})
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="radio"
              checked={!useToday}
              onChange={() => setUseToday(false)}
              className="accent-primary"
            />
            {t('goals.otherDate')}
          </label>
        </div>
        {!useToday && (
          <input
            type="date"
            value={validFrom}
            onChange={e => setValidFrom(e.target.value)}
            className="w-full bg-secondary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        )}
      </div>

      {/* Equivalents */}
      {targetNum > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {equivalents.map(eq => (
            <p key={eq.label}>= <span className="font-semibold text-foreground">{eq.value}</span> {t('primaryGoal.sessionsPerLabel')} {eq.label}</p>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" className="flex-1 gradient-energy text-primary-foreground">
          {t('common.save')}
        </Button>
      </div>
    </form>
  );
};

export default PrimaryGoalForm;
