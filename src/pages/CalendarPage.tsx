import { useState, useMemo, useCallback } from 'react';
import { WorkoutSession } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import { sessionTypeConfig } from '@/utils/workoutUtils';
import ActivityIcon from '@/components/ActivityIcon';
import { useSettings } from '@/contexts/SettingsContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DayDrawer from '@/components/DayDrawer';

const WEEKDAYS_MON = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const WEEKDAYS_SUN = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

function getMonthGrid(year: number, month: number, sundayStart: boolean) {
  const firstDay = new Date(year, month, 1);
  let startDay: number;
  if (sundayStart) {
    startDay = firstDay.getDay();
  } else {
    startDay = firstDay.getDay() - 1;
    if (startDay < 0) startDay = 6;
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true });
  }

  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      cells.push({ day: i, month: m, year: y, isCurrentMonth: false });
    }
  }

  return cells;
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
];

const CalendarPage = () => {
  const { settings, getTypeColor } = useSettings();
  const sundayStart = settings.firstDayOfWeek === 'sunday';
  const weekdays = sundayStart ? WEEKDAYS_SUN : WEEKDAYS_MON;
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [, setRefresh] = useState(0);

  const allSessions = workoutService.getAll();

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    allSessions.forEach(s => {
      const key = s.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [allSessions]);

  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth, sundayStart), [viewYear, viewMonth, sundayStart]);

  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const triggerRefresh = useCallback(() => setRefresh(r => r + 1), []);

  const selectedSessions = selectedDay ? (sessionsByDate.get(selectedDay) || []) : [];

  return (
    <div className="space-y-4">
      {/* Month header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-full hover:bg-primary/10">
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-display font-bold text-lg">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-full hover:bg-primary/10">
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7">
        {weekdays.map(d => (
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid - modern card style */}
      <div className="grid grid-cols-7 gap-1 lg:gap-1.5">
        {grid.map((cell, i) => {
          const dateKey = toDateKey(cell.year, cell.month, cell.day);
          const daySessions = sessionsByDate.get(dateKey) || [];
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDay;
          const hasSessions = daySessions.length > 0;

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(dateKey)}
              className={`
                relative flex flex-col items-center rounded-xl p-1 min-h-[60px] md:min-h-[76px] transition-all duration-200
                ${cell.isCurrentMonth
                  ? 'bg-card shadow-sm hover:shadow-md hover:-translate-y-0.5'
                  : 'bg-muted/20 opacity-50'
                }
                ${isSelected
                  ? 'ring-2 ring-primary shadow-lg shadow-primary/20 scale-[1.02]'
                  : ''
                }
                ${isToday && !isSelected
                  ? 'ring-1 ring-primary/40'
                  : ''
                }
              `}
            >
              <span className={`
                text-xs font-semibold leading-none mt-1.5 transition-colors
                ${!cell.isCurrentMonth ? 'text-muted-foreground/40' : 'text-foreground'}
                ${isToday
                  ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]'
                  : ''
                }
              `}>
                {cell.day}
              </span>

              {/* Session type dots/badges */}
              {hasSessions && (
                <div className="flex flex-wrap gap-[3px] mt-1.5 justify-center max-w-full">
                  {daySessions.slice(0, 3).map((s) => {
                    const config = sessionTypeConfig[s.type];
                    const typeColor = getTypeColor(s.type);
                    return (
                      <div
                        key={s.id}
                        className="rounded-md p-[3px] shadow-sm"
                        style={{
                          backgroundColor: typeColor,
                          boxShadow: `0 2px 6px ${typeColor}40`,
                        }}
                        title={config.label}
                      >
                        <ActivityIcon type={s.type} className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      </div>
                    );
                  })}
                  {daySessions.length > 3 && (
                    <span className="text-[9px] text-muted-foreground font-bold bg-muted rounded-full w-4 h-4 flex items-center justify-center">
                      +{daySessions.length - 3}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Day drawer */}
      <DayDrawer
        dateKey={selectedDay}
        sessions={selectedSessions}
        onClose={() => setSelectedDay(null)}
        onRefresh={triggerRefresh}
      />
    </div>
  );
};

export default CalendarPage;
