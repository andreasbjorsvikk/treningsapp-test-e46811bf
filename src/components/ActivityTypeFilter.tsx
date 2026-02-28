import { SessionType } from '@/types/workout';
import { sessionTypeConfig, allSessionTypes } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import ActivityIcon from '@/components/ActivityIcon';

interface ActivityTypeFilterProps {
  selected: SessionType[];
  onToggle: (type: SessionType) => void;
}

const ActivityTypeFilter = ({ selected, onToggle }: ActivityTypeFilterProps) => {
  const { getTypeColor } = useSettings();
  const allSelected = selected.length === allSessionTypes.length;

  const handleToggleAll = () => {
    if (allSelected) {
      allSessionTypes.forEach((t) => {
        if (selected.includes(t)) onToggle(t);
      });
    } else {
      allSessionTypes.forEach((t) => {
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
            ? 'gradient-energy text-primary-foreground'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        Alle
      </button>
      {allSessionTypes.map((type) => {
        const config = sessionTypeConfig[type];
        const isActive = selected.includes(type);
        const color = getTypeColor(type);
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !isActive ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''
            }`}
            style={isActive ? { backgroundColor: color, color: '#fff' } : undefined}
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
