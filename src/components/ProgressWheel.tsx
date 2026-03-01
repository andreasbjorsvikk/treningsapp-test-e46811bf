import { useEffect, useState, useRef, ReactNode } from 'react';
import { useTranslation } from '@/i18n/useTranslation';

interface ProgressWheelProps {
  percent: number;
  current: number;
  target: number;
  unit: string;
  label?: string;
  title: string;
  titleOverride?: ReactNode;
  hasGoal: boolean;
  onClick?: () => void;
  expectedFraction?: number;
  paceDiff?: number;
  showPaceLabel?: boolean;
  compact?: boolean;
  naked?: boolean;
  disableAchievement?: boolean;
}

const ANIM_DURATION = 1200;

function getPaceColor(diff: number): { main: string; light: string } {
  if (diff >= 5) return { main: 'hsl(152, 58%, 38%)', light: 'hsl(152, 60%, 55%)' };
  if (diff >= 1) return { main: 'hsl(142, 50%, 48%)', light: 'hsl(142, 55%, 65%)' };
  if (diff >= -0.5) return { main: 'hsl(142, 50%, 48%)', light: 'hsl(142, 55%, 65%)' };
  if (diff >= -2) return { main: 'hsl(45, 85%, 48%)', light: 'hsl(48, 90%, 62%)' };
  if (diff >= -5) return { main: 'hsl(25, 85%, 48%)', light: 'hsl(28, 90%, 62%)' };
  return { main: 'hsl(0, 65%, 48%)', light: 'hsl(0, 70%, 62%)' };
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const ProgressWheel = ({
  percent, current, target, unit, label, title, titleOverride,
  hasGoal, onClick, expectedFraction, paceDiff, showPaceLabel, compact, naked, disableAchievement,
}: ProgressWheelProps) => {
  const { t } = useTranslation();

  const RADIUS = compact ? 50 : 62;
  const STROKE = compact ? 9 : 12;
  const PADDING = compact ? 12 : 18;
  const SIZE = (RADIUS + STROKE) * 2 + PADDING * 2;
  const CENTER = SIZE / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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
    if (from < 100 && to >= 100 && hasAnimatedInitial.current && !disableAchievement) {
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
  const safeId = (label || title || 'wheel').replace(/\s+/g, '-') + '-' + Math.random().toString(36).slice(2, 6);
  const rotation = `rotate(-90 ${CENTER} ${CENTER})`;
  const markerAngle = expectedFraction != null ? expectedFraction * 360 : null;

  // Pace label
  const getPaceLabel = (d: number): string => {
    const rounded = Math.round(Math.abs(d));
    if (Math.abs(d) < 0.5) return t('wheel.onTrack');
    const unitWord = rounded === 1 ? t('wheel.session') : t('wheel.sessions');
    if (d > 0) return t('wheel.ahead', { n: rounded, unit: unitWord });
    return t('wheel.behind', { n: rounded, unit: unitWord });
  };

  const renderMarker = () => {
    if (!hasGoal || markerAngle == null || isGold) return null;
    const rad = ((markerAngle - 90) * Math.PI) / 180;
    // Small tick mark sitting on the outer edge, spanning ~half the stroke
    const tickLen = STROKE * 0.65;
    const outerR = RADIUS + STROKE / 2 + (compact ? 2 : 3);
    const innerR = outerR - tickLen;
    const halfWidth = compact ? 2.2 : 3;
    const perpRad = rad + Math.PI / 2;
    // Outer edge points (wider)
    const ox1 = CENTER + outerR * Math.cos(rad) + halfWidth * Math.cos(perpRad);
    const oy1 = CENTER + outerR * Math.sin(rad) + halfWidth * Math.sin(perpRad);
    const ox2 = CENTER + outerR * Math.cos(rad) - halfWidth * Math.cos(perpRad);
    const oy2 = CENTER + outerR * Math.sin(rad) - halfWidth * Math.sin(perpRad);
    // Inner tip (narrower, pointing inward)
    const ix = CENTER + innerR * Math.cos(rad);
    const iy = CENTER + innerR * Math.sin(rad);
    return (
      <polygon
        points={`${ox1},${oy1} ${ix},${iy} ${ox2},${oy2}`}
        fill="hsl(var(--foreground))"
        opacity={0.7}
        strokeLinejoin="round"
      />
    );
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 ${naked ? 'p-0' : compact ? 'p-1 pt-1.5 rounded-2xl glass-card shadow-md hover:shadow-xl' : 'p-2 pt-3 rounded-2xl glass-card shadow-md hover:shadow-xl'} transition-all ${onClick ? 'cursor-pointer' : ''} overflow-visible flex-1 min-w-0`}
      aria-label={label}
    >
      {titleOverride ? (
        <div className="mb-0.5">{titleOverride}</div>
      ) : title ? (
        <span className={`${compact ? 'text-sm' : 'text-xl'} font-bold text-foreground mb-1`}>{title}</span>
      ) : null}

      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible">
        <defs>
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

          <filter id={`track-shadow-${safeId}`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="shadow" />
            <feOffset dx="0" dy="1" result="offset" />
            <feComposite in="SourceGraphic" in2="offset" operator="over" />
          </filter>

          <filter id={`ring-glow-${safeId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
          stroke="hsl(var(--muted))" strokeWidth={STROKE} opacity={0.2}
          filter={`url(#track-shadow-${safeId})`}
        />
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
          stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.06}
        />

        {showAchievement && (
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
            stroke="hsl(142, 55%, 45%)" strokeWidth={STROKE + 4} opacity={0}
            filter={`url(#achieve-glow-${safeId})`}
            className="animate-[achievement-pulse_1.5s_ease-out_forwards]"
          />
        )}

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

        {renderMarker()}

        {hasGoal ? (
          <>
            <text x={CENTER} y={CENTER - (compact ? 2 : 4)} textAnchor="middle" dominantBaseline="central"
              className="font-display font-bold" fontSize={compact ? 16 : 22}
              fill={isGold ? goldColor : isComplete ? 'hsl(142, 50%, 48%)' : 'hsl(var(--foreground))'}>
              {current} / {target}
            </text>
            <text x={CENTER} y={CENTER + (compact ? 14 : 18)} textAnchor="middle" dominantBaseline="central"
              className="font-display font-medium" fontSize={compact ? 10 : 12}
              fill="hsl(var(--muted-foreground))">
              {unit}
            </text>
          </>
        ) : (
          <text x={CENTER} y={CENTER} textAnchor="middle" dominantBaseline="central"
            className="font-display font-medium" fontSize={compact ? 10 : 13} fill="hsl(var(--muted-foreground))">
            {t('wheel.setGoal')}
          </text>
        )}
      </svg>

      {hasGoal && showPaceLabel && expectedFraction != null && (
        <span className="text-xs font-medium" style={{ color: mainColor }}>
          {getPaceLabel(diff)}
        </span>
      )}

      {label && !showPaceLabel && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
    </Wrapper>
  );
};

export default ProgressWheel;
