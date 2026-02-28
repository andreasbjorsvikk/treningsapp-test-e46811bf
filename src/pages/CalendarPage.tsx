import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { WorkoutSession } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import { sessionTypeConfig, formatDuration } from '@/utils/workoutUtils';
import { getActivityColors } from '@/utils/activityColors';
import ActivityIcon from '@/components/ActivityIcon';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Route, Mountain, Clock } from 'lucide-react';
import DayDrawer from '@/components/DayDrawer';

const WEEKDAYS_MON = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const WEEKDAYS_SUN = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

const MONTH_NAMES = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'
];

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

  const cells: { day: number; month: number; year: number; isCurrentMonth: boolean; isEmpty: boolean }[] = [];

  // Empty cells before the first day
  for (let i = 0; i < startDay; i++) {
    cells.push({ day: 0, month, year, isCurrentMonth: false, isEmpty: true });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true, isEmpty: false });
  }

  // Empty cells after the last day
  const remaining = 7 - (cells.length % 7);
  if (remaining < 7) {
    for (let i = 0; i < remaining; i++) {
      cells.push({ day: 0, month, year, isCurrentMonth: false, isEmpty: true });
    }
  }

  return cells;
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Returns array of {year, month} for a range of months around current */
function getMonthRange(startYear: number, startMonth: number, endYear: number, endMonth: number) {
  const months: { year: number; month: number }[] = [];
  let y = startYear, m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    months.push({ year: y, month: m });
    m++;
    if (m > 11) { m = 0; y++; }
  }
  return months;
}

