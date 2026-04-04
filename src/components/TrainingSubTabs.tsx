import { TrainingSubTab } from '@/components/BottomNav';
import { useTranslation } from '@/i18n/useTranslation';
import { hapticsService } from '@/services/hapticsService';

interface TrainingSubTabsProps {
  active: TrainingSubTab;
  onChange: (tab: TrainingSubTab) => void;
}

const tabConfig: { id: TrainingSubTab; labelKey: string }[] = [
  { id: 'statistikk', labelKey: 'training.statistics' },
  { id: 'mål', labelKey: 'training.goals' },
  { id: 'historikk', labelKey: 'training.history' },
  { id: 'rekorder', labelKey: 'training.records' },
];

const TrainingSubTabs = ({ active, onChange }: TrainingSubTabsProps) => {
  const { t } = useTranslation();

  return (
    <div className="relative flex rounded-lg bg-muted p-1 mb-4">
      {tabConfig.map(tab => (
        <button
          key={tab.id}
          onClick={() => { hapticsService.impact('medium'); onChange(tab.id); }}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            active === tab.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t(tab.labelKey)}
        </button>
      ))}
    </div>
  );
};

export default TrainingSubTabs;
