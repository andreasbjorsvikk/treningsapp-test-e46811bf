import { UserBadge, getRarityColor, getRarityGlow } from '@/services/badgeService';
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
  if (!badge) return null;

  const { badge: def, unlocked, unlockedAt, progress, repeatCount } = badge;
  const rarityColor = getRarityColor(def.rarity);
  const glowColor = getRarityGlow(def.rarity);
  const progressPercent = Math.min((progress / def.threshold) * 100, 100);
  const rarityLabel = t(`badge.rarity.${def.rarity}`);

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-[340px] rounded-2xl p-6 text-center">
        {/* Badge visual */}
        <div className="flex justify-center mb-4">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: unlocked ? `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` : 'hsl(var(--muted))',
              boxShadow: unlocked ? `0 0 40px ${glowColor}` : 'none',
            }}
          >
            {def.image ? (
              <img
                src={def.image}
                alt={t(def.nameKey)}
                className={`w-24 h-24 object-contain ${unlocked ? '' : 'grayscale brightness-50 opacity-60'}`}
              />
            ) : (
              <span className={`text-6xl ${unlocked ? '' : 'grayscale opacity-40'}`}>
                {def.emoji}
              </span>
            )}
          </div>
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

        {/* Title & description */}
        <h3 className="font-display font-bold text-lg text-foreground mb-1">{t(def.nameKey)}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t(def.descriptionKey)}</p>

        {/* Requirement */}
        <p className="text-xs text-muted-foreground mb-3">{t(def.requirementKey)}</p>

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

        {/* Unlock date */}
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
