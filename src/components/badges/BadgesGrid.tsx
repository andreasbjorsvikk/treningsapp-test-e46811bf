import { useState, useEffect } from 'react';
import { UserBadge, computeUserBadges, SUBCATEGORY_NAMES } from '@/services/badgeService';
import { useTranslation } from '@/i18n/useTranslation';
import BadgeCard from './BadgeCard';
import BadgeDetailModal from './BadgeDetailModal';
import { Loader2 } from 'lucide-react';

interface BadgesGridProps {
  userId: string;
  isChild?: boolean;
  onlyUnlocked?: boolean;
}

const BadgesGrid = ({ userId, isChild = false, onlyUnlocked = false }: BadgesGridProps) => {
  const { t } = useTranslation();
  const { language } = useTranslation();
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

  // Group by subcategory
  const grouped = new Map<string, UserBadge[]>();
  for (const b of shown) {
    const key = b.badge.subcategory;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(b);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (shown.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">{t('badge.noBadgesUnlocked')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([subcategory, badgeList]) => (
        <div key={subcategory}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
            {SUBCATEGORY_NAMES[subcategory]?.[language] || subcategory}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {badgeList.map(b => (
              <BadgeCard key={b.badge.id} userBadge={b} onClick={() => setSelectedBadge(b)} showProgress={!onlyUnlocked} />
            ))}
          </div>
        </div>
      ))}
      <BadgeDetailModal badge={selectedBadge} open={!!selectedBadge} onClose={() => setSelectedBadge(null)} />
    </div>
  );
};

export default BadgesGrid;
