import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type Period = 'month' | 'year' | 'total';

interface LeaderEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  count: number;
  isChild?: boolean;
}

const periods: { id: Period; label: string }[] = [
  { id: 'month', label: 'Denne måneden' },
  { id: 'year', label: 'I år' },
  { id: 'total', label: 'Totalt' },
];

interface PeakLeaderboardProps {
  peakId: string;
}

const PeakLeaderboard = ({ peakId }: PeakLeaderboardProps) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState<Period>('total');
  const [entries, setEntries] = useState<LeaderEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (expanded) loadLeaderboard();
  }, [expanded, period, peakId]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('peak_checkins')
        .select('user_id, checked_in_at')
        .eq('peak_id', peakId);

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

      // Count per user
      const counts = new Map<string, number>();
      (checkins as any[]).forEach((c: any) => {
        counts.set(c.user_id, (counts.get(c.user_id) || 0) + 1);
      });

      const userIds = Array.from(counts.keys());
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
          count: counts.get(uid) || 0,
          isChild: !!child && !profile,
        };
      }).sort((a, b) => b.count - a.count);

      setEntries(leaderboard);
    } catch (e) {
      console.error('Peak leaderboard error:', e);
    }
    setLoading(false);
  };

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Lederliste</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3">
          {/* Period filter */}
          <div className="flex gap-1.5">
            {periods.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  period === p.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Ingen innsjekkinger i denne perioden.</p>
          ) : (
            <div className="space-y-1.5">
              {entries.slice(0, 10).map((entry, index) => {
                const isMe = entry.user_id === user?.id;
                return (
                  <div key={entry.user_id} className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg ${isMe ? 'bg-primary/5' : ''}`}>
                    <span className={`w-5 text-center text-xs font-bold ${
                      index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-700' : 'text-muted-foreground'
                    }`}>
                      {index + 1}
                    </span>
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={entry.avatar_url || undefined} />
                      <AvatarFallback className="text-[10px]">{entry.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm truncate">
                      {entry.username || 'Ukjent'}
                      {entry.isChild && <span className="text-xs ml-1">👶</span>}
                    </span>
                    <span className="text-sm font-semibold">{entry.count} <span className="text-xs text-muted-foreground font-normal">ganger</span></span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PeakLeaderboard;
