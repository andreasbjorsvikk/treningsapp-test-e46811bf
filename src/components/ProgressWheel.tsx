import { useMemo, useEffect, useState, useRef } from 'react';

interface ProgressWheelProps {
  percent: number;
  current: number;
  target: number;
  unit: string;
  label?: string;
  title: string;
  hasGoal: boolean;
  onClick?: () => void;
  /** Expected progress as fraction 0-1 (where on the ring the "today" marker sits) */
  expectedFraction?: number;
  /** Difference: current - expected (positive = ahead, negative = behind) */
  paceDiff?: number;
  /** Show pace label below wheel (only on home page) */
  showPaceLabel?: boolean;
}

const RADIUS = 70;
const STROKE = 14;
const PADDING = 16;
const SIZE = (RADIUS + STROKE) * 2 + PADDING * 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ANIM_DURATION = 1200;

/** Color based on pace difference */
function getPaceColor(diff: number): string {
  if (diff >= 5) return 'hsl(140, 60%, 40%)';     // strong green
  if (diff >= 1) return 'hsl(120, 45%, 55%)';      // light green
  if (diff >= -0.5) return 'hsl(120, 45%, 55%)';   // on track = light green
  if (diff >= -2) return 'hsl(45, 85%, 50%)';      // yellow
  if (diff >= -5) return 'hsl(25, 90%, 50%)';      // orange
  return 'hsl(0, 70%, 50%)';                        // red
}

function getPaceLabel(diff: number): string {
  const rounded = Math.round(Math.abs(diff));
  if (Math.abs(diff) < 0.5) return 'Du er i rute';
  if (diff > 0) return `${rounded} ${rounded === 1 ? 'økt' : 'økter'} foran skjema`;
  return `${rounded} ${rounded === 1 ? 'økt' : 'økter'} bak skjema`;
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
  expectedFraction,
  paceDiff,
  showPaceLabel,
}: ProgressWheelProps) => {
  const animRef = useRef<number>();
  const [animatedValue, setAnimatedValue] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const hasAnimatedInitial = useRef(false);
  const prevRef = useRef(0);

  const clampedPercent = Math.max(0, percent);

  useEffect(() => {
    const from = prevRef.current;
    const to = clampedPercent;
    prevRef.current = to;
    if (from < 100 && to >= 100 && hasAnimatedInitial.current) {
      const timer = setTimeout(() => {
        setShowAchievement(true);
        setTimeout(() => setShowAchievement(false), 1500);
      }, ANIM_DURATION);
      return () => clearTimeout(timer);
    }
  }, [clampedPercent]);

  useEffect(() => {
    const from = animatedValue;
    const to = clampedPercent;
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
  }, [clampedPercent]);

  const displayPercent = Math.round(animatedValue);
  const fillFraction = Math.min(animatedValue, 100) / 100;
  const fillOffset = CIRCUMFERENCE * (1 - fillFraction);

  const isGold = clampedPercent > 100;
  const isComplete = clampedPercent >= 100;
  const glowIntensity = isGold ? Math.min((clampedPercent - 100) / 50, 1) : 0;

  // Determine ring color from pace
  const diff = paceDiff ?? 0;
  const ringColor = hasGoal && expectedFraction != null
    ? getPaceColor(diff)
    : isComplete
      ? 'hsl(120, 55%, 45%)'
      : 'hsl(var(--primary))';

  const goldColor = '#D4A843';
  const goldGlow = '#F0D060';
  const safeId = (label || title).replace(/\s+/g, '-');
  const strokeColor = isGold ? `url(#gold-grad-${safeId})` : ringColor;
  const rotation = `rotate(-90 ${CENTER} ${CENTER})`;

  // Marker line for expected progress
  const markerAngle = expectedFraction != null ? expectedFraction * 360 : null;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 p-2 pt-3 rounded-2xl glass-card shadow-md hover:shadow-xl transition-all cursor-pointer overflow-visible flex-1 min-w-0"
      aria-label={label}
    >
      <span className="text-xl font-bold text-foreground mb-1">{title}</span>

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
          {showAchievement && (
            <filter id={`achieve-glow-${safeId}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
          <filter id={`ring-shadow-${safeId}`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.25)" />
          </filter>
        </defs>

        {/* Background ring */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="hsl(var(--muted))" strokeWidth={STROKE} opacity={0.3} />

        {/* Achievement pulse */}
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

        {/* Fill ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={fillOffset}
          transform={rotation}
          filter={isGold ? `url(#gold-glow-${safeId})` : `url(#ring-shadow-${safeId})`}
        />

        {/* Gold overachieve pulse */}
        {isGold && (
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

        {/* Expected progress marker line */}
        {hasGoal && markerAngle != null && !isGold && (
          (() => {
            const rad = ((markerAngle - 90) * Math.PI) / 180;
            const innerR = RADIUS - STROKE / 2 - 3;
            const outerR = RADIUS + STROKE / 2 + 3;
            const x1 = CENTER + innerR * Math.cos(rad);
            const y1 = CENTER + innerR * Math.sin(rad);
            const x2 = CENTER + outerR * Math.cos(rad);
            const y2 = CENTER + outerR * Math.sin(rad);
            return (
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="hsl(var(--foreground))"
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={0.7}
              />
            );
          })()
        )}

        {/* Center text */}
        {hasGoal ? (
          <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="central"
            className="font-display font-bold" fontSize="22"
            fill={isGold ? goldColor : isComplete ? 'hsl(120, 55%, 45%)' : 'hsl(var(--foreground))'}>
            {displayPercent}%
          </text>
        ) : (
          <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="central"
            className="font-display font-medium" fontSize="13" fill="hsl(var(--muted-foreground))">
            Sett mål
          </text>
        )}
      </svg>

      {/* Session count below wheel */}
      {hasGoal && (
        <span className="text-[13px] font-medium text-muted-foreground">
          {current} / {target} {unit}
        </span>
      )}

      {/* Pace label - only on home */}
      {hasGoal && showPaceLabel && expectedFraction != null && (
        <span className="text-xs font-medium text-muted-foreground">
          {getPaceLabel(diff)}
        </span>
      )}

      {/* Fallback label */}
      {label && !showPaceLabel && (
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
      )}
    </button>
  );
};

export default ProgressWheel;
