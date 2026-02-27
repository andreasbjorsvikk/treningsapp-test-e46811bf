import { useState, useMemo, useCallback } from 'react';
import { WorkoutSession } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import { sessionTypeConfig } from '@/utils/workoutUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DayDrawer from '@/components/DayDrawer';

const WEEKDAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  // Monday=0 based
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

  // Previous month padding
  for (let i = startDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true });
  }

  // Next month padding to fill 6 rows (42 cells) or at least complete current row
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
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [, setRefresh] = useState(0);

  const allSessions = workoutService.getAll();

  // Group sessions by date key
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    allSessions.forEach(s => {
      const key = s.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [allSessions]);

  const grid = useMemo(() => getMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

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
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h2 className="font-display font-bold text-lg">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </h2>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border/30 rounded-lg overflow-hidden">
        {grid.map((cell, i) => {
          const dateKey = toDateKey(cell.year, cell.month, cell.day);
          const daySessions = sessionsByDate.get(dateKey) || [];
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDay;

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(dateKey)}
              className={`
                relative flex flex-col items-center p-1 min-h-[56px] md:min-h-[72px] transition-colors
                ${cell.isCurrentMonth ? 'bg-card' : 'bg-muted/30'}
                ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
                hover:bg-accent/10
              `}
            >
              <span className={`
                text-xs font-medium leading-none mt-1
                ${!cell.isCurrentMonth ? 'text-muted-foreground/40' : ''}
                ${isToday ? 'bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center' : ''}
              `}>
                {cell.day}
              </span>

              {/* Session type badges */}
              {daySessions.length > 0 && (
                <div className="flex flex-wrap gap-0.5 mt-1 justify-center max-w-full">
                  {daySessions.slice(0, 3).map((s) => {
                    const config = sessionTypeConfig[s.type];
                    const Icon = config.icon;
                    return (
                      <div
                        key={s.id}
                        className={`${config.color} rounded-sm p-0.5`}
                        title={config.label}
                      >
                        <Icon className="w-2.5 h-2.5 md:w-3 md:h-3" />
                      </div>
                    );
                  })}
                  {daySessions.length > 3 && (
                    <span className="text-[9px] text-muted-foreground font-medium">
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
