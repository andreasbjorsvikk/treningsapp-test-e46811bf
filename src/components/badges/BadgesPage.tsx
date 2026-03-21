import { useState, useEffect } from 'react';
import { UserBadge, BadgeCategory, computeUserBadges, getRarityColor } from '@/services/badgeService';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/i18n/useTranslation';
import BadgeCard from './BadgeCard';
import BadgeDetailModal from './BadgeDetailModal';
import { Loader2 } from 'lucide-react';

type FilterTab = 'all' | BadgeCategory;

const BadgesPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    computeUserBadges(user.id).then(b => {
      setBadges(b);
      setLoading(false);
    });
  }, [user]);

  const filtered = filter === 'all' ? badges : badges.filter(b => b.badge.category === filter);
  const unlocked = filtered.filter(b => b.unlocked).sort((a, b) => a.badge.sortOrder - b.badge.sortOrder);
  const locked = filtered.filter(b => !b.unlocked).sort((a, b) => a.badge.sortOrder - b.badge.sortOrder);

  // Next badge to unlock
  const nextBadge = badges.find(b => !b.unlocked);

  const tabs: { key: FilterTab; labelKey: string }[] = [
    { key: 'all', labelKey: 'badge.filterAll' },
    { key: 'topper', labelKey: 'badge.filterTopper' },
    { key: 'fjellmerker', labelKey: 'badge.filterFjellmerker' },
    { key: 'trening', labelKey: 'badge.filterTrening' },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center px-4">
        <h2 className="font-display font-bold text-lg text-foreground">{t('badge.title')}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t('badge.subtitle')}</p>
      </div>

      {/* Next badge card */}
      {nextBadge && (
        <div
          className="mx-0 p-4 rounded-2xl border border-border/60 bg-card shadow-sm cursor-pointer"
          onClick={() => setSelectedBadge(nextBadge)}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
              <span className="text-3xl opacity-40 grayscale">{nextBadge.badge.emoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('badge.nextBadge')}</p>
              <p className="text-sm font-bold text-foreground truncate">{t(nextBadge.badge.nameKey)}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((nextBadge.progress / nextBadge.badge.threshold) * 100, 100)}%`,
                      backgroundColor: getRarityColor(nextBadge.badge.rarity),
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                  {nextBadge.progress}/{nextBadge.badge.threshold}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

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
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('badge.unlocked')} ({unlocked.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {unlocked.map(b => (
              <BadgeCard key={b.badge.id} userBadge={b} onClick={() => setSelectedBadge(b)} />
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {t('badge.locked')} ({locked.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {locked.map(b => (
              <BadgeCard key={b.badge.id} userBadge={b} onClick={() => setSelectedBadge(b)} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <p className="text-sm text-center text-muted-foreground py-8">{t('badge.noBadges')}</p>
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
