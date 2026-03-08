import { useTranslation } from '@/i18n/useTranslation';

export type MapSubTab = 'kart' | 'topper';

interface MapSubTabsProps {
  active: MapSubTab;
  onChange: (tab: MapSubTab) => void;
}

const MapSubTabs = ({ active, onChange }: MapSubTabsProps) => {
  const { t } = useTranslation();
  const tabs: { id: MapSubTab; labelKey: string }[] = [
    { id: 'kart', labelKey: 'map.tab.map' },
    { id: 'topper', labelKey: 'map.tab.peaks' },
  ];

  return (
    <div className="flex bg-muted rounded-lg p-1 gap-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
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

export default MapSubTabs;
