import { Fragment } from 'react';
import { UserBadge, getHighPeakGlow, getRarityGlow } from '@/services/badgeService';
import uniquePeaksBoardImage from '@/assets/badges/unique_peaks_board_clean.png';
import { useTranslation } from '@/i18n/useTranslation';
import { Play } from 'lucide-react';

interface UniquePeaksBadgeBoardProps {
  badges: UserBadge[];
  onSelectBadge: (badge: UserBadge) => void;
  adminMode?: boolean;
  onPreviewBadge?: (badge: UserBadge) => void;
}

const COIN_POSITIONS = [
  { left: '31.5%', coinTop: '21.8%', labelTop: '46.5%', size: '18.5%', labelWidth: '26%' },
  { left: '64.8%', coinTop: '21.8%', labelTop: '46.5%', size: '18.5%', labelWidth: '26%' },
  { left: '31.5%', coinTop: '56.5%', labelTop: '81%', size: '18.5%', labelWidth: '26%' },
  { left: '64.8%', coinTop: '56.5%', labelTop: '81%', size: '18.5%', labelWidth: '26%' },
] as const;

const UniquePeaksBadgeBoard = ({ badges, onSelectBadge, adminMode = false, onPreviewBadge }: UniquePeaksBadgeBoardProps) => {
  const { t, language } = useTranslation();
  const orderedBadges = [...badges].sort((a, b) => a.badge.sortOrder - b.badge.sortOrder);

  return (
    <div className="relative mx-auto w-full max-w-[46rem] px-1 sm:px-2">
      <img
        src={uniquePeaksBoardImage}
        alt="Eksklusiv merkeplate for unike topper"
        className="w-full h-auto select-none pointer-events-none"
        loading="lazy"
      />

      {orderedBadges.map((userBadge, index) => {
        const position = COIN_POSITIONS[index];
        if (!position || !userBadge.badge.image) return null;

        const glowColor = getHighPeakGlow(userBadge.badge.id)?.glow || getRarityGlow(userBadge.badge.rarity);
        const title = t(userBadge.badge.nameKey);
        const countLabel = language === 'no' ? `${userBadge.badge.threshold} topper` : `${userBadge.badge.threshold} peaks`;

        return (
          <Fragment key={userBadge.badge.id}>
            <div
              className="absolute -translate-x-1/2"
              style={{ left: position.left, top: position.coinTop, width: position.size }}
            >
              <button
                onClick={() => onSelectBadge(userBadge)}
                className="relative flex aspect-square w-full items-center justify-center"
              >
                <img
                  src={userBadge.badge.image}
                  alt={title}
                  className={`object-contain transition-all duration-300 ${
                    userBadge.unlocked
                      ? 'h-[94%] w-[94%] scale-[1.02]'
                      : 'h-[90%] w-[90%] grayscale saturate-0 brightness-[0.07] contrast-125 opacity-45'
                  }`}
                  style={userBadge.unlocked ? { filter: `drop-shadow(0 0 10px ${glowColor}) drop-shadow(0 0 20px ${glowColor})` } : undefined}
                  loading="lazy"
                />
              </button>

              {adminMode && onPreviewBadge && (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onPreviewBadge(userBadge);
                  }}
                  className="absolute -right-2 -top-1 z-10 rounded-full border border-border bg-background/90 p-1 shadow-sm transition-colors hover:bg-muted"
                  title="Preview unlock animation"
                >
                  <Play className="h-3 w-3 text-foreground" />
                </button>
              )}
            </div>

            <div
              className="absolute -translate-x-1/2 text-center"
              style={{ left: position.left, top: position.labelTop, width: position.labelWidth }}
            >
              <p className="font-display text-[0.88rem] font-semibold leading-tight text-foreground sm:text-[0.95rem]">
                {title}
              </p>
              <p className="mt-1 text-[0.72rem] font-medium leading-tight text-muted-foreground sm:text-xs">
                {countLabel}
              </p>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
};

export default UniquePeaksBadgeBoard;