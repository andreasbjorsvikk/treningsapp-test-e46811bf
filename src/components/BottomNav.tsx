import { Home, CalendarDays, Map, Dumbbell, Users, Settings, ShieldCheck } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { ReactNode } from 'react';
import { hapticsService } from '@/services/hapticsService';

export type TabId = 'hjem' | 'kalender' | 'kart' | 'trening' | 'fellesskap' | 'admin' | 'settings';
export type TrainingSubTab = 'statistikk' | 'historikk' | 'mål' | 'rekorder';

interface BottomNavProps {
  active: TabId;
  onNavigate: (tab: TabId) => void;
  notificationCount?: number;
  settingsDot?: boolean;
  profileButton?: ReactNode;
  showAdmin?: boolean;
}

const tabConfig: { id: TabId; labelKey: string; icon: typeof Home }[] = [
  { id: 'hjem', labelKey: 'nav.home', icon: Home },
  { id: 'kalender', labelKey: 'nav.calendar', icon: CalendarDays },
  { id: 'kart', labelKey: 'nav.map', icon: Map },
  { id: 'trening', labelKey: 'nav.training', icon: Dumbbell },
  { id: 'fellesskap', labelKey: 'nav.community', icon: Users },
];

const BottomNav = ({ active, onNavigate, notificationCount = 0, settingsDot, profileButton, showAdmin }: BottomNavProps) => {
  const { t } = useTranslation();

  const tabs = showAdmin
    ? [...tabConfig, { id: 'admin' as TabId, labelKey: 'Admin', icon: ShieldCheck }]
    : tabConfig;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50 lg:bottom-auto lg:top-0 lg:border-t-0 lg:border-b">
      <div className="flex items-center justify-between px-2 pt-1 pb-4 lg:pt-0 lg:pb-0 lg:container lg:justify-start lg:gap-1 lg:px-4">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          const showDot = tab.id === 'fellesskap' && notificationCount > 0;
          const label = tab.labelKey.startsWith('nav.') ? t(tab.labelKey) : tab.labelKey;
          return (
            <button
              key={tab.id}
              onClick={() => { if (active !== tab.id) hapticsService.impact('medium'); onNavigate(tab.id); }}
              className={`relative flex flex-col items-center gap-0.5 py-2 px-3 flex-1 transition-colors lg:flex-row lg:flex-initial lg:gap-2 lg:py-3 lg:px-4 lg:rounded-md ${
                isActive ? 'text-primary lg:bg-primary/10' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              {showDot && (
                <span className="absolute top-1 left-1/2 translate-x-1.5 lg:top-2.5 lg:left-auto lg:right-2.5 lg:translate-x-0 w-2 h-2 rounded-full bg-destructive" />
              )}
              <span className="text-[10px] font-medium lg:text-sm">{label}</span>
            </button>
          );
        })}
        <div className="hidden lg:flex lg:flex-1" />
        <button
          onClick={() => { if (active !== 'settings') hapticsService.impact('light'); onNavigate('settings'); }}
          className={`relative flex flex-col items-center gap-0.5 py-2 px-3 transition-colors lg:flex-row lg:gap-2 lg:py-3 lg:px-4 lg:rounded-md ${
            active === 'settings' ? 'text-primary lg:bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
          {settingsDot && (
            <span className="absolute top-1 left-1/2 translate-x-1.5 lg:top-2.5 lg:left-auto lg:right-2.5 lg:translate-x-0 w-2 h-2 rounded-full bg-destructive" />
          )}
          <span className="text-[10px] font-medium lg:hidden">{t('nav.settings')}</span>
        </button>
        {profileButton && (
          <div className="hidden lg:flex lg:items-center lg:ml-1">
            {profileButton}
          </div>
        )}
      </div>
    </nav>
  );
};

export default BottomNav;
