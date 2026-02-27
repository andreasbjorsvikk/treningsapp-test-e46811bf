import { Home, CalendarDays, Dumbbell, Users, Settings } from 'lucide-react';

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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50">
      <div className="flex items-center justify-between px-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNavigate(tab.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-3 flex-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
        {/* Settings - smaller, right corner */}
        <button
          onClick={() => onNavigate('settings')}
          className={`flex flex-col items-center gap-0.5 py-2 px-3 transition-colors ${
            active === 'settings' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] font-medium">Innst.</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
