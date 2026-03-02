import { useState } from 'react';
import { mockLeaderboard, metricUnits, LeaderboardEntry } from '@/data/mockCommunity';
import CommunitySubTabs from './CommunitySubTabs';
import { Trophy } from 'lucide-react';

const periodTabs = [
  { id: 'weekly', label: 'Ukentlig' },
  { id: 'monthly', label: 'Månedlig' },
  { id: 'yearly', label: 'Årlig' },
];

const categoryTabs = [
  { id: 'sessions', label: 'Økter' },
  { id: 'distance', label: 'Distanse' },
  { id: 'elevation', label: 'Høydemeter' },
];

const LeaderboardSection = () => {
  const [period, setPeriod] = useState('monthly');
  const [category, setCategory] = useState('sessions');

  const unit = metricUnits[category as keyof typeof metricUnits] || '';
  const data: LeaderboardEntry[] = mockLeaderboard;

  return (
    <div className="space-y-3">
      <CommunitySubTabs tabs={periodTabs} active={period} onChange={setPeriod} />

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

      {data.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Inviter venner for å starte konkurranse</p>
        </div>
      ) : (
        <div className="space-y-1">
          {data.map((entry, i) => (
            <div key={entry.user.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5">
              <span className={`font-display font-bold text-sm w-6 text-center ${i === 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                {i === 0 ? <Trophy className="w-4 h-4 inline text-warning" /> : `#${entry.rank}`}
              </span>
              <div className="w-6 h-6 rounded-full bg-secondary border border-background flex items-center justify-center shrink-0">
                <span className="text-[10px] font-medium">{entry.user.username[0]}</span>
              </div>
              <span className="flex-1 text-sm font-medium truncate">{entry.user.username}</span>
              <span className="text-sm font-display font-bold">{entry.value}{unit ? ` ${unit}` : ''}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaderboardSection;
