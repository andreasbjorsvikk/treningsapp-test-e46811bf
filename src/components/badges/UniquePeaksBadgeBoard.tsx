import { UserBadge, getHighPeakGlow, getRarityGlow, BadgeDefinition } from '@/services/badgeService';
import { useTranslation } from '@/i18n/useTranslation';
import { Play } from 'lucide-react';

interface UniquePeaksBadgeBoardProps {
  badges: UserBadge[];
  onSelectBadge: (badge: UserBadge) => void;
  adminMode?: boolean;
  onPreviewBadge?: (badge: UserBadge) => void;
  columns?: 2 | 3 | 4;
}

const UniquePeaksBadgeBoard = ({ badges, onSelectBadge, adminMode = false, onPreviewBadge, columns = 2 }: UniquePeaksBadgeBoardProps) => {
  const { t, language } = useTranslation();
  const orderedBadges = [...badges].sort((a, b) => a.badge.sortOrder - b.badge.sortOrder);
  const gridCols = columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : 'grid-cols-4';
  const socketSize = columns === 2 ? '7rem' : '5.2rem';

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 shadow-sm">
      <div className={`grid ${gridCols} gap-3`}>
        {orderedBadges.map((userBadge) => {
          if (!userBadge.badge.image) return null;

          const glowColor = getHighPeakGlow(userBadge.badge.id)?.glow || getRarityGlow(userBadge.badge.rarity);
          const title = t(userBadge.badge.nameKey);
          const sub = userBadge.badge.subcategory;
          let countLabel: string;
          if (sub === 'unique_peaks') {
            countLabel = language === 'no' ? `${userBadge.badge.threshold} unike topper` : `${userBadge.badge.threshold} unique peaks`;
          } else if (sub === 'high_peaks') {
            countLabel = language === 'no' ? `over 1000 moh` : `over 1000m`;
          } else {
            countLabel = t(userBadge.badge.descriptionKey);
          }

          return (
            <button
              key={userBadge.badge.id}
              onClick={() => onSelectBadge(userBadge)}
              className="relative flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 transition-colors hover:bg-muted/40"
            >
              <div
                className="relative flex items-center justify-center rounded-full"
                style={{
                  width: socketSize,
                  height: socketSize,
                  background: userBadge.unlocked
                    ? `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`
                    : 'radial-gradient(circle, hsl(var(--muted) / 0.5) 0%, transparent 70%)',
                  boxShadow: userBadge.unlocked
                    ? `inset 0 2px 6px rgba(0,0,0,0.15), 0 0 20px ${glowColor}`
                    : 'inset 0 2px 6px rgba(0,0,0,0.12)',
                }}
              >
                <img
                  src={userBadge.badge.image}
                  alt={title}
                  className={`w-[108%] h-[108%] object-contain transition-all duration-300 ${
                    userBadge.unlocked
                      ? ''
                      : 'grayscale saturate-0 brightness-[0.07] contrast-125 opacity-45'
                  }`}
                  style={userBadge.unlocked ? { filter: `drop-shadow(0 0 6px ${glowColor})` } : undefined}
                  loading="lazy"
                />
              </div>

              <div className="text-center">
                <p className="font-display text-[0.82rem] font-semibold leading-tight text-foreground">
                  {title}
                </p>
                <p className="mt-0.5 text-[0.68rem] font-medium leading-tight text-muted-foreground">
                  {countLabel}
                </p>
              </div>

              {!userBadge.unlocked && (
                <p className="text-[0.65rem] font-medium text-muted-foreground/70">
                  {userBadge.progress}/{userBadge.badge.threshold}
                </p>
              )}

              {adminMode && onPreviewBadge && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreviewBadge(userBadge);
                  }}
                  className="absolute right-1 top-1 z-10 rounded-full border border-border bg-background/90 p-1 shadow-sm transition-colors hover:bg-muted"
                  title="Preview unlock animation"
                >
                  <Play className="h-3 w-3 text-foreground" />
                </button>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UniquePeaksBadgeBoard;