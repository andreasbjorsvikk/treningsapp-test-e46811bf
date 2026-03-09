import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Loader2, Mountain } from 'lucide-react';

type Period = 'month' | 'year' | 'total';

interface LeaderEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  unique_peaks: number;
}

const periods: { id: Period; label: string }[] = [
  { id: 'month', label: 'Måned' },
  { id: 'year', label: 'År' },
  { id: 'total', label: 'Totalt' },
];

const GlobalLeaderboard = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('total');
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      let query = supabase.from('peak_checkins' as any).select('user_id, peak_id, checked_in_at');

      if (period === 'month') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('checked_in_at', start);
      } else if (period === 'year') {
        const start = new Date(new Date().getFullYear(), 0, 1).toISOString();
        query = query.gte('checked_in_at', start);
      }

      const { data: checkins } = await query;
      if (!checkins) { setEntries([]); setLoading(false); return; }

      // Count unique peaks per user
      const userPeaks = new Map<string, Set<string>>();
      (checkins as any[]).forEach((c: any) => {
        if (!userPeaks.has(c.user_id)) userPeaks.set(c.user_id, new Set());
        userPeaks.get(c.user_id)!.add(c.peak_id);
      });

      const userIds = Array.from(userPeaks.keys());
      if (userIds.length === 0) { setEntries([]); setLoading(false); return; }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const leaderboard: LeaderEntry[] = userIds.map(uid => {
        const profile = profileMap.get(uid);
        return {
          user_id: uid,
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
          unique_peaks: userPeaks.get(uid)!.size,
        };
      }).sort((a, b) => b.unique_peaks - a.unique_peaks);

      setEntries(leaderboard);
    } catch (e) {
      console.error('Leaderboard error:', e);
    }
    setLoading(false);
  };

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-amber-700';
    return 'text-muted-foreground';
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Period filter */}
      <div className="flex gap-2">
        {periods.map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              period === p.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Mountain className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">Ingen innsjekkinger i denne perioden.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry, index) => {
            const isMe = entry.user_id === user?.id;
            return (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  isMe ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/50'
                }`}
              >
                <div className={`w-8 text-center font-display font-bold text-lg ${getMedalColor(index)}`}>
                  {index < 3 ? (
                    <Trophy className="w-5 h-5 mx-auto" />
                  ) : (
                    <span className="text-sm">{index + 1}</span>
                  )}
                </div>
                <Avatar className="w-10 h-10">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback>{entry.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-sm truncate block">
                    {entry.username || 'Ukjent'}
                    {isMe && <span className="text-muted-foreground font-normal"> (deg)</span>}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-display font-bold text-lg">{entry.unique_peaks}</span>
                  <span className="text-xs text-muted-foreground ml-1">topper</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GlobalLeaderboard;
