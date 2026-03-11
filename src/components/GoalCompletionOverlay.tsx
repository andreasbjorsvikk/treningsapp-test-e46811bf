import { useState, useEffect } from 'react';
import { Trophy, Archive, Sparkles } from 'lucide-react';
import { ExtraGoal } from '@/types/workout';
import { useTranslation } from '@/i18n/useTranslation';

interface GoalCompletionOverlayProps {
  goal: ExtraGoal | null;
  onArchive: (goalId: string) => void;
  onDismiss: () => void;
}

const GoalCompletionOverlay = ({ goal, onArchive, onDismiss }: GoalCompletionOverlayProps) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [particlesVisible, setParticlesVisible] = useState(false);

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

  // Generate sparkle particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * 360;
    const distance = 60 + Math.random() * 80;
    const delay = Math.random() * 0.5;
    const size = 4 + Math.random() * 8;
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
        className={`relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-background border border-border shadow-2xl transition-all duration-500 max-w-[300px] ${
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
              top: '35%',
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: `hsl(${40 + Math.random() * 30}, 90%, ${55 + Math.random() * 20}%)`,
              animation: `sparkle-burst 1.2s ${p.delay}s ease-out forwards`,
              transform: `translate(-50%, -50%)`,
              ['--angle' as string]: `${p.angle}deg`,
              ['--distance' as string]: `${p.distance}px`,
            }}
          />
        ))}

        {/* Trophy */}
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-warning/20 flex items-center justify-center animate-bounce">
            <Trophy className="w-10 h-10 text-warning" />
          </div>
          <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-warning animate-pulse" />
          <Sparkles className="absolute -bottom-1 -left-2 w-5 h-5 text-warning/70 animate-pulse" style={{ animationDelay: '0.3s' }} />
        </div>

        <div className="text-center space-y-1">
          <h3 className="font-display font-bold text-xl text-foreground">{t('goalCompletion.title')}</h3>
          <p className="text-sm text-muted-foreground">{t('goalCompletion.description')}</p>
        </div>

        <button
          onClick={handleArchive}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg"
        >
          <Archive className="w-4 h-4" />
          {t('goalCompletion.archive')}
        </button>

        <button
          onClick={handleDismiss}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('goalCompletion.later')}
        </button>
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
