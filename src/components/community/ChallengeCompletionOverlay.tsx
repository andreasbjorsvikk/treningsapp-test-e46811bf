import { useState, useEffect, useRef } from 'react';
import { ChallengeWithParticipants } from '@/pages/CommunityPage';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, X, PartyPopper } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface ChallengeCompletionOverlayProps {
  challenge: ChallengeWithParticipants | null;
  open: boolean;
  onDismiss: () => void;
  isPreview?: boolean;
}

const metricUnits: Record<string, string> = {
  sessions: '',
  distance: 'km',
  duration: 't',
  elevation: 'm',
};

// Simple confetti particle system
function useConfetti(active: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF9F43', '#EE5A24', '#A55EEA'];
    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; rotation: number; rotSpeed: number; opacity: number }[] = [];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height * 0.3,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 15 - 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    let frame = 0;
    const maxFrames = 180;
    let raf: number;

    const animate = () => {
      if (frame > maxFrames) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.vy += 0.25; // gravity
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        if (frame > maxFrames - 40) {
          p.opacity = Math.max(0, p.opacity - 0.03);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });

      frame++;
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return canvasRef;
}

const ChallengeCompletionOverlay = ({ challenge, open, onDismiss, isPreview }: ChallengeCompletionOverlayProps) => {
  const { user } = useAuth();
  const [revealed, setRevealed] = useState(false);
  const confettiRef = useConfetti(open && revealed);

  useEffect(() => {
    if (open) {
      setRevealed(false);
      // Reveal after short delay for dramatic effect
      const t = setTimeout(() => setRevealed(true), 600);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open || !challenge) return null;

  const c = challenge.challenge;
  const unit = metricUnits[c.metric] || '';
  const sorted = [...challenge.participants]
    .filter(p => p.status === 'accepted')
    .sort((a, b) => b.progress - a.progress);
  
  const winner = sorted[0];
  const isWinner = winner?.userId === user?.id;
  const myRank = sorted.findIndex(p => p.userId === user?.id) + 1;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <canvas ref={confettiRef} className="absolute inset-0 pointer-events-none z-10" />

      <div className={`relative z-20 w-[min(calc(100vw-2rem),22rem)] rounded-2xl bg-card border border-border shadow-2xl overflow-hidden transition-all duration-700 ${revealed ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 z-30 p-1.5 rounded-full bg-muted/80 hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <PartyPopper className="w-6 h-6 text-warning" />
            <Trophy className="w-7 h-7 text-warning" />
            <PartyPopper className="w-6 h-6 text-warning" />
          </div>
          <h2 className="font-display font-bold text-lg text-foreground mb-1">
            Utfordring fullført!
          </h2>
          <p className="text-sm text-muted-foreground">
            {c.emoji && <span className="mr-1">{c.emoji}</span>}
            {c.name}
          </p>
          {isPreview && (
            <span className="inline-block mt-1 text-[10px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full">
              Admin forhåndsvisning
            </span>
          )}
        </div>

        {/* Winner announcement */}
        {isWinner && (
          <div className="mx-4 mb-3 p-3 rounded-xl bg-warning/10 border border-warning/20 text-center">
            <p className="text-sm font-bold text-warning">🎉 Du vant utfordringen!</p>
          </div>
        )}

        {/* Leaderboard */}
        <div className="px-4 pb-4 space-y-1.5 max-h-[40vh] overflow-y-auto">
          {sorted.map((p, i) => {
            const isSelf = p.userId === user?.id;
            const isLeader = i === 0 && p.progress > 0;
            return (
              <div
                key={p.userId}
                className={`flex items-center gap-2.5 rounded-xl p-2.5 transition-all ${
                  isLeader ? 'bg-warning/10 ring-1 ring-warning/20' : 'bg-secondary/50'
                } ${isSelf ? 'ring-1 ring-primary/30' : ''}`}
                style={{
                  animationDelay: `${i * 100 + 400}ms`,
                  animation: revealed ? `fade-in 0.4s ease-out ${i * 100 + 400}ms both` : 'none',
                }}
              >
                <span className={`font-display font-bold text-sm w-6 text-center ${
                  i === 0 ? 'text-warning' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-amber-800 dark:text-amber-600' : 'text-muted-foreground'
                }`}>
                  {i === 0 ? <Trophy className="w-4 h-4 inline text-warning" /> : `#${i + 1}`}
                </span>
                <Avatar className="w-7 h-7">
                  {p.avatarUrl ? <AvatarImage src={p.avatarUrl} /> : null}
                  <AvatarFallback className="text-[10px] font-medium">{(p.username || '?')[0]}</AvatarFallback>
                </Avatar>
                <span className={`text-sm flex-1 truncate ${isSelf ? 'font-semibold' : 'font-medium'}`}>
                  {isSelf ? 'Meg' : p.username}
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {c.metric === 'distance' ? p.progress.toFixed(1) : Math.round(p.progress)}{unit ? ` ${unit}` : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={onDismiss}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Lukk
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChallengeCompletionOverlay;
