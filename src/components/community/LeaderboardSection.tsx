import { useState, useEffect } from 'react';
import { getLeaderboard, Friend, LeaderboardMetric } from '@/services/communityService';
import { allSessionTypes } from '@/utils/workoutUtils';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import ActivityIcon from '@/components/ActivityIcon';
import UserProfileDrawer from '@/components/community/UserProfileDrawer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Loader2 } from 'lucide-react';
import { formatDuration } from '@/utils/workoutUtils';
import { useTranslation } from '@/i18n/useTranslation';

function formatMetricValue(value: number, metric: LeaderboardMetric): string {
  switch (metric) {
    case 'sessions': return String(value);
    case 'duration': return formatDuration(value);
    case 'distance': return `${value.toFixed(1)} km`;
    case 'elevation': return `${Math.round(value)} m`;
  }
}

const LeaderboardSection = () => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const isDark = settings.darkMode;
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [metric, setMetric] = useState<LeaderboardMetric>('sessions');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [profileUser, setProfileUser] = useState<Friend | null>(null);
  const [data, setData] = useState<{ user: Friend; value: number; rank: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const periodTabs = [
    { id: 'week' as const, label: t('leaderboard.week') },
    { id: 'month' as const, label: t('leaderboard.month') },
    { id: 'all' as const, label: t('leaderboard.year') },
  ];

  const metricTabs: { id: LeaderboardMetric; label: string }[] = [
    { id: 'sessions', label: t('leaderboard.sessions') },
    { id: 'duration', label: t('leaderboard.time') },
    { id: 'distance', label: t('leaderboard.distance') },
    { id: 'elevation', label: t('leaderboard.elevation') },
  ];

  useEffect(() => {
    setLoading(true);
    getLeaderboard(period, metric, selectedType).then(d => { setData(d); setLoading(false); });
  }, [period, metric, selectedType]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1 mb-1">
        {periodTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setPeriod(tab.id)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              period === tab.id ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {metricTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setMetric(tab.id)}
            className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-colors ${
              metric === tab.id ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 text-muted-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setSelectedType('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedType === 'all' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
          }`}
        >
          {t('common.all')}
        </button>
        {allSessionTypes.map(type => {
          const colors = getActivityColors(type, isDark);
          const isSelected = selectedType === type;
          return (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !isSelected ? 'bg-secondary text-muted-foreground' : ''
              }`}
              style={isSelected ? { backgroundColor: colors.bg, color: colors.text } : undefined}
            >
              <span className="w-3 h-3 flex items-center justify-center">
                <ActivityIcon type={type} className="w-3 h-3" colorOverride={isSelected ? colors.text : undefined} />
              </span>
              {t(`activity.${type}`)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">{t('leaderboard.addFriends')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {data.map((entry, i) => (
            <button
              key={entry.user.id}
              onClick={() => entry.user.username !== 'Meg' && entry.user.username !== 'Me' && setProfileUser(entry.user)}
              className={`w-full flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5 text-left ${
                entry.user.username !== 'Meg' && entry.user.username !== 'Me' ? 'hover:bg-secondary/70 cursor-pointer' : ''
              } transition-colors`}
            >
              <span className={`font-display font-bold text-sm w-6 text-center ${i === 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                {i === 0 ? <Trophy className="w-4 h-4 inline text-warning" /> : `#${entry.rank}`}
              </span>
              <Avatar className="w-6 h-6">
                {entry.user.avatarUrl ? <AvatarImage src={entry.user.avatarUrl} /> : null}
                <AvatarFallback className="text-[10px] font-medium">{(entry.user.username || '?')[0]}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium truncate">{entry.user.username}</span>
              <span className="text-sm font-display font-bold">{formatMetricValue(entry.value, metric)}</span>
            </button>
          ))}
        </div>
      )}

      <UserProfileDrawer
        user={profileUser}
        open={!!profileUser}
        onClose={() => setProfileUser(null)}
      />
    </div>
  );
};

export default LeaderboardSection;
