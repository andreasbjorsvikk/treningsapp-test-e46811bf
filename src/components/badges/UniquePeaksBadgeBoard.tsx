import { Fragment } from 'react';
import { UserBadge, getHighPeakGlow, getRarityGlow } from '@/services/badgeService';
import coinHolderImage from '@/assets/badges/coin_holder_simple.png';
import { useTranslation } from '@/i18n/useTranslation';
import { Play } from 'lucide-react';

interface UniquePeaksBadgeBoardProps {
  badges: UserBadge[];
  onSelectBadge: (badge: UserBadge) => void;
  adminMode?: boolean;
  onPreviewBadge?: (badge: UserBadge) => void;
}

const COIN_POSITIONS = [
  { left: '28%', coinTop: '5%', size: '22%' },
  { left: '72%', coinTop: '5%', size: '22%' },
  { left: '28%', coinTop: '52%', size: '22%' },
  { left: '72%', coinTop: '52%', size: '22%' },
] as const;

const UniquePeaksBadgeBoard = ({ badges, onSelectBadge, adminMode = false, onPreviewBadge }: UniquePeaksBadgeBoardProps) => {
  const { t, language } = useTranslation();
  const orderedBadges = [...badges].sort((a, b) => a.badge.sortOrder - b.badge.sortOrder);

  return (
    <div className="relative mx-auto w-full max-w-[22rem]">
      {/* The holder frame – transparent background, just the dark plate */}
      <div className="relative w-full" style={{ paddingBottom: '100%' }}>
        <img
          src={coinHolderImage}
          alt="Merkeholder"
          className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
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
              {/* Coin */}
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
                        ? 'h-[92%] w-[92%]'
                        : 'h-[88%] w-[88%] grayscale saturate-0 brightness-[0.07] contrast-125 opacity-45'
                    }`}
                    style={userBadge.unlocked ? { filter: `drop-shadow(0 0 8px ${glowColor}) drop-shadow(0 0 16px ${glowColor})` } : undefined}
                    loading="lazy"
                  />
                </button>

                {adminMode && onPreviewBadge && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      onPreviewBadge(userBadge);
                    }}
                    className="absolute -right-1 top-0 z-10 rounded-full border border-border bg-background/90 p-1 shadow-sm transition-colors hover:bg-muted"
                    title="Preview unlock animation"
                  >
                    <Play className="h-3 w-3 text-foreground" />
                  </button>
                )}
              </div>

              {/* Label below the coin slot */}
              <div
                className="absolute -translate-x-1/2 text-center"
                style={{ left: position.left, top: `calc(${position.coinTop} + ${position.size} + 1.5%)`, width: '30%' }}
              >
                <p className="font-display text-[0.78rem] font-semibold leading-tight text-foreground sm:text-[0.85rem]">
                  {title}
                </p>
                <p className="mt-0.5 text-[0.65rem] font-medium leading-tight text-muted-foreground sm:text-[0.72rem]">
                  {countLabel}
                </p>
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default UniquePeaksBadgeBoard;