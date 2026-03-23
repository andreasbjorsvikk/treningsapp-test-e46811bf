import { UserBadge, getHighPeakGlow, getRarityGlow } from '@/services/badgeService';
import { useTranslation } from '@/i18n/useTranslation';
import { Play } from 'lucide-react';

interface UniquePeaksBadgeBoardProps {
  badges: UserBadge[];
  onSelectBadge: (badge: UserBadge) => void;
  adminMode?: boolean;
  onPreviewBadge?: (badge: UserBadge) => void;
}

const UniquePeaksBadgeBoard = ({ badges, onSelectBadge, adminMode = false, onPreviewBadge }: UniquePeaksBadgeBoardProps) => {
  const { t, language } = useTranslation();
  const orderedBadges = [...badges].sort((a, b) => a.badge.sortOrder - b.badge.sortOrder);

  return (
    <div
      className="mx-auto w-full max-w-[34rem] rounded-[2rem] border border-border/60 p-4 shadow-2xl sm:p-5"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--card) / 0.98) 0%, hsl(var(--background) / 0.98) 100%)',
        boxShadow: '0 28px 72px hsl(var(--background) / 0.5), inset 0 1px 0 hsl(var(--foreground) / 0.05)',
      }}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-5 sm:gap-y-6">
        {orderedBadges.map((userBadge) => {
          if (!userBadge.badge.image) return null;

          const glowColor = getHighPeakGlow(userBadge.badge.id)?.glow || getRarityGlow(userBadge.badge.rarity);
          const thresholdLabel = language === 'no'
            ? `${userBadge.badge.threshold} topper`
            : `${userBadge.badge.threshold} peaks`;

          return (
            <div key={userBadge.badge.id} className="relative flex flex-col items-center text-center">
              <button
                onClick={() => onSelectBadge(userBadge)}
                className="relative flex w-full flex-col items-center"
              >
                <div
                  className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[1.75rem] border border-border/50 p-3 sm:p-4"
                  style={{
                    background: 'radial-gradient(circle at 50% 38%, hsl(var(--foreground) / 0.08) 0%, hsl(var(--muted) / 0.2) 36%, hsl(var(--background) / 0.86) 100%)',
                    boxShadow: 'inset 0 2px 8px hsl(var(--background) / 0.85), inset 0 -10px 26px hsl(var(--background) / 0.7), 0 10px 30px hsl(var(--background) / 0.24)',
                  }}
                >
                  <div
                    className="absolute inset-[12%] rounded-full border border-border/60"
                    style={{
                      background: 'radial-gradient(circle at 50% 30%, hsl(var(--foreground) / 0.05) 0%, hsl(var(--background) / 0.72) 72%)',
                      boxShadow: 'inset 0 2px 6px hsl(var(--foreground) / 0.08), inset 0 -8px 16px hsl(var(--background) / 0.9)',
                    }}
                  />
                  <img
                    src={userBadge.badge.image}
                    alt={t(userBadge.badge.nameKey)}
                    className={`relative z-10 aspect-square w-[76%] object-contain transition-all duration-300 ${
                      userBadge.unlocked ? 'scale-100' : 'grayscale brightness-[0.04] contrast-75 opacity-40'
                    }`}
                    style={userBadge.unlocked ? { filter: `drop-shadow(0 0 12px ${glowColor})` } : undefined}
                    loading="lazy"
                  />
                </div>

                <div className="mt-3 space-y-0.5 px-2">
                  <p className={`font-display text-sm font-semibold leading-tight ${userBadge.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {t(userBadge.badge.nameKey)}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground/85">{thresholdLabel}</p>
                </div>
              </button>

              {adminMode && onPreviewBadge && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreviewBadge(userBadge);
                  }}
                  className="absolute right-2 top-2 z-20 rounded-full border border-border bg-background/90 p-1 shadow-sm transition-colors hover:bg-muted"
                  title="Preview unlock animation"
                >
                  <Play className="h-3 w-3 text-foreground" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UniquePeaksBadgeBoard;