import { useMemo } from 'react';
import { WorkoutSession } from '@/types/workout';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';

interface WeeklySessionIconsProps {
  sessions: WorkoutSession[];
  onClick?: () => void;
}

const MAX_VISIBLE = 8;

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

  return (
    <div className="flex items-center gap-2 flex-wrap cursor-pointer" onClick={onClick}>
      {visible.map((session) => {
        const colors = getActivityColors(session.type, isDark);
        return (
          <div
            key={session.id}
            className="rounded-xl p-2.5 flex items-center justify-center border border-white/25 dark:border-white/10"
            style={{
              background: `linear-gradient(145deg, ${colors.bg}ee, ${colors.bg}cc)`,
              boxShadow: `0 4px 12px ${colors.bg}35, inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.05)`,
              backdropFilter: 'blur(8px)',
            }}
            title={`${session.type} – ${new Date(session.date).toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric' })}`}
          >
            <ActivityIcon type={session.type} className="w-6 h-6 drop-shadow-sm" colorOverride={!isDark ? colors.text : undefined} />
          </div>
        );
      })}
      {overflow > 0 && (
        <div className="rounded-xl px-3 py-2.5 bg-muted text-muted-foreground text-sm font-semibold">
          +{overflow}
        </div>
      )}
    </div>
  );
};

export default WeeklySessionIcons;
