import { useState, useRef, useEffect } from 'react';
import { Home, CalendarDays, Dumbbell, Users, Settings, ChevronDown } from 'lucide-react';

export type TabId = 'hjem' | 'kalender' | 'trening' | 'fellesskap' | 'settings';
export type TrainingSubTab = 'statistikk' | 'historikk' | 'mål';

interface BottomNavProps {
  active: TabId;
  onNavigate: (tab: TabId) => void;
  trainingSubTab?: TrainingSubTab;
  onTrainingSubTabChange?: (sub: TrainingSubTab) => void;
}

const tabs: { id: TabId; label: string; icon: typeof Home }[] = [
  { id: 'hjem', label: 'Hjem', icon: Home },
  { id: 'kalender', label: 'Kalender', icon: CalendarDays },
  { id: 'trening', label: 'Trening', icon: Dumbbell },
  { id: 'fellesskap', label: 'Fellesskap', icon: Users },
];

const trainingSubTabs: { id: TrainingSubTab; label: string }[] = [
  { id: 'statistikk', label: 'Statistikk' },
  { id: 'historikk', label: 'Historikk' },
  { id: 'mål', label: 'Mål' },
];

const BottomNav = ({ active, onNavigate, trainingSubTab = 'statistikk', onTrainingSubTabChange }: BottomNavProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/50 lg:bottom-auto lg:top-0 lg:border-t-0 lg:border-b">
      <div className="flex items-center justify-between px-2 lg:container lg:justify-start lg:gap-1 lg:px-4">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          const isTraining = tab.id === 'trening';

          if (isTraining) {
            return (
              <div key={tab.id} className="relative flex-1 lg:flex-initial" ref={dropdownRef}>
                <button
                  onClick={() => {
                    if (active !== 'trening') onNavigate('trening');
                    setDropdownOpen(prev => !prev);
                  }}
                  className={`flex flex-col items-center gap-0.5 py-2 px-3 w-full transition-colors lg:flex-row lg:gap-2 lg:py-3 lg:px-4 lg:rounded-md ${
                    isActive ? 'text-primary lg:bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium lg:text-sm flex items-center gap-0.5">
                    {tab.label}
                    <ChevronDown className={`w-3 h-3 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>

                {dropdownOpen && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 lg:bottom-auto lg:top-full lg:mt-1 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[140px] z-50">
                    {trainingSubTabs.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          onNavigate('trening');
                          onTrainingSubTabChange?.(sub.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          active === 'trening' && trainingSubTab === sub.id
                            ? 'text-primary bg-primary/10 font-medium'
                            : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

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
        <div className="hidden lg:flex lg:flex-1" />
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
