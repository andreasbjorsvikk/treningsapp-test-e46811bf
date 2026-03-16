import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { WorkoutSession, HealthEvent } from '@/types/workout';
import { sessionTypeConfig, formatDuration } from '@/utils/workoutUtils';
import { getActivityColors } from '@/utils/activityColors';
import ActivityIcon from '@/components/ActivityIcon';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Route, Mountain, Clock, Ambulance, Cross } from 'lucide-react';
import DayDrawer from '@/components/DayDrawer';
import HealthEventDialog from '@/components/HealthEventDialog';
import { useTranslation } from '@/i18n/useTranslation';
// Tooltips for health events use native DOM for reliability inside memoized renders

// Weekday and month labels are now provided via translation keys
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
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const appData = useAppDataContext();
  const sundayStart = settings.firstDayOfWeek === 'sunday';
  const weekdayKeys = sundayStart
    ? ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const weekdays = weekdayKeys.map(k => t(`calendar.weekdays.${k}`));
  const now = new Date();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showTodayButton, setShowTodayButton] = useState(false);
  const [, setRefresh] = useState(0);
  const [editHealthEvent, setEditHealthEvent] = useState<HealthEvent | undefined>();
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);

  const isDark = settings.darkMode;

  // Infinite scroll state: track range of months to render
  const [rangeStart, setRangeStart] = useState({ year: now.getFullYear() - 1, month: now.getMonth() });
  const [rangeEnd, setRangeEnd] = useState({ year: now.getFullYear() + 1, month: now.getMonth() });
  const initialScrollDone = useRef(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const currentMonthRef = useRef<HTMLDivElement>(null);
  const hasScrolledToToday = useRef(false);

  const allSessions = appData.sessions;
  const healthEvents = appData.healthEvents;

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, WorkoutSession[]>();
    allSessions.forEach(s => {
      const key = s.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return map;
  }, [allSessions]);

  // Build a set of dates that have health events
  const healthEventDates = useMemo(() => {
    const map = new Map<string, HealthEvent[]>();
    healthEvents.forEach(he => {
      const from = new Date(he.dateFrom);
      const to = he.dateTo ? new Date(he.dateTo) : from;
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(he);
      }
    });
    return map;
  }, [healthEvents]);

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
  // Calculate the target scroll position for the calendar.
  // On mobile: offset so ~2 rows of previous month are visible above.
  // On desktop/tablet: current month header at top.
  const getTargetScroll = useCallback(() => {
    if (!currentMonthRef.current || !scrollRef.current) return 0;
    const container = scrollRef.current;
    const target = currentMonthRef.current;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scrollOffset = targetRect.top - containerRect.top + container.scrollTop;
    return Math.max(0, scrollOffset - (isMobile ? 120 : 0));
  }, [isMobile]);

  // iOS Safari fix: hide the container until we've scrolled to the right position
  // to prevent the visible "jump" effect.
  const [scrollReady, setScrollReady] = useState(false);

  useEffect(() => {
    setScrollReady(false);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }

    let cancelled = false;
    const doScroll = () => {
      if (cancelled) return;
      if (scrollRef.current) {
        scrollRef.current.scrollTop = getTargetScroll();
      }
    };

    // Try immediately
    doScroll();
    // Then again after layout settles
    requestAnimationFrame(() => {
      doScroll();
      requestAnimationFrame(() => {
        doScroll();
        if (!cancelled) setScrollReady(true);
        setTimeout(() => {
          // One final correction for iOS Safari where layout can shift
          doScroll();
          hasScrolledToToday.current = true;
        }, 100);
      });
    });

    return () => { cancelled = true; };
  }, [getTargetScroll]);

  // Infinite scroll handler - debounced for performance
  // IMPORTANT: disabled until initial scroll-to-today is complete
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = useCallback(() => {
    if (!hasScrolledToToday.current) return;
    if (scrollTimeoutRef.current) return;
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
      const el = scrollRef.current;
      if (!el) return;

      // Check if current month is visible
      if (currentMonthRef.current) {
        const containerRect = el.getBoundingClientRect();
        const monthRect = currentMonthRef.current.getBoundingClientRect();
        const isVisible = monthRect.bottom > containerRect.top && monthRect.top < containerRect.bottom;
        setShowTodayButton(!isVisible);
      }

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
    <div className="flex flex-wrap gap-[3px] justify-center w-full mt-0">
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
        className="mb-6 relative"
      >
        {/* Month header */}
        <div className={`rounded-2xl px-4 py-3 mb-2 text-center relative overflow-hidden ${isCurrentMonth ? 'shadow-md' : 'glass-card'}`}
          style={isCurrentMonth ? {
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--primary) / 0.04))`,
            border: '1px solid hsl(var(--primary) / 0.2)',
          } : undefined}
        >
          {isCurrentMonth && (
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse at 30% 50%, hsl(var(--primary) / 0.08), transparent 70%)',
            }} />
          )}
          <h2 className={`font-display font-bold text-lg relative z-10 ${isCurrentMonth ? 'text-primary' : ''}`}>
            {t(`calendar.monthNames.${monthData.month}`)} {monthData.year}
          </h2>
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-[3px] lg:gap-1 px-[2px]">
          {grid.map((cell, i) => {
            if (cell.isEmpty) {
              return <div key={i} className={`${isMobile ? 'min-h-[56px]' : 'min-h-[80px] lg:min-h-[100px]'}`} />;
            }
            const dateKey = toDateKey(cell.year, cell.month, cell.day);
            const daySessions = sessionsByDate.get(dateKey) || [];
            const dayHealthEvents = healthEventDates.get(dateKey) || [];
            const isToday = dateKey === todayKey;
            const isSelected = dateKey === selectedDay;
            const sessionCount = daySessions.length;
            const hasHealth = dayHealthEvents.length > 0;

            let cellStyle: React.CSSProperties = {};
            if (sessionCount === 1) {
              const colors = getActivityColors(daySessions[0].type, isDark);
              cellStyle = { backgroundColor: colors.bg, color: colors.text };
            }

            const isMulti = sessionCount >= 2;

              return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedDay(dateKey)}
                className={`
                  relative flex flex-col rounded-lg overflow-hidden transition-all duration-150 cursor-pointer
                  ${isMobile ? 'min-h-[56px]' : 'min-h-[80px] lg:min-h-[100px]'}
                  ${!isMulti && sessionCount === 0
                    ? (cell.isCurrentMonth
                      ? 'bg-card hover:brightness-95 dark:hover:brightness-110'
                      : 'bg-muted/30 opacity-40')
                    : ''
                  }
                  ${!cell.isCurrentMonth && sessionCount === 0 ? 'opacity-40' : ''}
                  ${isSelected ? 'ring-2 ring-primary' : ''}
                  ${isToday && !isSelected ? 'ring-2 ring-primary/40' : ''}
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
                    <span className="text-[10px] lg:text-xs font-semibold z-10 absolute top-1 left-1.5"
                      style={{ color: isDark ? '#fff' : '#333' }}>
                      {cell.day}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`
                      text-[10px] lg:text-xs font-semibold absolute top-1 left-1.5 z-10
                      ${!cell.isCurrentMonth ? 'text-muted-foreground/40' : ''}
                    `}>
                      {cell.day}
                    </span>

                    {sessionCount === 1 && (
                      <>
                        {isMobile ? (
                          <div className="flex-1 flex items-center justify-center w-full pt-2">
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
                {/* Health event indicator */}
                {hasHealth && (
                  <div
                    className="absolute top-0 right-0 z-20 cursor-pointer p-1 group"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditHealthEvent(dayHealthEvents[0]);
                      setHealthDialogOpen(true);
                    }}
                    onMouseEnter={(e) => {
                      const target = e.currentTarget;
                      // Remove any existing tooltip
                      const existing = document.getElementById('health-tooltip');
                      if (existing) existing.remove();
                      
                      const tooltip = document.createElement('div');
                      tooltip.id = 'health-tooltip';
                      tooltip.className = 'fixed z-[9999] px-3 py-1.5 text-xs rounded-md border bg-popover text-popover-foreground shadow-md pointer-events-none';
                      const label = dayHealthEvents[0].type === 'sickness' ? 'Sykdom' : 'Skade';
                      const notes = dayHealthEvents[0].notes ? `: ${dayHealthEvents[0].notes}` : '';
                      tooltip.textContent = label + notes;
                      document.body.appendChild(tooltip);
                      
                      const rect = target.getBoundingClientRect();
                      tooltip.style.left = `${rect.left + rect.width / 2 - tooltip.offsetWidth / 2}px`;
                      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 4}px`;
                    }}
                    onMouseLeave={() => {
                      const existing = document.getElementById('health-tooltip');
                      if (existing) existing.remove();
                    }}
                  >
                    {dayHealthEvents[0].type === 'sickness' ? (
                      <Ambulance className="w-3 h-3 text-destructive hover:scale-125 transition-transform" />
                    ) : (
                      <Cross className="w-3 h-3 text-destructive hover:scale-125 transition-transform" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [sundayStart, sessionsByDate, todayKey, selectedDay, isDark, isMobile]);

  const scrollToToday = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = getTargetScroll();
      setShowTodayButton(false);
    }
  }, [getTargetScroll]);

  return (
    <div className="space-y-1 relative">
      {/* "I dag" button */}
      {showTodayButton && (
        <button
          onClick={scrollToToday}
          className="absolute top-0 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg hover:bg-primary/90 transition-colors animate-in fade-in slide-in-from-top-2 duration-200"
        >
          I dag
        </button>
      )}

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
        className={`overflow-y-auto transition-opacity duration-100 scrollbar-none ${scrollReady ? 'opacity-100' : 'opacity-0'}`}
        style={{
          maxHeight: 'calc(100vh - 160px)',
          contain: 'layout style',
          willChange: 'scroll-position',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        } as React.CSSProperties}
      >
        {months.map(m => renderMonth(m))}
      </div>

      {/* Day drawer */}
      <DayDrawer
        dateKey={selectedDay}
        sessions={selectedSessions}
        healthEvents={selectedDay ? (healthEventDates.get(selectedDay) || []) : []}
        onClose={() => setSelectedDay(null)}
        onRefresh={triggerRefresh}
        onNavigateToCalendar={() => setSelectedDay(null)}
      />

      {/* Health event edit dialog */}
      <HealthEventDialog
        open={healthDialogOpen}
        onClose={() => { setHealthDialogOpen(false); setEditHealthEvent(undefined); }}
        onSave={async (data) => {
          if (editHealthEvent) {
            await appData.updateHealthEvent(editHealthEvent.id, data);
          }
          triggerRefresh();
        }}
        event={editHealthEvent}
      />
    </div>
  );
};

export default CalendarPage;
