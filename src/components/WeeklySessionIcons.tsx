import { useMemo } from 'react';
import { WorkoutSession } from '@/types/workout';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';

interface WeeklySessionIconsProps {
  sessions: WorkoutSession[];
  onClick?: () => void;
}

const MAX_VISIBLE = 9;

const WeeklySessionIcons = ({ sessions, onClick }: WeeklySessionIconsProps) => {
  const { settings } = useSettings();
  const isDark = settings.darkMode;

  const recentSessions = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return sessions
      .filter(s => new Date(s.date) >= sevenDaysAgo)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions]);

  if (recentSessions.length === 0) return null;

  const visible = recentSessions.slice(0, MAX_VISIBLE);
  const overflow = recentSessions.length - MAX_VISIBLE;
  const isSmall = recentSessions.length > 3;

  return (
    <div className="glass-card bg-gradient-to-br from-foreground/20 via-muted-foreground/12 to-foreground/16 rounded-xl p-2.5 cursor-pointer shadow-md" onClick={onClick}>
      <div className="grid grid-cols-3 gap-[6px]">
        {visible.map((session) => {
          const colors = getActivityColors(session.type, isDark);
          return (
            <div
              key={session.id}
              className={`${isSmall ? 'aspect-square' : 'aspect-square'} rounded-lg flex items-center justify-center border border-white/20 dark:border-white/10`}
              style={{
                background: `linear-gradient(145deg, ${colors.bg}ee, ${colors.bg}cc)`,
                boxShadow: `0 2px 8px ${colors.bg}30, inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(0,0,0,0.06)`,
                ...(isSmall ? { maxHeight: '2.2rem' } : {}),
              }}
              title={`${session.type} – ${new Date(session.date).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric' })}`}
            >
              <ActivityIcon type={session.type} className={`${isSmall ? 'w-4 h-4' : 'w-7 h-7'} drop-shadow-sm`} colorOverride={!isDark ? colors.text : undefined} />
            </div>
          );
        })}
        {overflow > 0 && (
          <div className={`${isSmall ? '' : 'aspect-square'} rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold`}
            style={isSmall ? { maxHeight: '2.2rem' } : {}}
          >
            +{overflow}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklySessionIcons;
