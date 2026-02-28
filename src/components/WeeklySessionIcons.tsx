import { useMemo } from 'react';
import { WorkoutSession } from '@/types/workout';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';

interface WeeklySessionIconsProps {
  sessions: WorkoutSession[];
}

const MAX_VISIBLE = 8;

const WeeklySessionIcons = ({ sessions }: WeeklySessionIconsProps) => {
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

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visible.map((session) => {
        const colors = getActivityColors(session.type, isDark);
        return (
          <div
            key={session.id}
            className="rounded-lg p-1.5 flex items-center justify-center shadow-sm border border-white/20 dark:border-white/10 backdrop-blur-sm"
            style={{
              background: `linear-gradient(135deg, ${colors.bg}, ${colors.bg}dd)`,
              boxShadow: `0 2px 8px ${colors.bg}40, inset 0 1px 1px rgba(255,255,255,0.2)`,
            }}
            title={`${session.type} – ${new Date(session.date).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric' })}`}
          >
            <ActivityIcon type={session.type} className="w-4 h-4 drop-shadow-sm" colorOverride={!isDark ? colors.text : undefined} />
          </div>
        );
      })}
      {overflow > 0 && (
        <div className="rounded-md px-2 py-1.5 bg-muted text-muted-foreground text-xs font-semibold">
          +{overflow}
        </div>
      )}
    </div>
  );
};

export default WeeklySessionIcons;
