import { WorkoutSession } from '@/types/workout';
import { sessionTypeConfig, formatDuration } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { Clock, MapPin, MountainSnow, Pencil } from 'lucide-react';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useTranslation } from '@/i18n/useTranslation';

interface SessionCardProps {
  session: WorkoutSession;
  onClick?: (session: WorkoutSession) => void;
  onEdit?: (session: WorkoutSession) => void;
}

const SessionCard = ({ session, onClick, onEdit }: SessionCardProps) => {
  const config = sessionTypeConfig[session.type];
  const { settings } = useSettings();
  const { t, locale } = useTranslation();
  const isDark = settings.darkMode;
  const colors = getActivityColors(session.type, isDark);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('common.today');
    if (diffDays === 1) return t('common.yesterday');
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  return (
    <div
      className="glass-card card-gradient rounded-lg px-3 py-2.5 hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98] shadow-md"
      onClick={() => onClick?.(session)}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="rounded-md p-1.5 shrink-0 flex items-center justify-center"
          style={{ backgroundColor: colors.bg }}
        >
          <ActivityIcon type={session.type} className="w-5 h-5" colorOverride={!isDark ? colors.text : undefined} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold text-sm leading-tight">
                {session.title || t(`activity.${session.type}`)}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(session.date)}
              </p>
            </div>
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(session); }}
                className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDuration(session.durationMinutes)}</span>
            </div>
            {session.distance && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{session.distance} km</span>
              </div>
            )}
            {session.elevationGain && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MountainSnow className="w-3.5 h-3.5" />
                <span>{session.elevationGain} m</span>
              </div>
            )}
          </div>

          {session.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
              {session.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionCard;
