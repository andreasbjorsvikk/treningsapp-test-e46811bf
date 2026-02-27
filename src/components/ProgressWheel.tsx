import { useMemo, useEffect, useState, useRef } from 'react';

interface ProgressWheelProps {
  percent: number;
  current: number;
  target: number;
  unit: string;
  label: string;
  title: string;
  hasGoal: boolean;
  onClick?: () => void;
  paceMode?: {
    diff: number;
    expected: number;
  };
}

const RADIUS = 70;
const STROKE = 10;
const SIZE = (RADIUS + STROKE) * 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ANIM_DURATION = 1200; // ms

function getDiffColor(diff: number): string {
  const absDiff = Math.abs(diff);
  if (absDiff <= 1) return 'hsl(45, 80%, 55%)';
  if (diff > 0) {
    if (absDiff <= 5) return 'hsl(80, 65%, 50%)';
    if (absDiff <= 10) return 'hsl(120, 55%, 45%)';
    return 'hsl(140, 60%, 40%)';
  } else {
    if (absDiff <= 5) return 'hsl(30, 85%, 55%)';
    if (absDiff <= 10) return 'hsl(10, 75%, 55%)';
    return 'hsl(0, 70%, 45%)';
  }
}

/** Map percent 0–100 to color: red → orange → yellow → light green → green */
function getPercentColor(p: number): string {
  if (p <= 20) return 'hsl(0, 70%, 50%)';
  if (p <= 40) return 'hsl(10, 75%, 55%)';
  if (p <= 55) return 'hsl(30, 85%, 55%)';
  if (p <= 70) return 'hsl(45, 80%, 55%)';
  if (p <= 85) return 'hsl(80, 65%, 50%)';
  return 'hsl(120, 55%, 45%)';
}

function getPaceLabel(diff: number): string {
  if (Math.abs(diff) <= 1) return 'Du er i rute';
  if (diff > 0) return 'Du ligger foran skjema';
  return 'Du ligger bak skjema';
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const ProgressWheel = ({
  percent,
  current,
  target,
  unit,
  label,
  title,
  hasGoal,
  onClick,
  paceMode,
}: ProgressWheelProps) => {
  const isPace = !!paceMode;
  const animRef = useRef<number>();
  const [animProgress, setAnimProgress] = useState(0); // 0 to 1

  // Animate on mount
  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / ANIM_DURATION, 1);
      setAnimProgress(easeOutCubic(t));
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, []);

  // --- Standard percent mode ---
  const clampedPercent = Math.max(0, percent);
  const animatedPercent = clampedPercent * animProgress;
  const displayPercent = Math.round(animatedPercent);
  const isGold = !isPace && clampedPercent >= 100;
  const isOverAchieve = !isPace && clampedPercent > 100;

  const standardOffset = useMemo(() => {
    const p = Math.min(clampedPercent, 100) / 100;
    return CIRCUMFERENCE * (1 - p);
  }, [clampedPercent]);

  // --- Pace mode ---
  const targetFill = useMemo(() => {
    if (!paceMode) return 0;
    return Math.min(Math.abs(paceMode.diff) / 20, 1);
  }, [paceMode]);

  const paceOffset = CIRCUMFERENCE * (1 - targetFill * animProgress);

  const animatedDiff = paceMode ? paceMode.diff * animProgress : 0;
  const animatedCurrent = Math.round(current * animProgress * 10) / 10;

  const diffColor = paceMode ? getDiffColor(paceMode.diff) : '';
  const paceLabel = paceMode ? getPaceLabel(paceMode.diff) : '';
  const diffSign = paceMode && paceMode.diff > 0 ? '+' : '';

  const goldColor = '#D4A843';
  const goldGlow = '#F0D060';

  // Animated offset for standard mode
  const animatedStandardOffset = useMemo(() => {
    const p = Math.min(clampedPercent, 100) / 100 * animProgress;
    return CIRCUMFERENCE * (1 - p);
  }, [clampedPercent, animProgress]);

  const offset = isPace ? paceOffset : animatedStandardOffset;

  // Month wheel: color based on animated percent; gold if >=100
  const percentColor = !isPace ? getPercentColor(animatedPercent) : '';

  const strokeColor = isPace
    ? diffColor
    : isGold
      ? `url(#gold-grad-${label})`
      : percentColor;

  // Pace mode: always counter-clockwise from top. Use negative dashoffset for that.
  // Standard: clockwise from top.
  const rotation = `rotate(-90 ${CENTER} ${CENTER})`;
  // For pace: negate the offset to draw counter-clockwise
  const finalOffset = isPace ? -paceOffset : offset;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-4 rounded-2xl glass-card hover:shadow-lg transition-all cursor-pointer"
      aria-label={label}
    >
      {/* Title above wheel */}
      <span className="text-sm font-semibold text-foreground mb-1">{title}</span>

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
          strokeDashoffset={finalOffset}
          transform={rotation}
          filter={isGold ? `url(#gold-glow-${label})` : undefined}
        />

        {/* Over-achieve shine */}
        {isOverAchieve && animProgress >= 1 && (
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
                {diffSign}{Math.round(animatedDiff)}
              </text>
              <text x={CENTER} y={CENTER + 18} textAnchor="middle" dominantBaseline="central"
                fontSize="11" fill="hsl(var(--muted-foreground))">
                {current} / {target} {unit}
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
