import { useState, useEffect } from 'react';
import { UserBadge, getRarityColor, getRarityGlow, getHighPeakGlow } from '@/services/badgeService';
import { useTranslation } from '@/i18n/useTranslation';

interface BadgeUnlockOverlayProps {
  badges: UserBadge[];
  onDismiss: () => void;
  onViewBadge?: () => void;
}

const ANIM_DURATION = 800;

const BadgeUnlockOverlay = ({ badges, onDismiss, onViewBadge }: BadgeUnlockOverlayProps) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [pulseGlow, setPulseGlow] = useState(false);

  const mainBadge = badges.length > 0 ? badges[badges.length - 1] : null;
  const extraCount = badges.length - 1;

  useEffect(() => {
    if (!mainBadge) return;
    requestAnimationFrame(() => setVisible(true));
    const t1 = setTimeout(() => setShowContent(true), 200);
    const t2 = setTimeout(() => setPulseGlow(true), ANIM_DURATION);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [mainBadge]);

  if (!mainBadge) return null;

  const highPeakGlow = getHighPeakGlow(mainBadge.badge.id);
  const rarityColor = highPeakGlow?.color || getRarityColor(mainBadge.badge.rarity);
  const glowColor = highPeakGlow?.glow || getRarityGlow(mainBadge.badge.rarity);
  const isLegendary = mainBadge.badge.rarity === 'legendary' || mainBadge.badge.rarity === 'epic';
  const thresholdKey = `${mainBadge.badge.nameKey}Threshold` as any;
  const thresholdText = t(thresholdKey);
  const hasThresholdText = thresholdText !== thresholdKey;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-[110] flex items-center justify-center transition-all duration-300 ${
        visible ? 'bg-black/60 backdrop-blur-sm' : 'bg-transparent pointer-events-none'
      }`}
      onClick={handleDismiss}
    >
      <div
        className={`relative flex flex-col items-center gap-5 p-8 rounded-2xl bg-background border border-border shadow-2xl transition-all duration-500 max-w-[340px] w-[90vw] ${
          showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Badge visual with glow - much bigger */}
        <div className="relative">
          <div
            className={`w-56 h-56 rounded-full flex items-center justify-center transition-all duration-700 ${
              isLegendary ? 'animate-pulse' : ''
            }`}
            style={{
              background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
              boxShadow: pulseGlow ? `0 0 50px ${glowColor}, 0 0 100px ${glowColor}` : 'none',
            }}
          >
            {mainBadge.badge.image ? (
              <img
                src={mainBadge.badge.image}
                alt={t(mainBadge.badge.nameKey)}
                className={`w-52 h-52 object-contain transition-transform duration-500 ${showContent ? 'scale-100' : 'scale-0'}`}
                style={{ filter: `drop-shadow(0 0 16px ${glowColor})` }}
              />
            ) : (
              <span className={`text-7xl transition-transform duration-500 ${showContent ? 'scale-100' : 'scale-0'}`}
                style={{ filter: `drop-shadow(0 0 16px ${glowColor})` }}
              >
                {mainBadge.badge.emoji}
              </span>
            )}
          </div>
          <div
            className="absolute inset-0 rounded-full border-2 opacity-30"
            style={{ borderColor: rarityColor }}
          />
        </div>

        {/* Title */}
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: rarityColor }}>
            {t('badge.newUnlocked')}
          </p>
          <h3 className="font-display font-bold text-xl text-foreground">
            {t(mainBadge.badge.nameKey)}
          </h3>
          {hasThresholdText && (
            <p className="text-sm font-semibold" style={{ color: rarityColor }}>{thresholdText}</p>
          )}
          <p className="text-sm text-muted-foreground">
            {t(mainBadge.badge.descriptionKey)}
          </p>
        </div>

        {extraCount > 0 && (
          <p className="text-xs text-muted-foreground">
            +{extraCount} {t('badge.moreBadges')}
          </p>
        )}

        <div className="w-full space-y-2">
          {onViewBadge && (
            <button
              onClick={() => { handleDismiss(); setTimeout(() => onViewBadge(), 350); }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-colors shadow-lg"
              style={{ backgroundColor: rarityColor, color: '#fff' }}
            >
              {t('badge.viewBadge')}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm hover:bg-secondary/80 transition-colors"
          >
            {t('badge.continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BadgeUnlockOverlay;
