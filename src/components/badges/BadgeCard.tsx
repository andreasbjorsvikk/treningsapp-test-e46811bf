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
      className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 ${
        unlocked
          ? 'bg-card border-border/60 hover:border-border shadow-sm hover:shadow-md active:scale-[0.98]'
          : 'bg-card/50 border-border/20 opacity-50 hover:opacity-65'
      }`}
    >
      {/* Badge visual */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{
          background: unlocked ? `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` : 'hsl(var(--muted))',
          boxShadow: unlocked ? `0 0 20px ${glowColor}` : 'none',
        }}
      >
        {badge.image ? (
          <img
            src={badge.image}
            alt={t(badge.nameKey)}
            className={`w-12 h-12 object-contain ${unlocked ? '' : 'grayscale brightness-50 opacity-60'}`}
          />
        ) : (
          <span className={`text-3xl ${unlocked ? '' : 'grayscale opacity-40'}`}>
            {badge.emoji}
          </span>
        )}
      </div>

      {/* Repeat count badge */}
      {repeatCount && repeatCount > 1 && (
        <div
          className="absolute bottom-2 right-2 min-w-[20px] h-[18px] rounded-full flex items-center justify-center px-1"
          style={{ backgroundColor: rarityColor }}
        >
          <span className="text-[9px] font-bold text-white">{repeatCount}x</span>
        </div>
      )}

      {/* Name */}
      <p className={`text-xs font-semibold text-center leading-tight ${unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
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
        <div className="w-full space-y-1">
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
