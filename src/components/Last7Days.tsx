import { useMemo } from 'react';
import { WorkoutSession } from '@/types/workout';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';

interface Last7DaysProps {
  sessions: WorkoutSession[];
  onClick?: () => void;
}

const WEEKDAY_KEYS = ['weekday.long.mon', 'weekday.long.tue', 'weekday.long.wed', 'weekday.long.thu', 'weekday.long.fri', 'weekday.long.sat', 'weekday.long.sun'];
const WEEKDAY_KEYS_SUN = ['weekday.long.sun', 'weekday.long.mon', 'weekday.long.tue', 'weekday.long.wed', 'weekday.long.thu', 'weekday.long.fri', 'weekday.long.sat'];

const Last7Days = ({ sessions, onClick }: Last7DaysProps) => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const isDark = settings.darkMode;

  const days = useMemo(() => {
    const result: { date: string; label: string; sessions: WorkoutSession[] }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dow = d.getDay(); // 0=sun
      const keys = settings.firstDayOfWeek === 'sunday' ? WEEKDAY_KEYS_SUN : WEEKDAY_KEYS;
      const keyIdx = settings.firstDayOfWeek === 'sunday' ? dow : (dow === 0 ? 6 : dow - 1);
      const label = t(keys[keyIdx]);
      const daySessions = sessions.filter(s => s.date.slice(0, 10) === dateStr);
      result.push({ date: dateStr, label: label.toUpperCase(), sessions: daySessions });
    }
    return result;
  }, [sessions, settings.firstDayOfWeek, t]);

  const isToday = (dateStr: string) => dateStr === new Date().toISOString().split('T')[0];

  return (
    <div className="glass-card card-gradient rounded-xl p-3 shadow-md cursor-pointer" onClick={onClick}>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const count = day.sessions.length;
          const today = isToday(day.date);
          return (
            <div key={day.date} className="flex flex-col items-center gap-1.5">
              <span className={`text-[9px] font-semibold tracking-wide ${today ? 'text-primary' : 'text-muted-foreground'}`}>
                {day.label}
              </span>
              <div className="relative w-9 h-9 flex items-center justify-center">
                {count === 0 && (
                  <div className={`w-9 h-9 rounded-full ${isDark ? 'bg-muted/25' : 'bg-muted/50'} ${today ? 'ring-2 ring-primary/40' : ''}`} />
                )}
                {count === 1 && (() => {
                  const colors = getActivityColors(day.sessions[0].type, isDark);
                  return (
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center border border-white/20 dark:border-white/10 ${today ? 'ring-2 ring-primary/40' : ''}`}
                      style={{
                        background: colors.bg,
                        boxShadow: `0 2px 8px ${isDark ? 'rgba(0,0,0,0.4)' : colors.bg.replace('rgb', 'rgba').replace(')', ', 0.4)')}`,
                      }}
                    >
                      <ActivityIcon
                        type={day.sessions[0].type}
                        className="w-5 h-5 drop-shadow-sm"
                        colorOverride={colors.text}
                      />
                    </div>
                  );
                })()}
                {count >= 2 && (() => {
                  const c0 = getActivityColors(day.sessions[0].type, isDark);
                  const c1 = getActivityColors(day.sessions[1].type, isDark);
                  return (
                    <>
                      {/* Back circle - shifted left */}
                      <div
                        className="absolute w-8 h-8 rounded-full flex items-center justify-center border border-white/15 dark:border-white/10"
                        style={{
                          left: -2,
                          top: 2,
                          background: c0.bg,
                          boxShadow: `0 1px 4px ${isDark ? 'rgba(0,0,0,0.3)' : c0.bg.replace('rgb', 'rgba').replace(')', ', 0.3)')}`,
                          zIndex: 1,
                        }}
                      >
                        <ActivityIcon
                          type={day.sessions[0].type}
                          className="w-4 h-4 drop-shadow-sm"
                          colorOverride={c0.text}
                        />
                      </div>
                      {/* Front circle - shifted right, overlapping */}
                      <div
                        className={`absolute w-8 h-8 rounded-full flex items-center justify-center border border-white/20 dark:border-white/10 ${today ? 'ring-2 ring-primary/40' : ''}`}
                        style={{
                          right: -2,
                          top: 2,
                          background: c1.bg,
                          boxShadow: `0 2px 6px ${isDark ? 'rgba(0,0,0,0.35)' : c1.bg.replace('rgb', 'rgba').replace(')', ', 0.35)')}`,
                          zIndex: 2,
                        }}
                      >
                        <ActivityIcon
                          type={day.sessions[1].type}
                          className="w-4 h-4 drop-shadow-sm"
                          colorOverride={c1.text}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Last7Days;
