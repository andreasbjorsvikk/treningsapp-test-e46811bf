import { useState, useEffect, useMemo } from 'react';
import { Trophy, Archive, Sparkles, Check } from 'lucide-react';
import { ExtraGoal, WorkoutSession, SessionType } from '@/types/workout';
import { useTranslation } from '@/i18n/useTranslation';
import { getSessionsInPeriod, computeProgress } from '@/utils/goalUtils';
import GoalProgressVisual from '@/components/GoalProgressVisual';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';

interface GoalCompletionOverlayProps {
  goal: ExtraGoal | null;
  sessions: WorkoutSession[];
  onArchive: (goalId: string) => void;
  onDismiss: () => void;
}

function formatValue(value: number, metric: string): string {
  if (metric === 'distance' || metric === 'minutes') return value.toFixed(1);
  return Math.round(value).toString();
}

function getAutoArchiveText(goal: ExtraGoal, t: (key: string) => string): string {
  const now = new Date();
  if (goal.period === 'week') {
    const day = now.getDay();
    const daysToSunday = day === 0 ? 0 : 7 - day;
    const sunday = new Date(now);
    sunday.setDate(now.getDate() + daysToSunday);
    return t('goalCompletion.autoArchiveWeek').replace('{date}', sunday.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }));
  }
  if (goal.period === 'month') {
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return t('goalCompletion.autoArchiveMonth').replace('{date}', lastDay.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }));
  }
  if (goal.period === 'custom' && goal.customEnd) {
    const end = new Date(goal.customEnd);
    return t('goalCompletion.autoArchiveCustom').replace('{date}', end.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' }));
  }
  // year
  return t('goalCompletion.autoArchiveYear');
}

const GoalCompletionOverlay = ({ goal, sessions, onArchive, onDismiss }: GoalCompletionOverlayProps) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const isDark = settings.darkMode;
  const [visible, setVisible] = useState(false);
  const [particlesVisible, setParticlesVisible] = useState(false);

  const periodSessions = useMemo(() => {
    if (!goal) return [];
    return getSessionsInPeriod(sessions, goal.period, goal.activityType, goal.customStart, goal.customEnd);
  }, [goal, sessions]);

  const current = useMemo(() => {
    if (!goal) return 0;
    return computeProgress(periodSessions, goal.metric);
  }, [goal, periodSessions]);

  useEffect(() => {
    if (goal) {
      requestAnimationFrame(() => {
        setVisible(true);
        setParticlesVisible(true);
      });
    } else {
      setVisible(false);
      setParticlesVisible(false);
    }
  }, [goal]);

  if (!goal) return null;

  const handleArchive = () => {
    setVisible(false);
    setTimeout(() => {
      onArchive(goal.id);
    }, 300);
  };

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  // Parse activity types
  const activityTypes = goal.activityType === 'all' ? ['all'] : goal.activityType.split(',').filter(Boolean);
  const singleType = activityTypes.length === 1 && activityTypes[0] !== 'all' ? activityTypes[0] as SessionType : null;
  const colors = singleType ? getActivityColors(singleType, isDark) : null;

  const pct = Math.min((current / goal.target) * 100, 100);

  // Generate sparkle particles
  const particles = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * 360;
    const distance = 50 + Math.random() * 100;
    const delay = Math.random() * 0.6;
    const size = 3 + Math.random() * 8;
    return { angle, distance, delay, size, id: i };
  });

  const autoArchiveText = getAutoArchiveText(goal, t);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${
        visible ? 'bg-black/50 backdrop-blur-sm' : 'bg-transparent pointer-events-none'
      }`}
      onClick={handleDismiss}
    >
      <div
        className={`relative flex flex-col items-center gap-3 p-8 rounded-2xl bg-background border border-border shadow-2xl transition-all duration-500 max-w-[320px] w-[90vw] ${
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
              top: '30%',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: `hsl(${40 + Math.random() * 30}, 90%, ${55 + Math.random() * 20}%)`,
              animation: `sparkle-burst 1.4s ${p.delay}s ease-out forwards`,
              transform: `translate(-50%, -50%)`,
              ['--angle' as string]: `${p.angle}deg`,
              ['--distance' as string]: `${p.distance}px`,
            }}
          />
        ))}

        {/* Trophy with activity icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center animate-bounce">
            <Trophy className="w-10 h-10 text-warning" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-warning animate-pulse" />
          <Sparkles className="absolute -bottom-1 -left-2 w-5 h-5 text-warning/70 animate-pulse" style={{ animationDelay: '0.3s' }} />
        </div>

        {/* Congratulations */}
        <h3 className="font-display font-bold text-xl text-foreground text-center">{t('goalCompletion.title')}</h3>
        <p className="text-sm text-muted-foreground text-center">{t('goalCompletion.description')}</p>

        {/* Goal progress visual + details */}
        <div className="flex flex-col items-center gap-2 py-2">
          {/* Activity icon(s) */}
          <div className="flex items-center gap-1">
            {activityTypes.map((type) => {
              if (type === 'all') return null;
              const c = getActivityColors(type as SessionType, isDark);
              return (
                <div key={type} className="rounded-full p-1" style={{ backgroundColor: c.bg }}>
                  <ActivityIcon type={type as SessionType} className="w-5 h-5" colorOverride={!isDark ? c.text : undefined} />
                </div>
              );
            })}
          </div>

          {/* Progress visual */}
          <div className="w-20 h-20">
            <GoalProgressVisual
              metric={goal.metric}
              activityType={singleType || 'all'}
              percent={pct}
              current={current}
              target={goal.target}
            />
          </div>

          {/* Value */}
          <div className="flex items-center gap-1">
            <Check className="w-4 h-4 text-success" />
            <span className="text-lg font-bold text-foreground">
              {formatValue(current, goal.metric)} / {formatValue(goal.target, goal.metric)}
            </span>
            <span className="text-sm text-muted-foreground">{t(`metric.${goal.metric}`)}</span>
          </div>
        </div>

        {/* Auto-archive info */}
        <p className="text-xs text-muted-foreground text-center leading-relaxed px-2">
          {autoArchiveText}
        </p>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-2 w-full pt-1">
          <button
            onClick={handleDismiss}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg"
          >
            {t('common.ok')}
          </button>

          <button
            onClick={handleArchive}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Archive className="w-3.5 h-3.5" />
            {t('goalCompletion.archiveNow')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes sparkle-burst {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) rotate(var(--angle)) translateY(calc(var(--distance) * -1));
          }
        }
      `}</style>
    </div>
  );
};

export default GoalCompletionOverlay;
