import { useState, useEffect, useRef } from 'react';
import { Trophy, Sparkles } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { useSettings } from '@/contexts/SettingsContext';

interface MonthGoalCompletionOverlayProps {
  open: boolean;
  current: number;
  target: number;
  monthLabel: string;
  onDismiss: () => void;
}

const ANIM_DURATION = 1800;
const RADIUS = 54;
const STROKE = 10;
const PADDING = 14;
const SIZE = (RADIUS + STROKE) * 2 + PADDING * 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const MonthGoalCompletionOverlay = ({ open, current, target, monthLabel, onDismiss }: MonthGoalCompletionOverlayProps) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [visible, setVisible] = useState(false);
  const [animatedPercent, setAnimatedPercent] = useState(0);
  const [animatedCount, setAnimatedCount] = useState(0);
  const [showAchievement, setShowAchievement] = useState(false);
  const [particlesVisible, setParticlesVisible] = useState(false);
  const animRef = useRef<number>();

  const safeId = 'month-overlay-' + Math.random().toString(36).slice(2, 6);
  const completeColor = 'hsl(142, 50%, 48%)';
  const completeLight = 'hsl(142, 55%, 65%)';

  useEffect(() => {
    if (open) {
      setAnimatedPercent(0);
      setAnimatedCount(0);
      setShowAchievement(false);
      setParticlesVisible(false);
      requestAnimationFrame(() => setVisible(true));

      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / ANIM_DURATION, 1);
        const eased = easeOutCubic(progress);
        setAnimatedPercent(eased * 100);
        setAnimatedCount(Math.round(eased * current));
        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          setShowAchievement(true);
          setParticlesVisible(true);
          setTimeout(() => setShowAchievement(false), 1500);
        }
      };
      setTimeout(() => {
        animRef.current = requestAnimationFrame(animate);
      }, 400);
    } else {
      setVisible(false);
    }
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [open, current]);

  if (!open) return null;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const fillFraction = Math.min(animatedPercent, 100) / 100;
  const fillOffset = CIRCUMFERENCE * (1 - fillFraction);

  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * 360;
    const distance = 40 + Math.random() * 80;
    const delay = Math.random() * 0.5;
    const size = 3 + Math.random() * 6;
    return { angle, distance, delay, size, id: i };
  });

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${
        visible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent pointer-events-none'
      }`}
      onClick={handleDismiss}
    >
      <div
        className={`relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-background border border-border shadow-2xl transition-all duration-500 max-w-[300px] w-[85vw] ${
          visible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Sparkle particles */}
        {particlesVisible && particles.map(p => (
          <div
            key={p.id}
            className="absolute pointer-events-none"
            style={{
              left: '50%',
              top: '40%',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: `hsl(${130 + Math.random() * 30}, 55%, ${45 + Math.random() * 20}%)`,
              animation: `month-sparkle-burst 1.4s ${p.delay}s ease-out forwards`,
              transform: 'translate(-50%, -50%)',
              ['--angle' as string]: `${p.angle}deg`,
              ['--distance' as string]: `${p.distance}px`,
            }}
          />
        ))}

        {/* Trophy icon */}
        <div className="relative">
          <div className={`w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center ${showAchievement ? 'animate-bounce' : ''}`}>
            <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 6px rgba(218,165,32,0.6))' }}>🏆</span>
          </div>
          {showAchievement && (
            <>
              <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-success animate-pulse" />
              <Sparkles className="absolute -bottom-1 -left-2 w-4 h-4 text-success/70 animate-pulse" style={{ animationDelay: '0.3s' }} />
            </>
          )}
        </div>

        {/* Title */}
        <div className="text-center">
          <h3 className="font-display font-bold text-lg text-foreground">{t('goalCompletion.title')}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{monthLabel}</p>
        </div>

        {/* Animated progress wheel — matching ProgressWheel styling */}
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible">
          <defs>
            {/* Ring gradient — same as ProgressWheel */}
            <linearGradient id={`ring-grad-${safeId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={completeLight} />
              <stop offset="100%" stopColor={completeColor} />
            </linearGradient>

            {/* Track inner shadow */}
            <filter id={`track-shadow-${safeId}`} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2" result="shadow" />
              <feOffset dx="0" dy="1" result="offset" />
              <feComposite in="SourceGraphic" in2="offset" operator="over" />
            </filter>

            {/* Subtle ring glow */}
            <filter id={`ring-glow-${safeId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Achievement glow burst */}
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

          {/* Track ring */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
            stroke="hsl(var(--muted))" strokeWidth={STROKE} opacity={0.2}
            filter={`url(#track-shadow-${safeId})`}
          />
          {/* Subtle track outline */}
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
            stroke="hsl(var(--muted-foreground))" strokeWidth={1} opacity={0.06}
          />

          {/* Achievement glow pulse */}
          {showAchievement && (
            <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
              stroke="hsl(142, 55%, 45%)" strokeWidth={STROKE + 4} opacity={0}
              filter={`url(#achieve-glow-${safeId})`}
              className="animate-[achievement-pulse_1.5s_ease-out_forwards]"
            />
          )}

          {/* Progress fill ring */}
          <circle
            cx={CENTER} cy={CENTER} r={RADIUS} fill="none"
            stroke={`url(#ring-grad-${safeId})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={fillOffset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            filter={`url(#ring-glow-${safeId})`}
          />

          {/* Center text */}
          <text x={CENTER} y={CENTER - 6} textAnchor="middle" dominantBaseline="central"
            className="font-display font-bold" fontSize={22}
            fill={completeColor}>
            {animatedCount} / {target}
          </text>
          <text x={CENTER} y={CENTER + 14} textAnchor="middle" dominantBaseline="central"
            className="font-display font-medium" fontSize={11}
            fill="hsl(var(--muted-foreground))">
            {t('metric.sessions')}
          </text>
        </svg>

        {/* OK Button */}
        <button
          onClick={handleDismiss}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg"
        >
          {t('common.ok')}
        </button>
      </div>

      <style>{`
        @keyframes month-sparkle-burst {
          0% { opacity: 1; transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--distance) * -1)); }
        }
        @keyframes achievement-pulse {
          0% { opacity: 0; }
          30% { opacity: 0.6; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default MonthGoalCompletionOverlay;
