import { useState } from 'react';
import { mockLeaderboard, metricUnits, LeaderboardEntry, MockUser } from '@/data/mockCommunity';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';
import ActivityIcon from '@/components/ActivityIcon';
import UserProfileDrawer from '@/components/community/UserProfileDrawer';
import { Trophy } from 'lucide-react';

const periodTabs = [
  { id: 'weekly', label: 'Ukentlig' },
  { id: 'monthly', label: 'Månedlig' },
  { id: 'yearly', label: 'Årlig' },
];

const categoryTabs = [
  { id: 'sessions', label: 'Økter' },
  { id: 'distance', label: 'Distanse' },
  { id: 'duration', label: 'Total tid' },
  { id: 'elevation', label: 'Høydemeter' },
];

const LeaderboardSection = () => {
  const { settings } = useSettings();
  const isDark = settings.darkMode;
  const [period, setPeriod] = useState('monthly');
  const [category, setCategory] = useState('sessions');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [profileUser, setProfileUser] = useState<MockUser | null>(null);

  const unit = metricUnits[category as keyof typeof metricUnits] || '';
  const data: LeaderboardEntry[] = mockLeaderboard;

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

      <div className="flex gap-1 mb-3">
        {categoryTabs.map(cat => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
              category === cat.id ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Activity type filter */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <button
          onClick={() => setSelectedType('all')}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selectedType === 'all' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
          }`}
        >
          Alle
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
              {sessionTypeConfig[type].label}
            </button>
          );
        })}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Inviter venner for å starte konkurranse</p>
        </div>
      ) : (
        <div className="space-y-1">
          {data.map((entry, i) => (
            <button
              key={entry.user.id}
              onClick={() => entry.user.id !== 'me' && setProfileUser(entry.user)}
              className={`w-full flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5 text-left ${
                entry.user.id !== 'me' ? 'hover:bg-secondary/70 cursor-pointer' : ''
              } transition-colors`}
            >
              <span className={`font-display font-bold text-sm w-6 text-center ${i === 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                {i === 0 ? <Trophy className="w-4 h-4 inline text-warning" /> : `#${entry.rank}`}
              </span>
              <div className="w-6 h-6 rounded-full bg-secondary border border-background flex items-center justify-center shrink-0">
                <span className="text-[10px] font-medium">{entry.user.username[0]}</span>
              </div>
              <span className="flex-1 text-sm font-medium truncate">{entry.user.username}</span>
              <span className="text-sm font-display font-bold">{entry.value}{unit ? ` ${unit}` : ''}</span>
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
