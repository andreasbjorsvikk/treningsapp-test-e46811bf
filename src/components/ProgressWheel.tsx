import { useMemo } from 'react';

interface ProgressWheelProps {
  percent: number;
  current: number;
  target: number;
  unit: string;
  label: string;
  /** 'ahead' | 'behind' | 'on-track' — only used for year wheel */
  paceStatus?: 'ahead' | 'behind' | 'on-track';
  hasGoal: boolean;
  onClick?: () => void;
}

const RADIUS = 70;
const STROKE = 10;
const SIZE = (RADIUS + STROKE) * 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const ProgressWheel = ({
  percent,
  current,
  target,
  unit,
  label,
  paceStatus = 'on-track',
  hasGoal,
  onClick,
}: ProgressWheelProps) => {
  const clampedPercent = Math.max(0, percent);
  const displayPercent = Math.round(clampedPercent);
  const isGold = clampedPercent >= 100;
  const isOverAchieve = clampedPercent > 100;

  const offset = useMemo(() => {
    const p = Math.min(clampedPercent, 100) / 100;
    return CIRCUMFERENCE * (1 - p);
  }, [clampedPercent]);

  // Gold color
  const goldColor = '#D4A843';
  const goldGlow = '#F0D060';

  // Pace border
  const paceBorder =
    paceStatus === 'ahead'
      ? 'ring-2 ring-green-400/50'
      : paceStatus === 'behind'
        ? 'ring-2 ring-orange-400/50'
        : '';

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-2xl glass-card hover:shadow-lg transition-all cursor-pointer ${paceBorder}`}
      aria-label={label}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="drop-shadow-sm"
      >
        {/* Definitions for gold effects */}
        <defs>
          {isGold && (
            <>
              <linearGradient id={`gold-grad-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={goldGlow} />
                <stop offset="50%" stopColor={goldColor} />
                <stop offset="100%" stopColor={goldGlow} />
              </linearGradient>
              <filter id={`gold-glow-${label}`}>
                <feGaussianBlur
                  stdDeviation={isOverAchieve ? 6 : 3}
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </>
          )}
        </defs>

        {/* Background ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={STROKE}
          opacity={0.5}
        />

        {/* Progress ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          stroke={isGold ? `url(#gold-grad-${label})` : 'hsl(var(--primary))'}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${CENTER} ${CENTER})`}
          filter={isGold ? `url(#gold-glow-${label})` : undefined}
          className="transition-all duration-700 ease-out"
        />

        {/* Subtle shine for over-achieve — slow rotating highlight */}
        {isOverAchieve && (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="white"
            strokeWidth={2}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE * 0.08} ${CIRCUMFERENCE * 0.92}`}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            opacity={0.35}
            className="animate-[spin_8s_linear_infinite]"
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          />
        )}

        {/* Center text */}
        {hasGoal ? (
          <>
            <text
              x={CENTER}
              y={CENTER - 4}
              textAnchor="middle"
              dominantBaseline="central"
              className="font-display font-bold"
              fontSize="22"
              fill={isGold ? goldColor : 'hsl(var(--foreground))'}
            >
              {displayPercent}%
            </text>
            <text
              x={CENTER}
              y={CENTER + 18}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="11"
              fill="hsl(var(--muted-foreground))"
            >
              {current} / {target} {unit}
            </text>
          </>
        ) : (
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            dominantBaseline="central"
            className="font-display font-medium"
            fontSize="13"
            fill="hsl(var(--muted-foreground))"
          >
            Sett mål
          </text>
        )}
      </svg>

      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </button>
  );
};

export default ProgressWheel;
