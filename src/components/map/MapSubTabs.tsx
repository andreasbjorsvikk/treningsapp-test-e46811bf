export type MapSubTab = 'kart' | 'topper' | 'feed' | 'lederliste' | 'ar';

interface MapSubTabsProps {
  active: MapSubTab;
  onChange: (tab: MapSubTab) => void;
}

const tabs: { id: MapSubTab; label: string }[] = [
  { id: 'kart', label: 'Kart' },
  { id: 'topper', label: 'Topper' },
  { id: 'feed', label: 'Feed' },
  { id: 'lederliste', label: 'Lederliste' },
  { id: 'ar', label: 'AR' },
];

const MapSubTabs = ({ active, onChange }: MapSubTabsProps) => {
  return (
    <div className="flex bg-muted rounded-lg p-1 gap-1">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 py-1.5 px-2 rounded-md text-sm font-medium transition-colors ${
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

export default MapSubTabs;
