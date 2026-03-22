import { UserBadge, getRarityColor, getRarityGlow } from '@/services/badgeService';
import { useTranslation } from '@/i18n/useTranslation';
import { format } from 'date-fns';

interface BadgeCardProps {
  userBadge: UserBadge;
  onClick?: () => void;
  showProgress?: boolean;
}

const BadgeCard = ({ userBadge, onClick, showProgress = true }: BadgeCardProps) => {
  const { t } = useTranslation();
  const { badge, unlocked, unlockedAt, progress, repeatCount } = userBadge;
  const rarityColor = getRarityColor(badge.rarity);
  const glowColor = getRarityGlow(badge.rarity);
  const progressPercent = Math.min((progress / badge.threshold) * 100, 100);

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 ${
        unlocked
          ? 'bg-card border-border/60 hover:border-border shadow-sm hover:shadow-md active:scale-[0.98]'
          : 'bg-card/50 border-border/20 hover:opacity-75'
      }`}
    >
      {/* Badge visual - no circle for image badges, larger */}
      <div className="w-16 h-16 flex items-center justify-center">
        {badge.image ? (
          <img
            src={badge.image}
            alt={t(badge.nameKey)}
            className={`w-16 h-16 object-contain ${unlocked ? '' : 'grayscale brightness-[0.25] opacity-50'}`}
            style={unlocked ? {
              filter: `drop-shadow(0 0 8px ${glowColor})`,
            } : undefined}
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background: unlocked ? `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` : 'hsl(var(--muted))',
              boxShadow: unlocked ? `0 0 16px ${glowColor}` : 'none',
            }}
          >
            <span className={`text-3xl ${unlocked ? '' : 'grayscale opacity-30'}`}>
              {badge.emoji}
            </span>
          </div>
        )}
      </div>

      {/* Repeat count badge - small corner indicator */}
      {repeatCount && repeatCount > 1 && (
        <div
          className="absolute top-2 right-2 min-w-[22px] h-[18px] rounded-full flex items-center justify-center px-1"
          style={{ backgroundColor: rarityColor }}
        >
          <span className="text-[9px] font-bold text-white">{repeatCount}x</span>
        </div>
      )}

      {/* Name */}
      <p className={`text-xs font-semibold text-center leading-tight ${unlocked ? 'text-foreground' : 'text-muted-foreground/60'}`}>
        {t(badge.nameKey)}
      </p>

      {/* Progress or date */}
      {unlocked && unlockedAt ? (
        <p className="text-[10px] text-muted-foreground">
          {format(new Date(unlockedAt), 'dd.MM.yyyy')}
        </p>
      ) : unlocked && !unlockedAt ? (
        <p className="text-[10px] text-muted-foreground">✓</p>
      ) : showProgress ? (
        <div className="w-full space-y-0.5">
          <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: rarityColor,
                opacity: 0.6,
              }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {Math.round(progress)}/{badge.threshold}
          </p>
        </div>
      ) : null}
    </button>
  );
};

export default BadgeCard;
