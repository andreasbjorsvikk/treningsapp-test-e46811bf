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
  const isDarkTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  return (
    <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 shadow-sm">
      <div className={`grid ${gridCols} gap-3`}>
        {orderedBadges.map((userBadge) => {
          if (!userBadge.badge.image) return null;

          const glowColor = getHighPeakGlow(userBadge.badge.id)?.glow || getRarityGlow(userBadge.badge.rarity);
          const title = t(userBadge.badge.nameKey);
          const sub = userBadge.badge.subcategory;
          let titleLine: string;
          let countLabel: string;
          if (sub === 'unique_peaks') {
            titleLine = title;
            countLabel = language === 'no' ? `${userBadge.badge.threshold} unike topper` : `${userBadge.badge.threshold} unique peaks`;
          } else if (sub === 'high_peaks') {
            titleLine = language === 'no' ? `${userBadge.badge.threshold === 1 ? '1 topp' : `${userBadge.badge.threshold} topper`}` : `${userBadge.badge.threshold} peak${userBadge.badge.threshold === 1 ? '' : 's'}`;
            countLabel = language === 'no' ? 'over 1000 moh' : 'above 1000m';
          } else {
            titleLine = title;
            countLabel = t(userBadge.badge.descriptionKey);
          }

          const isHighPeaks = sub === 'high_peaks';
          const isUniquePeaks = sub === 'unique_peaks';
          const showGlow = userBadge.unlocked && !isHighPeaks && !(isUniquePeaks && !isDarkTheme);

          // High peaks: standalone images without circular socket
          if (isHighPeaks) {
            return (
              <button
                key={userBadge.badge.id}
                onClick={() => onSelectBadge(userBadge)}
                className="relative flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 transition-colors hover:bg-muted/40"
              >
                <div className="relative flex items-center justify-center" style={{ width: socketSize, height: socketSize }}>
                  <img
                    src={userBadge.badge.image}
                    alt={title}
                    className={`object-contain transition-all duration-300 ${
                      userBadge.unlocked
                        ? ''
                        : 'grayscale brightness-[0.42] opacity-60'
                    }`}
                    style={{
                      width: '100%',
                      height: '100%',
                      ...(showGlow ? { filter: `drop-shadow(0 0 8px ${glowColor})` } : {}),
                    }}
                    loading="lazy"
                  />
                </div>

                <div className="text-center">
                  <p className="font-display text-[0.82rem] font-semibold leading-tight text-foreground">{title}</p>
                  <p className="mt-0.5 text-[0.68rem] font-medium leading-tight text-muted-foreground">{countLabel}</p>
                </div>

                {!userBadge.unlocked && (
                  <p className="text-[0.65rem] font-medium text-muted-foreground/70">
                    {userBadge.progress}/{userBadge.badge.threshold}
                  </p>
                )}

                {adminMode && onPreviewBadge && (
                  <button
                    onClick={(event) => { event.stopPropagation(); onPreviewBadge(userBadge); }}
                    className="absolute right-1 top-1 z-10 rounded-full border border-border bg-background/90 p-1 shadow-sm transition-colors hover:bg-muted"
                    title="Preview unlock animation"
                  >
                    <Play className="h-3 w-3 text-foreground" />
                  </button>
                )}
              </button>
            );
          }

          // Unique peaks: circular socket with glow
          const imgScale = userBadge.badge.id === 'peaks_100' ? 1.06 : 1.0;
          const glowShadow = showGlow ? `0 0 24px ${glowColor}` : 'none';

          return (
            <button
              key={userBadge.badge.id}
              onClick={() => onSelectBadge(userBadge)}
              className="relative flex flex-col items-center gap-1.5 rounded-xl py-3 px-1 transition-colors hover:bg-muted/40"
            >
              <div className="relative flex items-center justify-center p-2">
                <div
                  className="pointer-events-none absolute left-1/2 top-1/2 rounded-full -translate-x-1/2 -translate-y-1/2"
                  style={{
                    width: socketSize,
                    height: socketSize,
                    background: userBadge.unlocked
                      ? `radial-gradient(circle, ${glowColor} 0%, transparent 72%)`
                      : 'transparent',
                    boxShadow: glowShadow,
                  }}
                />
                <div
                  className="relative flex items-center justify-center rounded-full overflow-hidden"
                  style={{
                    width: socketSize,
                    height: socketSize,
                    background: 'hsl(var(--card))',
                    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.16)',
                  }}
                >
                  <img
                    src={userBadge.badge.image}
                    alt={title}
                    className={`relative z-10 object-contain transition-all duration-300 ${
                      userBadge.unlocked
                        ? ''
                        : 'grayscale saturate-0 brightness-[0.07] contrast-125 opacity-45'
                    }`}
                    style={{
                      width: '100%',
                      height: '100%',
                      maxWidth: 'none',
                      maxHeight: 'none',
                      transform: `scale(${imgScale})`,
                      transformOrigin: 'center',
                      ...(showGlow ? { filter: `drop-shadow(0 0 6px ${glowColor})` } : {}),
                    }}
                    loading="lazy"
                  />
                </div>
              </div>

              <div className="text-center">
                <p className="font-display text-[0.82rem] font-semibold leading-tight text-foreground">{title}</p>
                <p className="mt-0.5 text-[0.68rem] font-medium leading-tight text-muted-foreground">{countLabel}</p>
              </div>

              {!userBadge.unlocked && (
                <p className="text-[0.65rem] font-medium text-muted-foreground/70">
                  {userBadge.progress}/{userBadge.badge.threshold}
                </p>
              )}

              {adminMode && onPreviewBadge && (
                <button
                  onClick={(event) => { event.stopPropagation(); onPreviewBadge(userBadge); }}
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
