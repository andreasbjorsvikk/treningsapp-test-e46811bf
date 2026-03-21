import { useState, useEffect } from 'react';
import { UserBadge, computeUserBadges } from '@/services/badgeService';
import { useTranslation } from '@/i18n/useTranslation';
import BadgeCard from './BadgeCard';
import BadgeDetailModal from './BadgeDetailModal';
import { Loader2 } from 'lucide-react';

interface BadgesGridProps {
  userId: string;
  isChild?: boolean;
  onlyUnlocked?: boolean;
}

/** Reusable badge grid for child profiles and friend profiles (shows only unlocked badges) */
const BadgesGrid = ({ userId, isChild = false, onlyUnlocked = false }: BadgesGridProps) => {
  const { t } = useTranslation();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  useEffect(() => {
    setLoading(true);
    computeUserBadges(userId, isChild).then(b => {
      setBadges(b);
      setLoading(false);
    });
  }, [userId, isChild]);

  const shown = onlyUnlocked ? badges.filter(b => b.unlocked) : badges;
  const unlocked = shown.filter(b => b.unlocked);
  const locked = shown.filter(b => !b.unlocked);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (unlocked.length === 0 && onlyUnlocked) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">{t('badge.noBadgesUnlocked')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {unlocked.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {unlocked.map(b => (
            <BadgeCard key={b.badge.id} userBadge={b} onClick={() => setSelectedBadge(b)} showProgress={false} />
          ))}
        </div>
      )}
      {!onlyUnlocked && locked.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {locked.map(b => (
            <BadgeCard key={b.badge.id} userBadge={b} onClick={() => setSelectedBadge(b)} />
          ))}
        </div>
      )}
      <BadgeDetailModal badge={selectedBadge} open={!!selectedBadge} onClose={() => setSelectedBadge(null)} />
    </div>
  );
};

export default BadgesGrid;
