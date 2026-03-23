import { useState, useEffect } from 'react';
import { UserBadge, getRarityColor, getRarityGlow, getHighPeakGlow } from '@/services/badgeService';
import { useTranslation } from '@/i18n/useTranslation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface BadgeDetailModalProps {
  badge: UserBadge | null;
  open: boolean;
  onClose: () => void;
}

const BadgeDetailModal = ({ badge, open, onClose }: BadgeDetailModalProps) => {
  const { t } = useTranslation();
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (open && badge?.unlocked && badge.badge.subcategory === 'unique_peaks') {
      setSpinning(true);
      const timer = setTimeout(() => setSpinning(false), 2000);
      return () => clearTimeout(timer);
    }
    setSpinning(false);
  }, [open, badge]);

  if (!badge) return null;

  const { badge: def, unlocked, unlockedAt, progress, repeatCount } = badge;
  const highPeakGlow = getHighPeakGlow(def.id);
  const rarityColor = highPeakGlow?.color || getRarityColor(def.rarity);
  const glowColor = highPeakGlow?.glow || getRarityGlow(def.rarity);
  const progressPercent = Math.min((progress / def.threshold) * 100, 100);
  const rarityLabel = t(`badge.rarity.${def.rarity}`);
  const isUniquePeaks = def.subcategory === 'unique_peaks';
  const detailBadgeScale = def.id === 'peaks_100'
    ? 1.22
    : def.subcategory === 'unique_peaks'
      ? 1.14
      : def.subcategory === 'high_peaks'
        ? 1.1
        : 1;
  const thresholdKey = `${def.nameKey}Threshold` as any;
  const thresholdText = t(thresholdKey);
  const hasThresholdText = thresholdText !== thresholdKey;
  const showThresholdHeadline = hasThresholdText && isUniquePeaks;
  const showDescription = !isUniquePeaks;
  const showRequirement = false;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-[340px] rounded-2xl p-6 text-center">
        {/* Badge visual */}
        <div className="flex justify-center mb-4">
          {def.image ? (
            <div
              className={`relative flex h-60 w-60 items-center justify-center overflow-visible ${isUniquePeaks && unlocked ? 'perspective-[600px]' : ''}`}
              onClick={() => isUniquePeaks && unlocked && setSpinning(true)}
            >
              <img
                src={def.image}
                alt={t(def.nameKey)}
                className={`h-56 w-56 object-contain ${unlocked ? '' : 'grayscale brightness-[0.08] opacity-30'} ${
                  spinning ? 'animate-coin-spin' : ''
                }`}
                style={{
                  transform: `scale(${detailBadgeScale})`,
                  ...(unlocked ? {
                    filter: `drop-shadow(0 0 24px ${glowColor})`,
                    transformStyle: 'preserve-3d',
                  } : {}),
                }}
              />
            </div>
          ) : (
            <div
              className="w-36 h-36 rounded-full flex items-center justify-center"
              style={{
                background: unlocked ? `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` : 'hsl(var(--muted))',
                boxShadow: unlocked ? `0 0 40px ${glowColor}` : 'none',
              }}
            >
              <span className={`text-6xl ${unlocked ? '' : 'grayscale opacity-40'}`}>
                {def.emoji}
              </span>
            </div>
          )}
        </div>

        {/* Rarity tag */}
        <div className="flex justify-center mb-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full"
            style={{ color: rarityColor, backgroundColor: glowColor }}
          >
            {rarityLabel}
          </span>
        </div>

        <h3 className="font-display font-bold text-lg text-foreground mb-0.5">{t(def.nameKey)}</h3>
        {showThresholdHeadline && (
          <p className="text-sm font-semibold mb-2" style={{ color: rarityColor }}>{thresholdText}</p>
        )}
        {showDescription && <p className="text-sm text-muted-foreground mb-4">{t(def.descriptionKey)}</p>}
        {showRequirement && <p className="text-xs text-muted-foreground mb-3">{t(def.requirementKey)}</p>}

        {/* Repeat count */}
        {repeatCount && repeatCount > 0 && (
          <div className="mb-3">
            <span className="text-sm font-semibold" style={{ color: rarityColor }}>
              {t('badge.achievedTimes', { count: String(repeatCount) })}
            </span>
          </div>
        )}

        {/* Progress */}
        {!unlocked && (
          <div className="space-y-2 mb-4">
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${progressPercent}%`, backgroundColor: rarityColor }}
              />
            </div>
            <p className="text-sm font-semibold" style={{ color: rarityColor }}>
              {Math.round(progress)} / {def.threshold}
            </p>
          </div>
        )}

        {unlocked && unlockedAt && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground">
              {t('badge.unlockedOn')} {format(new Date(unlockedAt), 'dd.MM.yyyy')}
            </p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          {t('common.ok')}
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeDetailModal;
