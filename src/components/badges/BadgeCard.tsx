import { UserBadge, getRarityColor, getRarityGlow, getHighPeakGlow } from '@/services/badgeService';
import { useTranslation } from '@/i18n/useTranslation';
import { HelpCircle } from 'lucide-react';
import { useState } from 'react';

interface BadgeCardProps {
  userBadge: UserBadge;
  onClick?: () => void;
  showProgress?: boolean;
}

const BadgeCard = ({ userBadge, onClick, showProgress = true }: BadgeCardProps) => {
  const { t, language } = useTranslation();
  const { badge, unlocked, unlockedAt, progress, repeatCount } = userBadge;
  const highPeakGlow = getHighPeakGlow(badge.id);
  const rarityColor = highPeakGlow?.color || getRarityColor(badge.rarity);
  const glowColor = highPeakGlow?.glow || getRarityGlow(badge.rarity);
  const progressPercent = Math.min((progress / badge.threshold) * 100, 100);
  const [showTooltip, setShowTooltip] = useState(false);

  const isImageBadge = !!badge.image;
  const isTotalSessions = badge.subcategory === 'total_sessions';

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all duration-200 ${
        unlocked
          ? 'bg-primary/10 border-primary/20 hover:border-primary/30 shadow-sm hover:shadow-md active:scale-[0.98]'
          : 'bg-card/50 border-border/20 hover:opacity-75'
      }`}
    >
      {/* Badge visual */}
      <div className={`${isImageBadge ? 'w-24 h-24' : 'w-16 h-16'} drop-shadow-md`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {badge.image ? (
          <img
            src={badge.image}
            alt={t(badge.nameKey)}
            className={`object-contain ${badge.subcategory === 'unique_peaks' ? 'w-[5.6rem] h-[5.6rem]' : 'w-24 h-24'} ${unlocked ? '' : 'grayscale brightness-[0.08] opacity-30'}`}
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

      {/* Repeat count badge */}
      {repeatCount && repeatCount > 1 && (
        <div
          className="absolute bottom-2 right-2 min-w-[20px] h-[16px] rounded-full flex items-center justify-center px-1"
          style={{ backgroundColor: rarityColor }}
        >
          <span className="text-[8px] font-bold text-white">{repeatCount}x</span>
        </div>
      )}

      {/* Name with optional tooltip for total_sessions */}
      <div className="flex flex-col items-center gap-0">
        <div className="flex items-center gap-0.5">
          <p className={`text-xs font-semibold text-center leading-tight ${unlocked ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            {t(badge.nameKey)}
          </p>
          {isTotalSessions && (
            <div className="relative">
              <HelpCircle
                className="w-3 h-3 text-muted-foreground/50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(!showTooltip);
                }}
              />
              {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-popover border border-border text-popover-foreground text-[10px] rounded-lg px-2 py-1.5 shadow-lg w-36 z-50 text-center">
                  {language === 'no' ? 'Teller økter fra datoen du registrerte deg' : 'Counts sessions from your signup date'}
                </div>
              )}
            </div>
          )}
        </div>
        {(() => {
          const thresholdKey = `${badge.nameKey}Threshold` as any;
          const thresholdText = t(thresholdKey);
          return thresholdText !== thresholdKey ? (
            <p className={`text-[10px] font-medium ${unlocked ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
              {thresholdText}
            </p>
          ) : null;
        })()}
      </div>

      {/* Progress */}
      {unlocked && !showProgress ? (
        <p className="text-[10px] text-muted-foreground">✓</p>
      ) : !unlocked && showProgress ? (
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
