import { useState } from 'react';
import { GoalPeriod, PrimaryGoalPeriod } from '@/types/workout';
import { convertGoalValue } from '@/services/primaryGoalService';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

interface PrimaryGoalFormProps {
  existing?: PrimaryGoalPeriod | null;
  onSave: (data: { inputPeriod: GoalPeriod; inputTarget: number; validFrom: string }) => void;
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
    if (targetNum < 0) return;
    const fromDate = useToday ? today : validFrom;
    onSave({
      inputPeriod: period,
      inputTarget: targetNum,
      validFrom: fromDate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-lg p-5 space-y-5">
      <h4 className="font-display font-semibold text-base text-center">
        {isEditing ? t('goals.updateGoal') : t('primaryGoal.setGoal')}
      </h4>
      <p className="text-xs text-muted-foreground text-center">
        {t('primaryGoal.description')}
      </p>

      {/* Period selector */}
      <div className="flex rounded-lg bg-muted p-1 max-w-[280px] mx-auto">
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
      <div className="space-y-1.5 max-w-[220px] mx-auto text-center">
        <label className="text-sm font-semibold text-foreground">
          {t('primaryGoal.sessionsPerPeriod')} {t(`goals.period.${period}`)}
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={target}
          onChange={e => setTarget(e.target.value)}
          placeholder={`${t('goalForm.eg')} 12`}
          className="w-full bg-secondary rounded-md px-3 py-2.5 text-base text-center font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
        {/* Equivalents directly under field */}
        {targetNum > 0 && (
          <div className="text-sm text-muted-foreground space-y-0.5 pt-1">
            {equivalents.map(eq => (
              <p key={eq.label}>= <span className="font-bold text-foreground text-base">{eq.value}</span> {t('primaryGoal.sessionsPerLabel')} {eq.label}</p>
            ))}
          </div>
        )}
      </div>

      {/* Valid from */}
      <div className="space-y-2 text-center">
        <label className="text-sm font-semibold text-foreground">
          {t('goals.validFrom')}
        </label>
        <div className="flex items-center justify-center gap-3">
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
            className="w-full max-w-[220px] mx-auto bg-secondary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
        )}
      </div>

      <div className="flex gap-2 pt-1">
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
