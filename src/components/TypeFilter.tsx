import { SessionType } from '@/types/workout';
import { hapticsService } from '@/services/hapticsService';
import { sessionTypeConfig, allSessionTypes } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { getActivityColors } from '@/utils/activityColors';
import ActivityIcon from '@/components/ActivityIcon';
import { useTranslation } from '@/i18n/useTranslation';

interface TypeFilterProps {
  selected: SessionType[];
  onToggle: (type: SessionType) => void;
  onSelectAll: () => void;
}

const TypeFilter = ({ selected, onToggle, onSelectAll }: TypeFilterProps) => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const isDark = settings.darkMode;
  const disabledTypes = settings.disabledSessionTypes || [];
  const types = allSessionTypes.filter(type => !disabledTypes.includes(type));
  const allSelected = types.length > 0 && types.every(type => selected.includes(type));

  return (
    <div className="flex items-center gap-0">
      {/* Sticky "Alle" button */}
      <button
        onClick={() => { hapticsService.impact('light'); onSelectAll(); }}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors z-10 relative mr-2 ${
          allSelected
            ? 'bg-foreground text-background'
            : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        }`}
      >
        {t('common.all')}
      </button>
      {/* Scrollable type buttons */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {types.map((type) => {
          const isActive = selected.includes(type);
          const colors = getActivityColors(type, isDark);
          return (
            <button
              key={type}
              onClick={() => { hapticsService.impact('light'); onToggle(type); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !isActive ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''
              }`}
              style={isActive ? { backgroundColor: colors.bg, color: colors.text } : undefined}
            >
              <ActivityIcon type={type} className="w-3.5 h-3.5" />
              {t(`activity.${type}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TypeFilter;
