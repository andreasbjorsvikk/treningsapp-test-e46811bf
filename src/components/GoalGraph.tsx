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

const GoalGraph = ({ sessions, periods, onClick }: GoalGraphProps) => {
  const { t } = useTranslation();

  const data = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Show last 12 months including current
    const months: { month: number; year: number; label: string; count: number; target: number }[] = [];
    for (let i = 11; i >= 0; i--) {
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
  const height = 50;
  const padX = 4;
  const padTop = 6;
  const padBottom = 8;
  const graphH = height - padTop - padBottom;
  const step = (width - padX * 2) / (data.length - 1);

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
  const targetPath = buildSmoothPath(targetPoints);

  // Color logic for dots
  const getDotColor = (d: { count: number; target: number }) => {
    if (d.target === 0) return 'hsl(var(--muted-foreground))';
    const diff = d.count - d.target;
    if (diff > 0) return '#FFD700'; // gold - over target
    if (diff === 0) return '#22c55e'; // green - hit target
    if (diff >= -2) return '#f97316'; // orange - 1-2 under
    return '#ef4444'; // red - 3+ under
  };

  const hasGoal = periods.length > 0;

  return (
    <div
      className="w-full cursor-pointer rounded-lg px-1 py-0.5"
      onClick={onClick}
    >
      {!hasGoal ? (
        <div className="flex items-center justify-center h-full min-h-[48px]">
          <span className="text-[10px] text-muted-foreground">{t('home.noGoalSet') || 'Sett et mål for å se grafen'}</span>
        </div>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
          {/* Target line - dashed, subtle */}
          <path
            d={targetPath}
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="0.4"
            strokeDasharray="1.5 1"
            opacity="0.5"
          />

          {/* Gradient fill under session line */}
          <defs>
            <linearGradient id="goalGraphGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            </linearGradient>
          </defs>
          {sessionPoints.length > 1 && (
            <path
              d={`${sessionPath} L ${sessionPoints[sessionPoints.length - 1].x} ${padTop + graphH} L ${sessionPoints[0].x} ${padTop + graphH} Z`}
              fill="url(#goalGraphGrad)"
            />
          )}

          {/* Session line - smooth */}
          <path
            d={sessionPath}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="0.7"
            strokeLinecap="round"
          />

          {/* Dots */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={getX(i)}
              cy={getY(d.count)}
              r="1.3"
              fill={getDotColor(d)}
              stroke="hsl(var(--background))"
              strokeWidth="0.3"
            />
          ))}

          {/* Month labels - show every 2nd or 3rd */}
          {data.map((d, i) => (
            i % 2 === 0 ? (
              <text
                key={`label-${i}`}
                x={getX(i)}
                y={height - 1}
                textAnchor="middle"
                fontSize="2.5"
                fill="hsl(var(--muted-foreground))"
                opacity="0.7"
              >
                {d.label}
              </text>
            ) : null
          ))}
        </svg>
      )}
    </div>
  );
};

export default GoalGraph;
