import { UserBadge, getHighPeakGlow, getRarityGlow } from '@/services/badgeService';
import coinHolderImage from '@/assets/badges/coin_holder_2.png';
import { Play } from 'lucide-react';

interface UniquePeaksBadgeBoardProps {
  badges: UserBadge[];
  onSelectBadge: (badge: UserBadge) => void;
  adminMode?: boolean;
  onPreviewBadge?: (badge: UserBadge) => void;
}

const COIN_POSITIONS = [
  { left: '31%', top: '26%', size: '24%' },
  { left: '69%', top: '26%', size: '24%' },
  { left: '31%', top: '61.5%', size: '24%' },
  { left: '69%', top: '61.5%', size: '24%' },
] as const;

const UniquePeaksBadgeBoard = ({ badges, onSelectBadge, adminMode = false, onPreviewBadge }: UniquePeaksBadgeBoardProps) => {
  const orderedBadges = [...badges].sort((a, b) => a.badge.sortOrder - b.badge.sortOrder);

  return (
    <div className="relative mx-auto w-full max-w-[28rem]">
      <img
        src={coinHolderImage}
        alt="Merkeholder for unike topper"
        className="w-full h-auto select-none pointer-events-none"
        loading="lazy"
      />

      {orderedBadges.map((userBadge, index) => {
        const position = COIN_POSITIONS[index];
        if (!position || !userBadge.badge.image) return null;

        const glowColor = getHighPeakGlow(userBadge.badge.id)?.glow || getRarityGlow(userBadge.badge.rarity);

        return (
          <div
            key={userBadge.badge.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: position.left, top: position.top, width: position.size }}
          >
            <button
              onClick={() => onSelectBadge(userBadge)}
              className="relative flex w-full items-center justify-center"
            >
              <img
                src={userBadge.badge.image}
                alt={userBadge.badge.nameKey}
                className={`aspect-square w-full object-contain transition-all duration-300 ${
                  userBadge.unlocked ? 'scale-[1.02]' : 'grayscale brightness-[0.08] opacity-30'
                }`}
                style={userBadge.unlocked ? { filter: `drop-shadow(0 0 10px ${glowColor})` } : undefined}
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
        );
      })}
    </div>
  );
};

export default UniquePeaksBadgeBoard;