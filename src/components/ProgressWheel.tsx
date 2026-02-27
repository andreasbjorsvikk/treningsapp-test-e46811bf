import { useMemo } from 'react';

interface ProgressWheelProps {
  percent: number;
  current: number;
  target: number;
  unit: string;
  label: string;
  hasGoal: boolean;
  onClick?: () => void;
  /** If set, wheel shows pace diff instead of percent */
  paceMode?: {
    diff: number; // e.g. +5 or -5
    expected: number;
  };
}

const RADIUS = 70;
const STROKE = 10;
const SIZE = (RADIUS + STROKE) * 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Map a diff value to a color. Negative: yellow→orange→red. Positive: yellow→green. */
function getDiffColor(diff: number): string {
  const absDiff = Math.abs(diff);
  if (absDiff <= 1) return 'hsl(45, 80%, 55%)'; // neutral yellow
  if (diff > 0) {
    if (absDiff <= 5) return 'hsl(80, 65%, 50%)';  // light green
    if (absDiff <= 10) return 'hsl(120, 55%, 45%)'; // green
    return 'hsl(140, 60%, 40%)'; // deep green
  } else {
    if (absDiff <= 5) return 'hsl(30, 85%, 55%)';  // orange
    if (absDiff <= 10) return 'hsl(10, 75%, 55%)'; // light red
    return 'hsl(0, 70%, 45%)'; // dark red
  }
}

function getPaceLabel(diff: number): string {
  if (Math.abs(diff) <= 1) return 'Du er i rute';
  if (diff > 0) return 'Du ligger foran skjema';
  return 'Du ligger bak skjema';
}

const ProgressWheel = ({
  percent,
  current,
  target,
  unit,
  label,
  hasGoal,
  onClick,
  paceMode,
}: ProgressWheelProps) => {
  const isPace = !!paceMode;

  // --- Standard percent mode ---
  const clampedPercent = Math.max(0, percent);
  const displayPercent = Math.round(clampedPercent);
  const isGold = !isPace && clampedPercent >= 100;
  const isOverAchieve = !isPace && clampedPercent > 100;

  const standardOffset = useMemo(() => {
    const p = Math.min(clampedPercent, 100) / 100;
    return CIRCUMFERENCE * (1 - p);
  }, [clampedPercent]);

  // --- Pace mode ---
  const paceOffset = useMemo(() => {
    if (!paceMode) return CIRCUMFERENCE;
    // Map diff to a visual fill: 0 diff = empty ring, ±15 = half ring
    const absFill = Math.min(Math.abs(paceMode.diff) / 15, 1) * 0.5;
    return CIRCUMFERENCE * (1 - absFill);
  }, [paceMode]);

  const diffColor = paceMode ? getDiffColor(paceMode.diff) : '';
  const paceLabel = paceMode ? getPaceLabel(paceMode.diff) : '';
  const diffSign = paceMode && paceMode.diff > 0 ? '+' : '';

  // Gold color for standard mode
  const goldColor = '#D4A843';
  const goldGlow = '#F0D060';

  const offset = isPace ? paceOffset : standardOffset;
  const strokeColor = isPace
    ? diffColor
    : isGold
      ? `url(#gold-grad-${label})`
      : 'hsl(var(--primary))';

  // For pace mode, rotate so that negative goes left from top, positive goes right
  const rotation = isPace && paceMode!.diff < 0
    ? `rotate(-90 ${CENTER} ${CENTER}) scale(-1, 1)` 
    : `rotate(-90 ${CENTER} ${CENTER})`;
  const transformOrigin = isPace && paceMode!.diff < 0 ? `${CENTER}px ${CENTER}px` : undefined;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl glass-card hover:shadow-lg transition-all cursor-pointer"
      aria-label={label}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="drop-shadow-sm"
      >
        <defs>
          {isGold && (
            <>
              <linearGradient id={`gold-grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={goldGlow} />
                <stop offset="50%" stopColor={goldColor} />
                <stop offset="100%" stopColor={goldGlow} />
              </linearGradient>
              <filter id={`gold-glow-${label}`}>
                <feGaussianBlur stdDeviation={isOverAchieve ? 6 : 3} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </>
          )}
        </defs>

        {/* Background ring */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="hsl(var(--muted))" strokeWidth={STROKE} opacity={0.5} />

        {/* Progress ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={rotation}
          style={transformOrigin ? { transformOrigin } : undefined}
          filter={isGold ? `url(#gold-glow-${label})` : undefined}
          className="transition-all duration-700 ease-out"
        />

        {/* Over-achieve shine */}
        {isOverAchieve && (
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="white" strokeWidth={2} strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * 0.08} ${CIRCUMFERENCE * 0.92}`}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            opacity={0.35}
            className="animate-[spin_8s_linear_infinite]"
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          />
        )}

        {/* Center text */}
        {hasGoal ? (
          isPace ? (
            <>
              <text x={CENTER} y={CENTER - 4} textAnchor="middle" dominantBaseline="central"
                className="font-display font-bold" fontSize="24" fill={diffColor}>
                {diffSign}{Math.round(paceMode!.diff)}
              </text>
              <text x={CENTER} y={CENTER + 18} textAnchor="middle" dominantBaseline="central"
                fontSize="10" fill="hsl(var(--muted-foreground))">
                {current} / {Math.round(paceMode!.expected)} forventet
              </text>
            </>
          ) : (
            <>
              <text x={CENTER} y={CENTER - 4} textAnchor="middle" dominantBaseline="central"
                className="font-display font-bold" fontSize="22"
                fill={isGold ? goldColor : 'hsl(var(--foreground))'}>
                {displayPercent}%
              </text>
              <text x={CENTER} y={CENTER + 18} textAnchor="middle" dominantBaseline="central"
                fontSize="11" fill="hsl(var(--muted-foreground))">
                {current} / {target} {unit}
              </text>
            </>
          )
        ) : (
          <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="central"
            className="font-display font-medium" fontSize="13" fill="hsl(var(--muted-foreground))">
            Sett mål
          </text>
        )}
      </svg>

      {/* Label below wheel */}
      <span className="text-xs font-medium text-muted-foreground">
        {isPace && hasGoal ? paceLabel : label}
      </span>
    </button>
  );
};

export default ProgressWheel;