// Badge component for a single session icon
const SessionBadge = ({ session, size = 'md', isDark }: {
  session: WorkoutSession;
  size?: 'sm' | 'sm-single' | 'md' | 'lg';
  isDark: boolean;
}) => {
  const colors = getActivityColors(session.type, isDark);
  const sizeClasses = {
    sm: 'w-4 h-4 max-w-4 max-h-4 rounded-[4px]',
    'sm-single': 'w-7 h-7 max-w-7 max-h-7 rounded-[7px]',
    md: 'w-10 h-10 max-w-10 max-h-10 lg:w-11 lg:h-11 lg:max-w-11 lg:max-h-11 rounded-lg',
    lg: 'w-12 h-12 max-w-12 max-h-12 lg:w-14 lg:h-14 lg:max-w-14 lg:max-h-14 rounded-xl',
  };
  const iconSizes = {
    sm: 'w-[14px] h-[14px] max-w-[14px] max-h-[14px]',
    'sm-single': 'w-[20px] h-[20px] max-w-[20px] max-h-[20px]',
    md: 'w-6 h-6 max-w-6 max-h-6 lg:w-7 lg:h-7',
    lg: 'w-8 h-8 max-w-8 max-h-8 lg:w-9 lg:h-9',
  };

  const isStyrke = session.type === 'styrke';

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center shrink-0`}
      style={{
        backgroundColor: colors.badge,
        boxShadow: isDark
          ? 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 6px rgba(0,0,0,0.3)'
          : 'inset 0 1px 1px rgba(255,255,255,0.5), 0 1px 4px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <ActivityIcon
        type={session.type}
        className={iconSizes[size]}
        colorOverride={!isDark ? colors.text : undefined}
        style={isStyrke ? { marginLeft: '1px' } : undefined}
      />
    </div>
  );
};

const CalendarPage = () => {
  const { settings } = useSettings();
  const isMobile = useIsMobile();
  const sundayStart = settings.firstDayOfWeek === 'sunday';
  const weekdays = sundayStart ? WEEKDAYS_SUN : WEEKDAYS_MON;
  const now = new Date();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [, setRefresh] = useState(0);

  const isDark = settings.darkMode;

  // Infinite scroll state: track range of months to render
  const [rangeStart, setRangeStart] = useState({ year: now.getFullYear() - 1, month: now.getMonth() });
  const [rangeEnd, setRangeEnd] = useState({ year: now.getFullYear() + 1, month: now.getMonth() });
  const initialScrollDone = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMonthRef = useRef<HTMLDivElement>(null);
  const hasScrolledToToday = useRef(false);

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

  const months = useMemo(
    () => getMonthRange(rangeStart.year, rangeStart.month, rangeEnd.year, rangeEnd.month),
    [rangeStart, rangeEnd]
  );

  const todayKey = toDateKey(now.getFullYear(), now.getMonth(), now.getDate());

  const triggerRefresh = useCallback(() => setRefresh(r => r + 1), []);

  const selectedSessions = selectedDay ? (sessionsByDate.get(selectedDay) || []) : [];

  // Scroll to current month on first render
  // iOS Safari: layout of large DOM is async, so we retry multiple times.
  // KEY FIX: We scroll on EVERY timeout (not just the first success) because
  // early attempts may calculate wrong offsets before layout is stable.
  // We also disable infinite scroll until initial scroll is done, because
  // the infinite scroll handler was firing first (scrollTop=0 < 300) and
  // adding extra months at the top, shifting the target position.
  useEffect(() => {
    const delays = [100, 300, 600, 1000, 1500, 2000];
    const timers: ReturnType<typeof setTimeout>[] = [];
    
    delays.forEach(delay => {
      timers.push(setTimeout(() => {
        if (currentMonthRef.current && scrollRef.current) {
          const container = scrollRef.current;
          const target = currentMonthRef.current;
          const containerRect = container.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const scrollOffset = targetRect.top - containerRect.top + container.scrollTop;
          container.scrollTop = scrollOffset;
        }
      }, delay));
    });

    // Mark initial scroll as done after the last timeout
    timers.push(setTimeout(() => {
      hasScrolledToToday.current = true;
    }, 2100));
    
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  // Infinite scroll handler - debounced for performance
  // IMPORTANT: disabled until initial scroll-to-today is complete
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = useCallback(() => {
    if (!hasScrolledToToday.current) return; // Don't run until initial scroll is done
    if (scrollTimeoutRef.current) return; // throttle
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
      const el = scrollRef.current;
      if (!el) return;

      if (el.scrollTop < 300) {
        const prevHeight = el.scrollHeight;
        setRangeStart(prev => ({
          year: prev.year - 1,
          month: prev.month,
        }));
        requestAnimationFrame(() => {
          if (el) {
            const newHeight = el.scrollHeight;
            el.scrollTop += (newHeight - prevHeight);
          }
        });
      }

      if (el.scrollHeight - el.scrollTop - el.clientHeight < 300) {
        setRangeEnd(prev => ({
          year: prev.year + 1,
          month: prev.month,
        }));
      }
    }, 100);
  }, []);

  // Render session stats for desktop
  const renderStats = (s: WorkoutSession, textColor: string) => (
    <div className="text-[11px] lg:text-xs leading-snug space-y-0.5" style={{ color: textColor, opacity: 0.85 }}>
      {s.distance != null && (
        <div className="flex items-center gap-0.5">
          <Route className="w-2.5 h-2.5 opacity-60 shrink-0" />
          <span>{s.distance} km</span>
        </div>
      )}
      {s.elevationGain != null && (
        <div className="flex items-center gap-0.5">
          <Mountain className="w-2.5 h-2.5 opacity-60 shrink-0" />
          <span>{s.elevationGain} m</span>
        </div>
      )}
      <div className="flex items-center gap-0.5">
        <Clock className="w-2.5 h-2.5 opacity-60 shrink-0" />
        <span>{formatDuration(s.durationMinutes)}</span>
      </div>
    </div>
  );

  // Render a single-session cell content for desktop/tablet
  const renderSingleDesktop = (s: WorkoutSession) => {
    const config = sessionTypeConfig[s.type];
    const colors = getActivityColors(s.type, isDark);
    const title = s.title || config.label;
    return (
      <div className="flex flex-col h-full w-full p-1.5 lg:p-2" style={{ color: colors.text }}>
        <div className="font-bold text-[11px] lg:text-sm leading-tight truncate mb-1">
          {title}
        </div>
        <div className="flex items-center justify-center md:justify-start gap-1.5 mt-auto">
          <SessionBadge session={s} size="lg" isDark={isDark} />
          <div className="min-w-0 flex-1 hidden lg:block">
            {renderStats(s, colors.text)}
          </div>
        </div>
      </div>
    );
  };

  // Render two-session cell for desktop
  const renderTwoDesktop = (sessions: WorkoutSession[]) => (
    <div className="flex h-full w-full">
      {sessions.slice(0, 2).map((s) => {
        const config = sessionTypeConfig[s.type];
        const colors = getActivityColors(s.type, isDark);
        const title = s.title || config.label;
        return (
          <div
            key={s.id}
            className="flex-1 flex flex-col items-center justify-center p-1 lg:p-1.5 min-w-0"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            <div className="font-bold text-[10px] md:text-[11px] lg:text-xs truncate w-full text-center mb-0.5 px-0.5">
              {title}
            </div>
            <SessionBadge session={s} size="md" isDark={isDark} />
          </div>
        );
      })}
    </div>
  );

  // Render three-session cell for desktop
  const renderThreeDesktop = (sessions: WorkoutSession[]) => (
    <div className="flex flex-col h-full w-full">
      <div
        className="flex-1 flex items-center justify-center"
        style={{ backgroundColor: getActivityColors(sessions[0].type, isDark).bg }}
      >
        <SessionBadge session={sessions[0]} size="md" isDark={isDark} />
      </div>
      <div className="flex flex-1">
        {sessions.slice(1, 3).map((s) => (
          <div
            key={s.id}
            className="flex-1 flex items-center justify-center"
            style={{ backgroundColor: getActivityColors(s.type, isDark).bg }}
          >
            <SessionBadge session={s} size="md" isDark={isDark} />
          </div>
        ))}
      </div>
    </div>
  );

  // Render mobile content for multi-session cells
  const renderMobileMulti = (sessions: WorkoutSession[]) => {
    if (sessions.length === 2) {
      return (
        <div className="flex h-full w-full">
          {sessions.slice(0, 2).map((s) => {
            const colors = getActivityColors(s.type, isDark);
            return (
              <div
                key={s.id}
                className="flex-1 flex items-center justify-center pt-1"
                style={{ backgroundColor: colors.bg }}
              >
                <SessionBadge session={s} size="sm" isDark={isDark} />
              </div>
            );
          })}
        </div>
      );
    }
    return (
      <div className="flex flex-col h-full w-full">
        <div
          className="flex-1 flex items-center justify-end pr-1"
          style={{ backgroundColor: getActivityColors(sessions[0].type, isDark).bg }}
        >
          <SessionBadge session={sessions[0]} size="sm" isDark={isDark} />
        </div>
        <div className="flex flex-1">
          {sessions.slice(1, 3).map((s) => (
            <div
              key={s.id}
              className="flex-1 flex items-center justify-center"
              style={{ backgroundColor: getActivityColors(s.type, isDark).bg }}
            >
              <SessionBadge session={s} size="sm" isDark={isDark} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render mobile single session
  const renderMobileSingle = (sessions: WorkoutSession[]) => (
    <div className="flex flex-wrap gap-[3px] justify-center mt-0">
      {sessions.slice(0, 4).map((s) => (
        <SessionBadge key={s.id} session={s} size="sm-single" isDark={isDark} />
      ))}
    </div>
  );

  // Render a single month grid
  const renderMonth = useCallback((monthData: { year: number; month: number }) => {
    const grid = getMonthGrid(monthData.year, monthData.month, sundayStart);
    const isCurrentMonth = monthData.year === now.getFullYear() && monthData.month === now.getMonth();

    return (
      <div
        key={`${monthData.year}-${monthData.month}`}
        ref={isCurrentMonth ? currentMonthRef : undefined}
        className="mb-4"
      >
        {/* Month header */}
        <div className={`rounded-2xl px-4 py-3 mb-2 text-center ${isCurrentMonth ? 'glass-card border-l-4 border-primary/40' : 'glass-card'}`}>
          <h2 className={`font-display font-bold text-lg ${isCurrentMonth ? 'text-primary' : ''}`}>
            {MONTH_NAMES[monthData.month]} {monthData.year}
          </h2>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-[3px] lg:gap-1">
          {grid.map((cell, i) => {
            if (cell.isEmpty) {
              return <div key={i} className={`${isMobile ? 'min-h-[56px]' : 'min-h-[80px] lg:min-h-[100px]'}`} />;
            }
            const dateKey = toDateKey(cell.year, cell.month, cell.day);
            const daySessions = sessionsByDate.get(dateKey) || [];
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDay;
            const sessionCount = daySessions.length;

            let cellStyle: React.CSSProperties = {};
            if (sessionCount === 1) {
              const colors = getActivityColors(daySessions[0].type, isDark);
              cellStyle = { backgroundColor: colors.bg, color: colors.text };
            }

            const isMulti = sessionCount >= 2;

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(dateKey)}
                className={`
                  relative flex flex-col rounded-lg overflow-hidden transition-all duration-150
                  ${isMobile ? 'min-h-[56px]' : 'min-h-[80px] lg:min-h-[100px]'}
                  ${!isMulti && sessionCount === 0
                    ? (cell.isCurrentMonth
                      ? 'bg-card hover:brightness-95 dark:hover:brightness-110'
                      : 'bg-muted/30 opacity-40')
                    : ''
                  }
                  ${!cell.isCurrentMonth && sessionCount === 0 ? 'opacity-40' : ''}
                  ${isSelected ? 'ring-2 ring-success' : ''}
                  ${isToday && !isSelected ? 'ring-1 ring-success/50' : ''}
                `}
                style={!isMulti ? cellStyle : undefined}
              >
                {isMulti ? (
                  <>
                    <div className="absolute inset-0">
                      {isMobile ? (
                        renderMobileMulti(daySessions)
                      ) : (
                        sessionCount === 2 ? renderTwoDesktop(daySessions) : renderThreeDesktop(daySessions)
                      )}
                    </div>
                    <span className={`
                      text-[10px] lg:text-xs font-semibold z-10 absolute top-1 left-1.5
                      ${isToday
                        ? 'bg-success text-success-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]'
                        : ''
                      }
                    `} style={!isToday ? { color: isDark ? '#fff' : '#333' } : undefined}>
                      {cell.day}
                    </span>
                  </>
                ) : (
                  <>
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

                    {sessionCount === 1 && (
                      <>
                        {isMobile ? (
                          <div className="flex-1 flex items-center justify-center pt-2">
                            {renderMobileSingle(daySessions)}
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col w-full pt-3">
                            {renderSingleDesktop(daySessions[0])}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }, [sundayStart, sessionsByDate, todayKey, selectedDay, isDark, isMobile]);

  return (
    <div className="space-y-1">
      {/* Sticky weekday headers */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-1">
        <div className="grid grid-cols-7">
          {weekdays.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-1.5">
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable months container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto"
        style={{
          maxHeight: 'calc(100vh - 160px)',
          contain: 'layout style',
          willChange: 'scroll-position',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {months.map(m => renderMonth(m))}
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
