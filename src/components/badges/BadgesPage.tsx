import { useState, useEffect } from 'react';
import { UserBadge, BadgeCategory, computeUserBadges, SUBCATEGORY_NAMES } from '@/services/badgeService';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import BadgeCard from './BadgeCard';
import BadgeDetailModal from './BadgeDetailModal';
import { Loader2 } from 'lucide-react';

type FilterTab = 'unlocked' | BadgeCategory;

const BadgesPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language } = useTranslation();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('unlocked');
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    computeUserBadges(user.id).then(b => {
      setBadges(b);
      setLoading(false);
    });
  }, [user]);

  const filtered = filter === 'unlocked'
    ? badges.filter(b => b.unlocked)
    : badges.filter(b => b.badge.category === filter);

  // Group by subcategory
  const grouped = new Map<string, UserBadge[]>();
  for (const b of filtered) {
    const key = b.badge.subcategory;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(b);
  }
  // Sort within each group
  for (const [, arr] of grouped) {
    arr.sort((a, b) => a.badge.sortOrder - b.badge.sortOrder);
  }

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'unlocked', label: language === 'no' ? 'Låst opp' : 'Unlocked' },
    { key: 'fjell', label: language === 'no' ? 'Fjell' : 'Mountain' },
    { key: 'trening', label: language === 'no' ? 'Trening' : 'Training' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const unlockedCount = badges.filter(b => b.unlocked).length;
  const totalCount = badges.length;

  return (
    <div className="space-y-4">
      <div className="text-center px-4">
        <h2 className="font-display font-bold text-lg text-foreground">{t('badge.title')}</h2>
        <p className="text-xs text-muted-foreground mt-1">{unlockedCount}/{totalCount} {t('badge.subtitle')}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/50">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grouped badges */}
      {Array.from(grouped.entries()).map(([subcategory, badgeList]) => (
        <div key={subcategory}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {SUBCATEGORY_NAMES[subcategory]?.[language] || subcategory}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {badgeList.map(b => (
              <BadgeCard key={b.badge.id} userBadge={b} onClick={() => setSelectedBadge(b)} />
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-sm text-center text-muted-foreground py-8">
          {filter === 'unlocked' ? t('badge.noBadgesUnlocked') : t('badge.noBadges')}
        </p>
      )}

      <BadgeDetailModal
        badge={selectedBadge}
        open={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />
    </div>
  );
};

export default BadgesPage;
