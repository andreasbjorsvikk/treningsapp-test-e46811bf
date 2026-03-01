import { useMemo, useState } from 'react';
import { WorkoutSession } from '@/types/workout';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import DayDrawer from '@/components/DayDrawer';

interface MiniCalendarProps {
  sessions: WorkoutSession[];
  onClick?: () => void;
}

const MiniCalendar = ({ sessions, onClick }: MiniCalendarProps) => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const isDark = settings.darkMode;
  const sundayStart = settings.firstDayOfWeek === 'sunday';
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [, setRefresh] = useState(0);

  const { weeks, monthLabel, weekdays } = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let startDay = firstDay.getDay();
    if (!sundayStart) {
      startDay = startDay === 0 ? 6 : startDay - 1;
    }

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const weekRows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weekRows.push(cells.slice(i, i + 7));
    }

    const wds = sundayStart
      ? [t('weekday.sun'), t('weekday.mon'), t('weekday.tue'), t('weekday.wed'), t('weekday.thu'), t('weekday.fri'), t('weekday.sat')]
      : [t('weekday.mon'), t('weekday.tue'), t('weekday.wed'), t('weekday.thu'), t('weekday.fri'), t('weekday.sat'), t('weekday.sun')];

    const label = t(`month.${month}`);

    return { weeks: weekRows, monthLabel: label, weekdays: wds };
  }, [sessions, sundayStart]);

  const now = new Date();
  const today = now.getDate();
  const year = now.getFullYear();
  const month = now.getMonth();

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, WorkoutSession[]>();
    sessions.forEach(s => {
      const d = new Date(s.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(s);
      }
    });
    return map;
  }, [sessions, year, month]);

  const toDateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const selectedSessions = selectedDay
    ? sessions.filter(s => s.date.slice(0, 10) === selectedDay)
    : [];

  return (
    <>
      <div className="glass-card rounded-xl p-2.5 cursor-pointer" onClick={onClick}>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 text-center">
          {monthLabel}
        </div>

        <div className="grid grid-cols-7 gap-[3px]">
          {weekdays.map((d, i) => (
            <div key={i} className="text-center text-[7px] font-medium text-muted-foreground/50 pb-0.5">
              {d}
            </div>
          ))}

          {weeks.flat().map((day, i) => {
            if (day == null) {
              return <div key={i} className="w-full aspect-square" />;
            }

            const daySessions = sessionsByDay.get(day) || [];
            const isToday = day === today;
            const count = daySessions.length;

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(toDateKey(day))}
                className={`
                  w-full aspect-square rounded-[4px] flex items-center justify-center relative overflow-hidden
                  transition-all hover:ring-1 hover:ring-primary/30
                  ${isToday ? 'ring-1 ring-primary/60' : ''}
                  ${count === 0 ? 'bg-muted/30 dark:bg-muted/15' : ''}
                `}
              >
                {/* No sessions - plain cell */}
                {count === 0 && (
                  <span className={`text-[8px] leading-none ${isToday ? 'font-bold text-primary' : 'text-muted-foreground/40'}`}>
                    {day}
                  </span>
                )}

                {/* 1 session - full color with glass */}
                {count === 1 && (
                  <div
                    className="absolute inset-0 rounded-[4px]"
                    style={{
                      backgroundColor: getActivityColors(daySessions[0].type, isDark).bg,
                      boxShadow: `inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(0,0,0,0.08), 0 1px 3px ${getActivityColors(daySessions[0].type, isDark).bg}40`,
                    }}
                  />
                )}

                {/* 2 sessions - split */}
                {count === 2 && (
                  <div className="absolute inset-0 flex rounded-[4px] overflow-hidden"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[0].type, isDark).bg }} />
                    <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[1].type, isDark).bg }} />
                  </div>
                )}

                {/* 3+ sessions - split grid */}
                {count >= 3 && (
                  <div className="absolute inset-0 flex flex-col rounded-[4px] overflow-hidden"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -1px 1px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[0].type, isDark).bg }} />
                    <div className="flex flex-1">
                      <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[1].type, isDark).bg }} />
                      <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[2].type, isDark).bg }} />
                    </div>
                  </div>
                )}

                {count > 0 && (
                  <span className={`relative z-10 text-[7px] font-bold leading-none drop-shadow-sm ${isToday ? 'text-primary' : ''}`}
                    style={{ color: isToday ? undefined : getActivityColors(daySessions[0].type, isDark).text }}>
                    {day}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <DayDrawer
        dateKey={selectedDay}
        sessions={selectedSessions}
        onClose={() => setSelectedDay(null)}
        onRefresh={() => setRefresh(r => r + 1)}
      />
    </>
  );
};

export default MiniCalendar;
