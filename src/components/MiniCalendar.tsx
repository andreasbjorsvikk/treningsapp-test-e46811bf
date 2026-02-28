import { useMemo } from 'react';
import { WorkoutSession } from '@/types/workout';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';

interface MiniCalendarProps {
  sessions: WorkoutSession[];
}

const MiniCalendar = ({ sessions }: MiniCalendarProps) => {
  const { settings } = useSettings();
  const isDark = settings.darkMode;
  const sundayStart = settings.firstDayOfWeek === 'sunday';

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

    const sessionsByDay = new Map<number, WorkoutSession[]>();
    sessions.forEach(s => {
      const d = new Date(s.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!sessionsByDay.has(day)) sessionsByDay.set(day, []);
        sessionsByDay.get(day)!.push(s);
      }
    });

    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const weekRows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weekRows.push(cells.slice(i, i + 7));
    }

    const wds = sundayStart
      ? ['S', 'M', 'T', 'O', 'T', 'F', 'L']
      : ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

    const label = now.toLocaleString('nb-NO', { month: 'long' }).replace(/^./, c => c.toUpperCase());

    return { weeks: weekRows, monthLabel: label, weekdays: wds, sessionsByDay };
  }, [sessions, sundayStart]);

  const now = new Date();
  const today = now.getDate();

  // Re-derive sessionsByDay outside useMemo for rendering
  const sessionsByDay = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
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
  }, [sessions]);

  return (
    <div className="glass-card rounded-xl p-3">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-center">
        {monthLabel}
      </div>

      <div className="grid grid-cols-7 gap-[2px]">
        {weekdays.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-muted-foreground/60 pb-1">
            {d}
          </div>
        ))}

        {weeks.flat().map((day, i) => {
          if (day == null) {
            return <div key={i} className="aspect-square" />;
          }

          const daySessions = sessionsByDay.get(day) || [];
          const isToday = day === today;
          const count = daySessions.length;

          return (
            <div
              key={i}
              className={`
                aspect-square rounded-md flex items-center justify-center relative overflow-hidden
                ${isToday ? 'ring-1 ring-primary/50' : ''}
              `}
            >
              {count === 0 && (
                <span className={`text-[10px] ${isToday ? 'font-bold text-primary' : 'text-muted-foreground/50'}`}>
                  {day}
                </span>
              )}

              {count === 1 && (
                <div
                  className="absolute inset-0 rounded-md"
                  style={{ backgroundColor: getActivityColors(daySessions[0].type, isDark).bg }}
                />
              )}

              {count === 2 && (
                <div className="absolute inset-0 flex rounded-md overflow-hidden">
                  <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[0].type, isDark).bg }} />
                  <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[1].type, isDark).bg }} />
                </div>
              )}

              {count >= 3 && (
                <div className="absolute inset-0 flex flex-col rounded-md overflow-hidden">
                  <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[0].type, isDark).bg }} />
                  <div className="flex flex-1">
                    <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[1].type, isDark).bg }} />
                    <div className="flex-1" style={{ backgroundColor: getActivityColors(daySessions[2].type, isDark).bg }} />
                  </div>
                </div>
              )}

              {count > 0 && (
                <span className={`relative z-10 text-[9px] font-bold ${isToday ? 'text-primary' : ''}`}
                  style={{ color: isToday ? undefined : getActivityColors(daySessions[0].type, isDark).text }}>
                  {day}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MiniCalendar;
