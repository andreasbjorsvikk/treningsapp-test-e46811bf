import { useState, useMemo, useCallback } from 'react';
import { WorkoutSession } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import { sessionTypeConfig, formatDuration } from '@/utils/workoutUtils';
import ActivityIcon from '@/components/ActivityIcon';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
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

// Generate light tint for light mode background
function lightTint(hex: string, amount = 0.82): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.round((num >> 16) + (255 - (num >> 16)) * amount);
  const g = Math.round(((num >> 8) & 0xff) + (255 - ((num >> 8) & 0xff)) * amount);
  const b = Math.round((num & 0xff) + (255 - (num & 0xff)) * amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// Generate muted dark tint for dark mode background
function darkTint(hex: string, amount = 0.55): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.round((num >> 16) * amount);
  const g = Math.round(((num >> 8) & 0xff) * amount);
  const b = Math.round((num & 0xff) * amount);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

const MONTH_NAMES = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
];

// Badge component for a single session icon
const SessionBadge = ({ session, size = 'md', getTypeColor }: { 
  session: WorkoutSession; 
  size?: 'sm' | 'md' | 'lg';
  getTypeColor: (type: string) => string;
}) => {
  const color = getTypeColor(session.type);
  const sizeClasses = {
    sm: 'w-5 h-5 rounded-[5px]',
    md: 'w-7 h-7 rounded-lg',
    lg: 'w-9 h-9 md:w-10 md:h-10 rounded-lg',
  };
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5 md:w-6 md:h-6',
  };

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center shrink-0`}
      style={{ backgroundColor: color }}
    >
      <ActivityIcon type={session.type} className={iconSizes[size]} />
    </div>
  );
};

const CalendarPage = () => {
  const { settings, getTypeColor } = useSettings();
  const isMobile = useIsMobile();
  const sundayStart = settings.firstDayOfWeek === 'sunday';
  const weekdays = sundayStart ? WEEKDAYS_SUN : WEEKDAYS_MON;
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [, setRefresh] = useState(0);

  // Detect dark mode
  const isDark = document.documentElement.classList.contains('dark');

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

  const getBgColor = (hex: string) => isDark ? darkTint(hex) : lightTint(hex);

  // Render session stats for desktop
  const renderStats = (s: WorkoutSession) => (
    <div className="text-[9px] lg:text-[10px] leading-tight text-inherit opacity-80 space-y-0">
      {s.distance != null && <div>{s.distance} km</div>}
      {s.elevationGain != null && <div>{s.elevationGain} m</div>}
      <div>{formatDuration(s.durationMinutes)}</div>
    </div>
  );

  // Render a single-session cell content for desktop
  const renderSingleDesktop = (s: WorkoutSession) => {
    const config = sessionTypeConfig[s.type];
    const title = s.title || config.label;
    return (
      <div className="flex flex-col h-full w-full p-1.5 lg:p-2">
        <div className="font-bold text-[10px] lg:text-xs leading-tight truncate mb-1">
          {title}
        </div>
        <div className="flex items-start gap-1.5 mt-auto">
          <SessionBadge session={s} size="lg" getTypeColor={getTypeColor} />
          <div className="min-w-0 flex-1">
            {renderStats(s)}
          </div>
        </div>
      </div>
    );
  };

  // Render two-session cell for desktop (split vertically)
  const renderTwoDesktop = (sessions: WorkoutSession[]) => (
    <div className="flex h-full w-full">
      {sessions.slice(0, 2).map((s) => {
        const config = sessionTypeConfig[s.type];
        const color = getTypeColor(s.type);
        const bg = getBgColor(color);
        const title = s.title || config.label;
        return (
          <div
            key={s.id}
            className="flex-1 flex flex-col items-center p-1 lg:p-1.5 min-w-0"
            style={{ backgroundColor: bg, color: isDark ? '#e5e5e5' : '#333' }}
          >
            <div className="font-bold text-[8px] lg:text-[9px] truncate w-full text-center mb-0.5">
              {title.slice(0, 5)}..
            </div>
            <SessionBadge session={s} size="md" getTypeColor={getTypeColor} />
          </div>
        );
      })}
    </div>
  );

  // Render three-session cell for desktop
  const renderThreeDesktop = (sessions: WorkoutSession[]) => (
    <div className="flex flex-col h-full w-full">
      {/* Top row: first session on right */}
      <div className="flex flex-1">
        <div className="flex-1" />
        <div
          className="flex-1 flex items-center justify-center p-0.5"
          style={{ backgroundColor: getBgColor(getTypeColor(sessions[0].type)) }}
        >
          <SessionBadge session={sessions[0]} size="sm" getTypeColor={getTypeColor} />
        </div>
      </div>
      {/* Bottom row: two sessions */}
      <div className="flex flex-1">
        {sessions.slice(1, 3).map((s) => (
          <div
            key={s.id}
            className="flex-1 flex items-center justify-center p-0.5"
            style={{ backgroundColor: getBgColor(getTypeColor(s.type)) }}
          >
            <SessionBadge session={s} size="sm" getTypeColor={getTypeColor} />
          </div>
        ))}
      </div>
    </div>
  );

  // Render mobile content (badges only)
  const renderMobile = (sessions: WorkoutSession[]) => (
    <div className="flex flex-wrap gap-[3px] justify-center mt-1">
      {sessions.slice(0, 4).map((s) => (
        <SessionBadge key={s.id} session={s} size="sm" getTypeColor={getTypeColor} />
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Month header */}
      <div className="flex items-center justify-between glass-card rounded-2xl px-4 py-3">
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
          <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1.5">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-[3px] lg:gap-1">
        {grid.map((cell, i) => {
          const dateKey = toDateKey(cell.year, cell.month, cell.day);
          const daySessions = sessionsByDate.get(dateKey) || [];
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDay;
          const sessionCount = daySessions.length;

          // Determine cell background
          let cellBg: string | undefined;
          let cellTextColor: string | undefined;
          if (sessionCount === 1 && !isMobile) {
            const color = getTypeColor(daySessions[0].type);
            cellBg = getBgColor(color);
            cellTextColor = isDark ? '#e5e5e5' : '#333';
          }

          return (
            <button
              key={i}
              onClick={() => setSelectedDay(dateKey)}
              className={`
                relative flex flex-col rounded-lg overflow-hidden transition-all duration-150
                ${isMobile ? 'min-h-[56px]' : 'min-h-[80px] lg:min-h-[100px]'}
                ${cell.isCurrentMonth
                  ? 'bg-card hover:brightness-95 dark:hover:brightness-110'
                  : 'bg-muted/30 opacity-40'
                }
                ${isSelected ? 'ring-2 ring-success' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-success/50' : ''}
              `}
              style={cellBg ? { backgroundColor: cellBg, color: cellTextColor } : undefined}
            >
              {/* Day number */}
              <span className={`
                text-[10px] lg:text-xs font-semibold absolute top-1 left-1.5 z-10
                ${!cell.isCurrentMonth ? 'text-muted-foreground/40' : ''}
                ${isToday
                  ? 'bg-success text-success-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] static mt-1 ml-1'
                  : ''
                }
              `}>
                {cell.day}
              </span>

              {/* Session content */}
              {sessionCount > 0 && (
                <>
                  {isMobile ? (
                    // Mobile: badges only
                    <div className="flex-1 flex items-center justify-center pt-4">
                      {renderMobile(daySessions)}
                    </div>
                  ) : (
                    // Desktop: full content
                    <div className="flex-1 flex flex-col w-full pt-3">
                      {sessionCount === 1 && renderSingleDesktop(daySessions[0])}
                      {sessionCount === 2 && renderTwoDesktop(daySessions)}
                      {sessionCount >= 3 && renderThreeDesktop(daySessions)}
                    </div>
                  )}
                </>
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
