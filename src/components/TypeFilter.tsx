import { SessionType } from '@/types/workout';
import { sessionTypeConfig } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { getActivityColors } from '@/utils/activityColors';
import ActivityIcon from '@/components/ActivityIcon';

interface TypeFilterProps {
  selected: SessionType | 'all';
  onSelect: (type: SessionType | 'all') => void;
}

const TypeFilter = ({ selected, onSelect }: TypeFilterProps) => {
  const { settings } = useSettings();
  const isDark = settings.darkMode;
  const types = Object.entries(sessionTypeConfig) as [SessionType, typeof sessionTypeConfig[SessionType]][];

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      <button
        onClick={() => onSelect('all')}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          selected === 'all'
            ? 'bg-foreground text-background'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        Alle
      </button>
      {types.map(([type, config]) => {
        const isActive = selected === type;
        const colors = getActivityColors(type, isDark);
        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !isActive ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''
            }`}
            style={isActive ? { backgroundColor: colors.bg, color: colors.text } : undefined}
          >
            <ActivityIcon type={type} className="w-3.5 h-3.5" />
            {config.label}
          </button>
        );
      })}
    </div>
  );
};

export default TypeFilter;
