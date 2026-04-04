import { useTranslation } from '@/i18n/useTranslation';
import { hapticsService } from '@/services/hapticsService';

export type ChartMetric = 'sessions' | 'distance' | 'elevation' | 'minutes' | 'steps';

interface MetricSelectorProps {
  selected: ChartMetric;
  onSelect: (m: ChartMetric) => void;
}

const MetricSelector = ({ selected, onSelect }: MetricSelectorProps) => {
  const { t } = useTranslation();

  const metrics: { id: ChartMetric; label: string }[] = [
    { id: 'sessions', label: t('stats.sessions') },
    { id: 'distance', label: t('stats.distance') },
    { id: 'elevation', label: t('stats.elevation') },
    { id: 'minutes', label: t('metric.totalTime') },
    { id: 'steps', label: 'Skritt' },
  ];

  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {metrics.map((m) => (
        <button
          key={m.id}
          onClick={() => { console.warn('[DEBUG-HAPTIC] MetricSelector chip', m.id); hapticsService.impact('heavy'); onSelect(m.id); }}
          className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors border ${
            selected === m.id
              ? 'bg-primary/15 text-primary border-primary/40 shadow-sm'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};

export default MetricSelector;
