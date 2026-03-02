import { SessionType } from '@/types/workout';
import { sessionTypeConfig, allSessionTypes } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { getActivityColors } from '@/utils/activityColors';
import ActivityIcon from '@/components/ActivityIcon';

interface ActivityTypeFilterProps {
  selected: SessionType[];
  onToggle: (type: SessionType) => void;
}

const ActivityTypeFilter = ({ selected, onToggle }: ActivityTypeFilterProps) => {
  const { settings } = useSettings();
  const isDark = settings.darkMode;
  const disabledTypes = settings.disabledSessionTypes || [];
  const filteredTypes = allSessionTypes.filter(t => !disabledTypes.includes(t));
  const allSelected = selected.length === filteredTypes.length;

  const handleToggleAll = () => {
    if (allSelected) {
      filteredTypes.forEach((t) => {
        if (selected.includes(t)) onToggle(t);
      });
    } else {
      filteredTypes.forEach((t) => {
        if (!selected.includes(t)) onToggle(t);
      });
    }
  };

  return (
    <div className="flex gap-1.5 pb-1 justify-center flex-wrap">
      <button
        onClick={handleToggleAll}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
          allSelected
            ? 'bg-foreground text-background'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        Alle
      </button>
      {filteredTypes.map((type) => {
        const config = sessionTypeConfig[type];
        const isActive = selected.includes(type);
        const colors = getActivityColors(type, isDark);
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
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

export default ActivityTypeFilter;
