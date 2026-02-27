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
const PADDING = 16; // extra space for glow
const SIZE = (RADIUS + STROKE) * 2 + PADDING * 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ANIM_DURATION = 1200;

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
  const prevPercentRef = useRef(0);
  const animRef = useRef<number>();
  const [animatedValue, setAnimatedValue] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const hasAnimatedInitial = useRef(false);

  const clampedPercent = Math.max(0, percent);
  const paceDiff = paceMode?.diff ?? 0;

  // The target value we animate towards
  const targetValue = isPace ? paceDiff : clampedPercent;

  useEffect(() => {
    const from = prevPercentRef.current;
    const to = targetValue;
    prevPercentRef.current = to;

    // Check if we crossed 100% (for achievement effect)
    if (!isPace && from < 100 && to >= 100 && hasAnimatedInitial.current) {
      // Will trigger achievement after animation
      const timer = setTimeout(() => {
        setShowAchievement(true);
        setTimeout(() => setShowAchievement(false), 1500);
      }, ANIM_DURATION);
      return () => clearTimeout(timer);
    }
  }, [targetValue, isPace]);

  // Animate value changes
  useEffect(() => {
    const from = animatedValue;
    const to = targetValue;
    if (from === to && hasAnimatedInitial.current) return;

    const start = performance.now();
    const duration = hasAnimatedInitial.current ? 800 : ANIM_DURATION;
    const startVal = hasAnimatedInitial.current ? from : 0;

    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(t);
      setAnimatedValue(startVal + (to - startVal) * eased);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        hasAnimatedInitial.current = true;
      }
    };
    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetValue]);

  // --- Standard percent mode ---
  const displayPercent = Math.round(isPace ? 0 : animatedValue);
  const isGold = !isPace && clampedPercent > 100;
  const isOverAchieve = !isPace && clampedPercent > 100;
  // Glow intensity: scales from 100% to 150% (0→1)
  const glowIntensity = isGold ? Math.min((clampedPercent - 100) / 50, 1) : 0;
  const isComplete = !isPace && clampedPercent >= 100;

  // --- Offsets ---
  const standardFill = Math.min(isPace ? 0 : animatedValue, 100) / 100;
  const animatedStandardOffset = CIRCUMFERENCE * (1 - standardFill);

  const paceFill = isPace ? Math.min(Math.abs(animatedValue) / 20, 1) : 0;
  const paceOffset = CIRCUMFERENCE * (1 - paceFill);

  const animatedDiff = isPace ? animatedValue : 0;

  const diffColor = paceMode ? getDiffColor(paceMode.diff) : '';
  const paceLabel = paceMode ? getPaceLabel(paceMode.diff) : '';
  const diffSign = paceMode && paceMode.diff > 0 ? '+' : '';

  const goldColor = '#D4A843';
  const goldGlow = '#F0D060';

  const offset = isPace ? paceOffset : animatedStandardOffset;
  const percentColor = !isPace ? getPercentColor(isPace ? 0 : animatedValue) : '';

  const safeId = label.replace(/\s+/g, '-');
  const strokeColor = isPace
    ? diffColor
    : isGold
      ? `url(#gold-grad-${safeId})`
      : percentColor;

  const rotation = `rotate(-90 ${CENTER} ${CENTER})`;
  // Pace: negative = counter-clockwise (negate offset), positive = clockwise (normal offset)
  const isNegativePace = isPace && paceMode!.diff < 0;
  const finalOffset = isPace ? (isNegativePace ? -paceOffset : paceOffset) : offset;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-2xl glass-card hover:shadow-lg transition-all cursor-pointer overflow-visible"
      aria-label={label}
    >
      <span className="text-sm font-semibold text-foreground mb-1">{title}</span>

      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="overflow-visible"
      >
        <defs>
          {isGold && (
            <>
              <linearGradient id={`gold-grad-${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={goldGlow} />
                <stop offset="50%" stopColor={goldColor} />
                <stop offset="100%" stopColor={goldGlow} />
              </linearGradient>
              <filter id={`gold-glow-${safeId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={4 + glowIntensity * 10} result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </>
          )}
          {/* Achievement pulse filter */}
          {showAchievement && (
            <filter id={`achieve-glow-${safeId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Background ring */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="hsl(var(--muted))" strokeWidth={STROKE} opacity={0.5} />

        {/* Achievement pulse ring */}
        {showAchievement && (
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
            stroke="hsl(120, 55%, 45%)"
            strokeWidth={STROKE + 4}
            opacity={0}
            filter={`url(#achieve-glow-${safeId})`}
            className="animate-[achievement-pulse_1.5s_ease-out_forwards]"
          />
        )}

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
          filter={isGold ? `url(#gold-glow-${safeId})` : undefined}
        />

        {/* Over-achieve pulsing glow */}
        {isOverAchieve && (
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
            stroke={goldGlow}
            strokeWidth={STROKE + 4}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={0}
            transform={rotation}
            opacity={0}
            className={glowIntensity > 0.5
              ? 'animate-[gold-pulse-strong_2s_ease-in-out_infinite]'
              : 'animate-[gold-pulse_3s_ease-in-out_infinite]'}
            filter={`url(#gold-glow-${safeId})`}
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
                fill={isGold ? goldColor : isComplete ? 'hsl(120, 55%, 45%)' : 'hsl(var(--foreground))'}>
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

      <span className="text-xs font-medium text-muted-foreground">
        {isPace && hasGoal ? paceLabel : label}
      </span>
    </button>
  );
};

export default ProgressWheel;
