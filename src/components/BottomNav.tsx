import { Home, CalendarDays, Dumbbell, Users, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export type TabId = 'hjem' | 'kalender' | 'trening' | 'fellesskap' | 'settings';

interface BottomNavProps {
  active: TabId;
  onNavigate: (tab: TabId) => void;
}

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'hjem', label: 'Hjem', icon: Home },
  { id: 'kalender', label: 'Kalender', icon: CalendarDays },
  { id: 'trening', label: 'Trening', icon: Dumbbell },
  { id: 'fellesskap', label: 'Fellesskap', icon: Users },
];

const BottomNav = ({ active, onNavigate }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50 lg:bottom-auto lg:top-0 lg:border-t-0 lg:border-b">
      <div className="flex items-center justify-between px-2 lg:container lg:justify-start lg:gap-1 lg:px-4">
        {tabs.map(tab => {
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
              <span className="text-[10px] font-medium lg:text-sm">{tab.label}</span>
            </button>
          );
        })}
        {/* Spacer on desktop to push settings right */}
        <div className="hidden lg:flex lg:flex-1" />
        {/* Settings */}
        <button
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center gap-0.5 py-2 px-3 transition-colors lg:flex-row lg:gap-2 lg:py-3 lg:px-4 lg:rounded-md ${
            active === 'settings' ? 'text-primary lg:bg-primary/10' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4 lg:w-5 lg:h-5" />
          <span className="text-[10px] font-medium lg:text-sm">Innst.</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
