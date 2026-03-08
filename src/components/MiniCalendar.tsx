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
      // Parse date robustly - handle both "2026-03-07" and "2026-03-07T16:25:07+00:00" formats
      const dateStr = s.date.slice(0, 10); // "YYYY-MM-DD"
      const [y, m, d] = dateStr.split('-').map(Number);
      if (y === year && (m - 1) === month) {
        if (!map.has(d)) map.set(d, []);
        map.get(d)!.push(s);
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
      <div className="glass-card card-gradient rounded-xl p-2.5 cursor-pointer shadow-md" onClick={onClick}>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 text-center">
          {monthLabel}
        </div>

        <div className="grid grid-cols-7 gap-[3px]">
          {weekdays.map((d, i) => (
            <div key={i} className="text-center text-[7px] font-medium text-muted-foreground pb-0.5">
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

            // For single session: use bg color directly
            const cellBg = count === 1
              ? getActivityColors(daySessions[0].type, isDark).bg
              : undefined;

            const cellStyle: React.CSSProperties = count === 1
              ? {
                  backgroundColor: cellBg,
                  boxShadow: `inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.15), 0 1px 3px ${cellBg}40`,
                }
              : {};

            return (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setSelectedDay(toDateKey(day)); }}
                className={`
                  w-full aspect-square rounded-[4px] flex items-center justify-center relative overflow-hidden
                  transition-all hover:ring-1 hover:ring-primary/30
                  ${isToday ? 'ring-1 ring-primary/60' : ''}
                  ${count === 0 ? 'bg-muted/30 dark:bg-muted/15' : ''}
                `}
                style={cellStyle}
              >
                {/* 2 sessions - split */}
                {count === 2 && (
                  <div className="absolute inset-0 flex rounded-[4px] overflow-hidden"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.15)' }}>
                    <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[0].type, isDark).bg }} />
                    <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[1].type, isDark).bg }} />
                  </div>
                )}

                {/* 3+ sessions - grid */}
                {count >= 3 && (
                  <div className="absolute inset-0 flex flex-col rounded-[4px] overflow-hidden"
                    style={{ boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -1px 2px rgba(0,0,0,0.15)' }}>
                    <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[0].type, isDark).bg }} />
                    <div className="flex flex-1">
                      <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[1].type, isDark).bg }} />
                      <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[2].type, isDark).bg }} />
                    </div>
                  </div>
                )}

                {/* Day number */}
                {count === 0 ? (
                  <span className={`text-[8px] leading-none ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                    {day}
                  </span>
                ) : (
                  <span className={`relative z-10 text-[7px] font-bold leading-none drop-shadow-sm`}
                    style={{ color: isToday ? `hsl(var(--primary))` : getActivityColors(daySessions[0].type, isDark).text }}>
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
