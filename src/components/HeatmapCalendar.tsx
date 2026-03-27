import { useMemo, useState } from 'react';
import { WorkoutSession } from '@/types/workout';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

interface HeatmapCalendarProps {
  sessions: WorkoutSession[];
  open: boolean;
  onClose: () => void;
}

const MONTH_LABELS_NO = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS_NO = ['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'];
const WEEKDAY_LABELS_EN = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getWeekNumber(date: Date): number {
  // ISO week: Monday-based
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const HeatmapCalendar = ({ sessions, open, onClose }: HeatmapCalendarProps) => {
  const { settings } = useSettings();
  const { language } = useTranslation();
  const isDark = settings.darkMode;
  const [year, setYear] = useState(new Date().getFullYear());

  const monthLabels = language === 'no' ? MONTH_LABELS_NO : MONTH_LABELS_EN;
  const weekdayLabels = language === 'no' ? WEEKDAY_LABELS_NO : WEEKDAY_LABELS_EN;

  // Count sessions per date for the selected year
  const countMap = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach(s => {
      const key = s.date.slice(0, 10);
      if (key.startsWith(String(year))) {
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [sessions, year]);

  // Generate grid: 53 weeks x 7 days
  const grid = useMemo(() => {
    const startDate = new Date(year, 0, 1);
    // Adjust to Monday
    const startDow = startDate.getDay() || 7; // 1=Mon..7=Sun
    const gridStart = new Date(startDate);
    gridStart.setDate(gridStart.getDate() - (startDow - 1));

    const weeks: { date: Date; key: string; count: number; inYear: boolean }[][] = [];
    let current = new Date(gridStart);
    
    for (let w = 0; w < 53; w++) {
      const week: { date: Date; key: string; count: number; inYear: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = current.toISOString().slice(0, 10);
        week.push({
          date: new Date(current),
          key,
          count: countMap.get(key) || 0,
          inYear: current.getFullYear() === year,
        });
        current.setDate(current.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  }, [year, countMap]);

  // Total sessions this year
  const totalSessions = useMemo(() => {
    let total = 0;
    countMap.forEach(v => total += v);
    return total;
  }, [countMap]);

  // Active days
  const activeDays = countMap.size;

  // Color scale
  const getColor = (count: number, inYear: boolean) => {
    if (!inYear) return 'transparent';
    if (count === 0) return isDark ? 'hsl(var(--muted) / 0.3)' : 'hsl(var(--muted) / 0.5)';
    if (count === 1) return isDark ? 'hsl(var(--primary) / 0.3)' : 'hsl(var(--primary) / 0.25)';
    if (count === 2) return isDark ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--primary) / 0.45)';
    if (count === 3) return isDark ? 'hsl(var(--primary) / 0.7)' : 'hsl(var(--primary) / 0.65)';
    return isDark ? 'hsl(var(--primary) / 0.9)' : 'hsl(var(--primary) / 0.85)';
  };

  // Month label positions
  const monthPositions = useMemo(() => {
    const positions: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    grid.forEach((week, wIdx) => {
      // Use the first day that's in our year
      const relevantDay = week.find(d => d.inYear);
      if (relevantDay) {
        const month = relevantDay.date.getMonth();
        if (month !== lastMonth) {
          positions.push({ label: monthLabels[month], weekIndex: wIdx });
          lastMonth = month;
        }
      }
    });
    return positions;
  }, [grid, monthLabels]);

  const cellSize = 11;
  const cellGap = 2;
  const leftPad = 20;
  const topPad = 16;
  const totalWidth = leftPad + grid.length * (cellSize + cellGap);
  const totalHeight = topPad + 7 * (cellSize + cellGap);

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-1">
          <div className="flex items-center justify-between">
            <DrawerTitle className="font-display text-lg">
              {language === 'no' ? 'Årsvisning' : 'Year Overview'}
            </DrawerTitle>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4">
          {/* Year selector */}
          <div className="flex items-center justify-center gap-4">
            <button onClick={() => setYear(y => y - 1)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <span className="text-lg font-bold font-display">{year}</span>
            <button 
              onClick={() => setYear(y => Math.min(y + 1, new Date().getFullYear()))} 
              disabled={year >= new Date().getFullYear()}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-6 text-center">
            <div>
              <p className="text-2xl font-bold font-display">{totalSessions}</p>
              <p className="text-[10px] text-muted-foreground">{language === 'no' ? 'økter' : 'sessions'}</p>
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{activeDays}</p>
              <p className="text-[10px] text-muted-foreground">{language === 'no' ? 'aktive dager' : 'active days'}</p>
            </div>
          </div>

          {/* Heatmap */}
          <div className="overflow-x-auto scrollbar-none -mx-2 px-2">
            <svg width={totalWidth} height={totalHeight + 4} className="block">
              {/* Month labels */}
              {monthPositions.map(({ label, weekIndex }) => (
                <text
                  key={`${label}-${weekIndex}`}
                  x={leftPad + weekIndex * (cellSize + cellGap)}
                  y={10}
                  className="fill-muted-foreground"
                  fontSize={9}
                  fontWeight={500}
                >
                  {label}
                </text>
              ))}
              {/* Weekday labels */}
              {[1, 3, 5].map(i => (
                <text
                  key={i}
                  x={0}
                  y={topPad + i * (cellSize + cellGap) + cellSize - 2}
                  className="fill-muted-foreground"
                  fontSize={8}
                >
                  {weekdayLabels[i]}
                </text>
              ))}
              {/* Cells */}
              {grid.map((week, wIdx) =>
                week.map((day, dIdx) => (
                  <rect
                    key={day.key}
                    x={leftPad + wIdx * (cellSize + cellGap)}
                    y={topPad + dIdx * (cellSize + cellGap)}
                    width={cellSize}
                    height={cellSize}
                    rx={2}
                    fill={getColor(day.count, day.inYear)}
                  >
                    <title>{day.inYear ? `${day.key}: ${day.count} ${day.count === 1 ? 'økt' : 'økter'}` : ''}</title>
                  </rect>
                ))
              )}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
            <span>{language === 'no' ? 'Mindre' : 'Less'}</span>
            {[0, 1, 2, 3, 4].map(i => (
              <div
                key={i}
                className="rounded-sm"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor: getColor(i, true),
                }}
              />
            ))}
            <span>{language === 'no' ? 'Mer' : 'More'}</span>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default HeatmapCalendar;
