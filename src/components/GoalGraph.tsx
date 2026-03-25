import { useMemo } from 'react';
import { PrimaryGoalPeriod, WorkoutSession } from '@/types/workout';
import { getMonthTarget } from '@/services/primaryGoalService';
import { useTranslation } from '@/i18n/useTranslation';

interface GoalGraphProps {
  sessions: WorkoutSession[];
  periods: PrimaryGoalPeriod[];
  onClick?: () => void;
  compact?: boolean;
}

const GoalGraph = ({ sessions, periods, onClick, compact }: GoalGraphProps) => {
  const { t } = useTranslation();

  const data = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Find earliest goal start
    const sorted = [...periods].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
    const earliest = sorted.length > 0 ? new Date(sorted[0].validFrom) : null;

    // Show months from when goal was set until now
    const months: { month: number; year: number; label: string; count: number; target: number }[] = [];
    
    if (!earliest) return months;

    const startMonth = earliest.getMonth();
    const startYear = earliest.getFullYear();
    
    // Calculate total months from earliest to now
    const totalMonths = (currentYear - startYear) * 12 + (currentMonth - startMonth) + 1;
    const monthsToShow = Math.max(2, Math.min(totalMonths, 24));

    for (let i = monthsToShow - 1; i >= 0; i--) {
      let m = currentMonth - i;
      let y = currentYear;
      while (m < 0) { m += 12; y--; }
      const count = sessions.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === m && d.getFullYear() === y;
      }).length;
      const target = getMonthTarget(periods, y, m);
      const label = t(`month.${m}`).slice(0, 3);
      months.push({ month: m, year: y, label, count, target });
    }
    return months;
  }, [sessions, periods, t]);

  // Find max value for scaling
  const maxVal = Math.max(...data.map(d => Math.max(d.count, d.target)), 1);

  const width = 100;
  const height = compact ? 18 : 50;
  const padX = 4;
  const padTop = 2;
  const padBottom = compact ? 5 : 8;
  const graphH = height - padTop - padBottom;
  const step = data.length > 1 ? (width - padX * 2) / (data.length - 1) : 0;

  const getY = (val: number) => padTop + graphH - (val / maxVal) * graphH;
  const getX = (i: number) => padX + i * step;

  // Build smooth curve path using catmull-rom to bezier
  const buildSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(i - 1, 0)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const sessionPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.count) }));
  const targetPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.target) }));

  const sessionPath = buildSmoothPath(sessionPoints);
  // Target line uses straight segments so goal changes are clearly visible
  const targetPath = targetPoints.length >= 2
    ? targetPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  // Color logic for dots
  const getDotColor = (d: { count: number; target: number }) => {
    if (d.target === 0) return 'hsl(var(--muted-foreground))';
    const roundedTarget = Math.round(d.target);
    const diff = d.count - roundedTarget;
    if (diff > 0) return '#D4A017'; // rich gold - over target
    if (diff >= 0) return '#22c55e'; // green - hit target
    if (diff >= -2) return '#f97316'; // orange - 1-2 under
    return '#ef4444'; // red - 3+ under
  };

  const getGlowId = (d: { count: number; target: number }) => {
    if (d.target === 0) return null;
    const roundedTarget = Math.round(d.target);
    const diff = d.count - roundedTarget;
    if (diff > 0) return 'glowGold';
    if (diff >= 0) return 'glowGreen';
    if (diff >= -2) return 'glowOrange';
    return 'glowRed';
  };

  const hasGoal = periods.length > 0;

  return (
    <div
      className="w-full cursor-pointer rounded-lg px-1 py-0"
      onClick={onClick}
    >
      {!hasGoal ? (
        <div className="flex items-center justify-center h-full min-h-[24px]">
          <span className="text-[10px] text-muted-foreground">{t('home.noGoalSet') || 'Sett et mål for å se grafen'}</span>
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Target line - dashed, subtle */}
          <path
            d={targetPath}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="0.25"
            strokeDasharray="1.5 1"
            opacity="0.4"
          />

          {/* Gradient fill under session line */}
          <defs>
            <linearGradient id="goalGraphGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.1" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
            {/* Gold glow - strong */}
            <filter id="glowGold" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="0.8" result="blur" />
              <feFlood floodColor="#D4A017" floodOpacity="0.7" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {/* Subtle glows for other colors */}
            <filter id="glowGreen" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="0.4" result="blur" />
              <feFlood floodColor="#22c55e" floodOpacity="0.3" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowOrange" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="0.4" result="blur" />
              <feFlood floodColor="#f97316" floodOpacity="0.25" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowRed" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="0.4" result="blur" />
              <feFlood floodColor="#ef4444" floodOpacity="0.25" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {sessionPoints.length > 1 && (
            <path
              d={`${sessionPath} L ${sessionPoints[sessionPoints.length - 1].x} ${padTop + graphH} L ${sessionPoints[0].x} ${padTop + graphH} Z`}
              fill="url(#goalGraphGrad)"
            />
          )}

          {/* Session line - smooth, subtle */}
          <path
            d={sessionPath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.4"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Dots with glow */}
          {data.map((d, i) => {
            const filterId = getGlowId(d);
            return (
              <circle
                key={i}
                cx={getX(i)}
                cy={getY(d.count)}
                r={compact ? "1.5" : "1.6"}
                fill={getDotColor(d)}
                stroke="hsl(var(--background))"
                strokeWidth="0.25"
                filter={filterId ? `url(#${filterId})` : undefined}
              />
            );
          })}

          {/* Month labels - show all */}
          {data.map((d, i) => (
            <text
              key={`label-${i}`}
              x={getX(i)}
              y={height - 0.3}
              textAnchor="middle"
              fontSize={compact ? "3.5" : "3.2"}
              fill="hsl(var(--muted-foreground))"
              opacity="0.7"
            >
              {d.label}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
};

export default GoalGraph;
