import { useEffect, useState, useRef } from 'react';

interface ProgressWheelProps {
  percent: number;
  current: number;
  target: number;
  unit: string;
  label?: string;
  title: string;
  hasGoal: boolean;
  onClick?: () => void;
  expectedFraction?: number;
  paceDiff?: number;
  showPaceLabel?: boolean;
}

const RADIUS = 70;
const STROKE = 12;
const PADDING = 18;
const SIZE = (RADIUS + STROKE) * 2 + PADDING * 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const ANIM_DURATION = 1200;

function getPaceColor(diff: number): { main: string; light: string } {
  if (diff >= 5) return { main: 'hsl(152, 58%, 38%)', light: 'hsl(152, 60%, 55%)' };
  if (diff >= 1) return { main: 'hsl(142, 50%, 48%)', light: 'hsl(142, 55%, 65%)' };
  if (diff >= -0.5) return { main: 'hsl(142, 50%, 48%)', light: 'hsl(142, 55%, 65%)' };
  if (diff >= -2) return { main: 'hsl(45, 85%, 48%)', light: 'hsl(48, 90%, 62%)' };
  if (diff >= -5) return { main: 'hsl(25, 85%, 48%)', light: 'hsl(28, 90%, 62%)' };
  return { main: 'hsl(0, 65%, 48%)', light: 'hsl(0, 70%, 62%)' };
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
  percent, current, target, unit, label, title,
  hasGoal, onClick, expectedFraction, paceDiff, showPaceLabel,
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
      setAnimatedValue(startVal + (to - startVal) * easeOutCubic(t));
      if (t < 1) animRef.current = requestAnimationFrame(animate);
      else hasAnimatedInitial.current = true;
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

  const diff = paceDiff ?? 0;
  const paceColors = hasGoal && expectedFraction != null ? getPaceColor(diff) : null;
  const defaultColor = isComplete ? 'hsl(142, 50%, 48%)' : 'hsl(var(--primary))';
  const mainColor = paceColors?.main ?? defaultColor;

  const goldColor = '#D4A843';
  const goldGlow = '#F0D060';
  const safeId = (label || title).replace(/\s+/g, '-');
  const rotation = `rotate(-90 ${CENTER} ${CENTER})`;
  const markerAngle = expectedFraction != null ? expectedFraction * 360 : null;

  // Marker: a bold line across the ring with a small dot
  const renderMarker = () => {
    if (!hasGoal || markerAngle == null || isGold) return null;
    const rad = ((markerAngle - 90) * Math.PI) / 180;
    const innerR = RADIUS - STROKE / 2 - 4;
    const outerR = RADIUS + STROKE / 2 + 4;
    const x1 = CENTER + innerR * Math.cos(rad);
    const y1 = CENTER + innerR * Math.sin(rad);
    const x2 = CENTER + outerR * Math.cos(rad);
    const y2 = CENTER + outerR * Math.sin(rad);
    const dotR = RADIUS + STROKE / 2 + 7;
    const dx = CENTER + dotR * Math.cos(rad);
    const dy = CENTER + dotR * Math.sin(rad);
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="hsl(var(--foreground))" strokeWidth={3} strokeLinecap="round" opacity={0.85} />
        <circle cx={dx} cy={dy} r={3} fill="hsl(var(--foreground))" opacity={0.85} />
      </g>
    );
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-0.5 p-2 pt-3 rounded-2xl glass-card shadow-md hover:shadow-xl transition-all cursor-pointer overflow-visible flex-1 min-w-0"
      aria-label={label}
    >
      <span className="text-xl font-bold text-foreground mb-1">{title}</span>

      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible">
        <defs>
          {/* Gradient fill for the progress ring */}
          <linearGradient id={`ring-grad-${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={paceColors?.light ?? mainColor} />
            <stop offset="100%" stopColor={mainColor} />
          </linearGradient>

          {isGold && (
            <>
              <linearGradient id={`gold-grad-${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={goldGlow} />
                <stop offset="50%" stopColor={goldColor} />
                <stop offset="100%" stopColor={goldGlow} />
              </linearGradient>
              <filter id={`gold-glow-${safeId}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={2 + glowIntensity * 5} result="blur" />
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

          {/* Subtle inner shadow on the background track */}
          <filter id={`track-shadow-${safeId}`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="shadow" />
            <feOffset dx="0" dy="1" result="offset" />
            <feComposite in="SourceGraphic" in2="offset" operator="over" />
          </filter>

          {/* Glow behind the progress ring */}
          <filter id={`ring-glow-${safeId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Background track with depth */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
          stroke="hsl(var(--muted))" strokeWidth={STROKE} opacity={0.2}
          filter={`url(#track-shadow-${safeId})`}
        />
        {/* Slightly darker inner edge for depth illusion */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
          stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.06}
        />

        {/* Achievement pulse */}
        {showAchievement && (
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
            stroke="hsl(142, 55%, 45%)" strokeWidth={STROKE + 4} opacity={0}
            filter={`url(#achieve-glow-${safeId})`}
            className="animate-[achievement-pulse_1.5s_ease-out_forwards]"
          />
        )}

        {/* Progress ring with gradient + glow */}
        <circle
          cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
          stroke={isGold ? `url(#gold-grad-${safeId})` : `url(#ring-grad-${safeId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={fillOffset}
          transform={rotation}
          filter={isGold ? `url(#gold-glow-${safeId})` : `url(#ring-glow-${safeId})`}
        />

        {/* Gold overachieve pulse */}
        {isGold && (
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
            stroke={goldGlow} strokeWidth={STROKE + 4}
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={0}
            transform={rotation} opacity={0}
            className={glowIntensity > 0.5
              ? 'animate-[gold-pulse-strong_2s_ease-in-out_infinite]'
              : 'animate-[gold-pulse_3s_ease-in-out_infinite]'}
            filter={`url(#gold-glow-${safeId})`}
          />
        )}

        {/* Expected progress marker — triangle pointer */}
        {renderMarker()}

        {/* Center text */}
        {hasGoal ? (
          <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="central"
            className="font-display font-bold" fontSize="22"
            fill={isGold ? goldColor : isComplete ? 'hsl(142, 50%, 48%)' : 'hsl(var(--foreground))'}>
            {displayPercent}%
          </text>
        ) : (
          <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="central"
            className="font-display font-medium" fontSize="13" fill="hsl(var(--muted-foreground))">
            Sett mål
          </text>
        )}
      </svg>

      {hasGoal && (
        <span className="text-[13px] font-medium text-muted-foreground">
          {current} / {target} {unit}
        </span>
      )}

      {hasGoal && showPaceLabel && expectedFraction != null && (
        <span className="text-xs font-medium" style={{ color: mainColor }}>
          {getPaceLabel(diff)}
        </span>
      )}

      {label && !showPaceLabel && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
    </button>
  );
};

export default ProgressWheel;
