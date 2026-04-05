import { useTranslation } from '@/i18n/useTranslation';
import { hapticsService } from '@/services/hapticsService';

export type MapSubTab = 'kart' | 'topper' | 'feed' | 'lederliste' | 'ar';

interface MapSubTabsProps {
  active: MapSubTab;
  onChange: (tab: MapSubTab) => void;
}

const MapSubTabs = ({ active, onChange }: MapSubTabsProps) => {
  const { t } = useTranslation();
  const baseTabs: { id: MapSubTab; label: string }[] = [
    { id: 'kart', label: t('mapSub.map') },
    { id: 'topper', label: t('mapSub.peaks') },
    { id: 'feed', label: t('mapSub.feed') },
    { id: 'lederliste', label: t('mapSub.leaderboard') },
    { id: 'ar', label: t('mapSub.ar') },
  ];

  return (
    <div className="flex bg-muted rounded-lg p-1 gap-1">
      {baseTabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => { console.log('[DEBUG] MapSubTabs fired', tab.id); hapticsService.impact('medium'); onChange(tab.id); }}
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
