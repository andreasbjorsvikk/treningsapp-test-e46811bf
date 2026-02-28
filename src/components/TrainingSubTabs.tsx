import { TrainingSubTab } from '@/components/BottomNav';

interface TrainingSubTabsProps {
  active: TrainingSubTab;
  onChange: (tab: TrainingSubTab) => void;
}

const tabs: { id: TrainingSubTab; label: string }[] = [
  { id: 'statistikk', label: 'Statistikk' },
  { id: 'historikk', label: 'Historikk' },
  { id: 'mål', label: 'Mål' },
];

const TrainingSubTabs = ({ active, onChange }: TrainingSubTabsProps) => {
  return (
    <div className="relative flex rounded-lg bg-muted p-1 mb-4">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
            active === tab.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TrainingSubTabs;
