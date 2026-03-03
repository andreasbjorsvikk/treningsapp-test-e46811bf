import { Home, CalendarDays, Dumbbell, Users, Settings } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

export type TabId = 'hjem' | 'kalender' | 'trening' | 'fellesskap' | 'settings';
export type TrainingSubTab = 'statistikk' | 'historikk' | 'mål' | 'rekorder';

interface BottomNavProps {
  active: TabId;
  onNavigate: (tab: TabId) => void;
}

const tabConfig: { id: TabId; labelKey: string; icon: typeof Home }[] = [
  { id: 'hjem', labelKey: 'nav.home', icon: Home },
  { id: 'kalender', labelKey: 'nav.calendar', icon: CalendarDays },
  { id: 'trening', labelKey: 'nav.training', icon: Dumbbell },
  { id: 'fellesskap', labelKey: 'nav.community', icon: Users },
];

const BottomNav = ({ active, onNavigate }: BottomNavProps) => {
  const { t } = useTranslation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50 lg:bottom-auto lg:top-0 lg:border-t-0 lg:border-b">
      <div className="flex items-center justify-between px-2 pt-1 pb-5 lg:pt-0 lg:pb-0 lg:container lg:justify-start lg:gap-1 lg:px-4">
        {tabConfig.map(tab => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 flex-1 transition-colors lg:flex-row lg:flex-initial lg:gap-2 lg:py-3 lg:px-4 lg:rounded-md ${
                isActive ? 'text-primary lg:bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium lg:text-sm">{t(tab.labelKey)}</span>
            </button>
          );
        })}
        <div className="hidden lg:flex lg:flex-1" />
        <button
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center gap-0.5 py-2 px-3 transition-colors lg:flex-row lg:gap-2 lg:py-3 lg:px-4 lg:rounded-md ${
            active === 'settings' ? 'text-primary lg:bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
          <span className="text-[10px] font-medium lg:text-sm">{t('nav.settings')}</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
