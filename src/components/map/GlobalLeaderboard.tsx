import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Loader2, Mountain } from 'lucide-react';
import UserProfileDrawer from '@/components/community/UserProfileDrawer';

type Period = 'month' | 'year' | 'total';
type Metric = 'unique' | 'total';
type Scope = 'global' | 'friends';

interface LeaderEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  unique_peaks: number;
  total_ascents: number;
  isChild?: boolean;
}

const periods: { id: Period; label: string }[] = [
  { id: 'month', label: 'Måned' },
  { id: 'year', label: 'År' },
  { id: 'total', label: 'Totalt' },
];

const GlobalLeaderboard = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>('total');
  const [metric, setMetric] = useState<Metric>('unique');
  const [scope, setScope] = useState<Scope>('global');
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<{ id: string; username: string | null; avatar_url: string | null } | null>(null);
  const [friendIds, setFriendIds] = useState<string[]>([]);

  // Load friends once
  useEffect(() => {
    if (!user) return;
    supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .then(({ data }) => {
        const ids = (data || []).map(f => f.user_id === user.id ? f.friend_id : f.user_id);
        setFriendIds(ids);
      });
  }, [user]);

  useEffect(() => {
    loadLeaderboard();
  }, [period, scope, friendIds]);

  const loadLeaderboard = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase.from('peak_checkins').select('user_id, peak_id, checked_in_at');

      if (period === 'month') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        query = query.gte('checked_in_at', start);
      } else if (period === 'year') {
        const start = new Date(new Date().getFullYear(), 0, 1).toISOString();
        query = query.gte('checked_in_at', start);
      }

      // For friends scope, filter by friend IDs + self
      if (scope === 'friends') {
        const scopeIds = [...friendIds, user.id];
        if (scopeIds.length === 0) { setEntries([]); setLoading(false); return; }
        query = query.in('user_id', scopeIds);
      }

      const { data: checkins } = await query;
      if (!checkins) { setEntries([]); setLoading(false); return; }

      const userPeaks = new Map<string, Set<string>>();
      const userTotalAscents = new Map<string, number>();
      (checkins as any[]).forEach((c: any) => {
        if (!userPeaks.has(c.user_id)) userPeaks.set(c.user_id, new Set());
        userPeaks.get(c.user_id)!.add(c.peak_id);
        userTotalAscents.set(c.user_id, (userTotalAscents.get(c.user_id) || 0) + 1);
      });

      const userIds = Array.from(userPeaks.keys());
      if (userIds.length === 0) { setEntries([]); setLoading(false); return; }

      const [{ data: profiles }, { data: childProfiles }] = await Promise.all([
        supabase.from('profiles').select('id, username, avatar_url').in('id', userIds),
        supabase.from('child_profiles').select('id, name, avatar_url').in('id', userIds),
      ]);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      const childMap = new Map(((childProfiles || []) as any[]).map(c => [c.id, c]));

      const leaderboard: LeaderEntry[] = userIds.map(uid => {
        const profile = profileMap.get(uid);
        const child = childMap.get(uid);
        return {
          user_id: uid,
          username: profile?.username || child?.name || null,
          avatar_url: profile?.avatar_url || child?.avatar_url || null,
          unique_peaks: userPeaks.get(uid)!.size,
          total_ascents: userTotalAscents.get(uid) || 0,
          isChild: !!child && !profile,
        };
      });

      setEntries(leaderboard);
    } catch (e) {
      console.error('Leaderboard error:', e);
    }
    setLoading(false);
  };

  const sortedEntries = [...entries].sort((a, b) => {
    if (metric === 'unique') return b.unique_peaks - a.unique_peaks;
    return b.total_ascents - a.total_ascents;
  });

  const getMedalColor = (index: number) => {
    if (index === 0) return 'text-yellow-500';
    if (index === 1) return 'text-gray-400';
    if (index === 2) return 'text-amber-700';
    return 'text-muted-foreground';
  };

  const handleProfileClick = (entry: LeaderEntry) => {
    if (entry.isChild) return;
    setSelectedProfile({ id: entry.user_id, username: entry.username, avatar_url: entry.avatar_url });
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Scope filter: Global / Venner */}
      <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/50">
        {([{ id: 'global', label: 'Global' }, { id: 'friends', label: 'Venner' }] as { id: Scope; label: string }[]).map(s => (
          <button
            key={s.id}
            onClick={() => setScope(s.id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              scope === s.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Metric dropdown */}
      <select
        value={metric}
        onChange={(e) => setMetric(e.target.value as Metric)}
        className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm font-medium text-foreground"
      >
        <option value="unique">Unike topper</option>
        <option value="total">Totalt antall turer</option>
      </select>

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
      ) : sortedEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Mountain className="w-10 h-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm text-muted-foreground">
            {scope === 'friends' ? 'Ingen av vennene dine har innsjekkinger i denne perioden.' : 'Ingen innsjekkinger i denne perioden.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedEntries.map((entry, index) => {
            const isMe = entry.user_id === user?.id;
            const displayValue = metric === 'unique' ? entry.unique_peaks : entry.total_ascents;
            const displayLabel = metric === 'unique' ? 'topper' : 'turer';
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
                <button onClick={() => handleProfileClick(entry)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={entry.avatar_url || undefined} />
                    <AvatarFallback>{entry.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm truncate block">
                      {entry.username || 'Ukjent'}
                      {isMe && <span className="text-muted-foreground font-normal"> (deg)</span>}
                      {entry.isChild && <span className="text-muted-foreground font-normal text-xs ml-1">👶</span>}
                    </span>
                  </div>
                </button>
                <div className="text-right shrink-0">
                  <span className="font-display font-bold text-lg">{displayValue}</span>
                  <span className="text-xs text-muted-foreground ml-1">{displayLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User profile drawer */}
      {selectedProfile && (
        <UserProfileDrawer
          user={selectedProfile as any}
          open={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
};

export default GlobalLeaderboard;
