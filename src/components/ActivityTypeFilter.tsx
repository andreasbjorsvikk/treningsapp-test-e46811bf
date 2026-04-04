import { SessionType } from '@/types/workout';
import { hapticsService } from '@/services/hapticsService';
import { sessionTypeConfig, allSessionTypes } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { getActivityColors } from '@/utils/activityColors';
import ActivityIcon from '@/components/ActivityIcon';
import { useTranslation } from '@/i18n/useTranslation';

interface ActivityTypeFilterProps {
  selected: SessionType[];
  onToggle: (type: SessionType) => void;
  chartType?: 'bar' | 'line';
}

const ActivityTypeFilter = ({ selected, onToggle, chartType = 'bar' }: ActivityTypeFilterProps) => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const isDark = settings.darkMode;
  const disabledTypes = settings.disabledSessionTypes || [];
  const filteredTypes = allSessionTypes.filter(t => !disabledTypes.includes(t));
  const allSelected = filteredTypes.length > 0 && filteredTypes.every(t => selected.includes(t));

  const handleToggleAll = () => {
    hapticsService.impact('heavy');
    if (allSelected) {
      // Deselect all
      filteredTypes.forEach((t) => {
        if (selected.includes(t)) onToggle(t);
      });
    } else {
      // Select all
      filteredTypes.forEach((t) => {
        if (!selected.includes(t)) onToggle(t);
      });
    }
  };

  const handleToggleType = (type: SessionType) => {
    hapticsService.impact('heavy');
    if (chartType === 'line' && allSelected) {
      // When "Alle" is active in line mode, clicking a type selects only that type
      filteredTypes.forEach((t) => {
        if (selected.includes(t)) onToggle(t);
      });
      // Then select the clicked type
      onToggle(type);
      return;
    }
    if (chartType === 'bar' && allSelected) {
      // When "Alle" is active in bar mode, clicking a type selects only that type
      filteredTypes.forEach((t) => {
        if (selected.includes(t)) onToggle(t);
      });
      onToggle(type);
      return;
    }
    onToggle(type);
  };

  // In line mode with all selected, "Alle" is highlighted but individual type buttons are not colored
  const isLineAllMode = chartType === 'line' && allSelected;

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
        {t('common.all')}
      </button>
      {filteredTypes.map((type) => {
        const isActive = selected.includes(type);
        const colors = getActivityColors(type, isDark);
        // In line all-mode, don't color individual buttons
        const showColor = isActive && !isLineAllMode;
        return (
          <button
            key={type}
            onClick={() => handleToggleType(type)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !showColor ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''
            }`}
            style={showColor ? { backgroundColor: colors.bg, color: colors.text } : undefined}
          >
            <ActivityIcon type={type} className="w-3.5 h-3.5" />
            {t(`activity.${type}`)}
          </button>
        );
      })}
    </div>
  );
};

export default ActivityTypeFilter;
