import { useState, useEffect } from 'react';
import { UserBadge, BadgeCategory, computeUserBadges, SUBCATEGORY_NAMES } from '@/services/badgeService';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useTranslation } from '@/i18n/useTranslation';
import BadgeCard from './BadgeCard';
import BadgeDetailModal from './BadgeDetailModal';
import BadgeUnlockOverlay from './BadgeUnlockOverlay';
import UniquePeaksBadgeBoard from './UniquePeaksBadgeBoard';
import { Loader2, Play } from 'lucide-react';

const BadgesPage = () => {
  const { user } = useAuth();
  const { adminMode } = useAdmin();
  const { t, language } = useTranslation();
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BadgeCategory>('fjell');
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const [previewUnlockBadge, setPreviewUnlockBadge] = useState<UserBadge | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    computeUserBadges(user.id).then(b => {
      setBadges(b);
      setLoading(false);
    });
  }, [user]);

  // In admin mode, show all badges as unlocked
  const displayBadges = adminMode
    ? badges.map(b => ({ ...b, unlocked: true, unlockedAt: b.unlockedAt || new Date().toISOString() }))
    : badges;

  const filtered = displayBadges.filter(b => b.badge.category === filter);

  const grouped = new Map<string, UserBadge[]>();
  for (const b of filtered) {
    const key = b.badge.subcategory;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(b);
  }
  for (const [, arr] of grouped) {
    arr.sort((a, b) => a.badge.sortOrder - b.badge.sortOrder);
  }

  const tabs: { key: BadgeCategory; label: string }[] = [
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

  const unlockedCount = adminMode ? displayBadges.length : badges.filter(b => b.unlocked).length;
  const totalCount = displayBadges.length;

  return (
    <div className="space-y-4">
      <div className="text-center px-4">
        <h2 className="font-display font-bold text-lg text-foreground">{t('badge.title')}</h2>
        <p className="text-xs text-muted-foreground mt-1">{unlockedCount}/{totalCount} {t('badge.subtitle')}</p>
      </div>

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

      {Array.from(grouped.entries()).map(([subcategory, badgeList]) => (
        <div key={subcategory}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {SUBCATEGORY_NAMES[subcategory]?.[language] || subcategory}
          </p>
          {(subcategory === 'unique_peaks' || subcategory === 'high_peaks') ? (
            <UniquePeaksBadgeBoard
              badges={badgeList}
              onSelectBadge={setSelectedBadge}
              adminMode={adminMode}
              onPreviewBadge={setPreviewUnlockBadge}
              columns={subcategory === 'high_peaks' ? 2 : 2}
            />
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {badgeList.map(b => (
                <div key={b.badge.id} className="relative">
                  <BadgeCard userBadge={b} onClick={() => setSelectedBadge(b)} />
                  {adminMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewUnlockBadge(b); }}
                      className="absolute top-1 left-1 p-1 rounded-full bg-background/80 border border-border shadow-sm hover:bg-muted transition-colors z-10"
                      title="Preview unlock animation"
                    >
                      <Play className="w-3 h-3 text-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-sm text-center text-muted-foreground py-8">
          {t('badge.noBadges')}
        </p>
      )}

      <BadgeDetailModal
        badge={selectedBadge}
        open={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
      />

      {previewUnlockBadge && (
        <BadgeUnlockOverlay
          badges={[previewUnlockBadge]}
          onDismiss={() => setPreviewUnlockBadge(null)}
        />
      )}
    </div>
  );
};

export default BadgesPage;
