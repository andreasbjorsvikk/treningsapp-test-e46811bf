import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Mountain, Loader2, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

interface FeedItem {
  id: string;
  user_id: string;
  peak_id: string;
  checked_in_at: string;
  username: string | null;
  avatar_url: string | null;
  peak_name: string;
  peak_elevation: number;
  peak_area: string;
}

const PeakFeed = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadFeed();
  }, [user]);

  const loadFeed = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get accepted friendships
      const { data: friendships, error: fError } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      
      if (fError) { console.error('Feed friendships error:', fError); }

      if (!friendships || friendships.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Include self in feed
      const allUserIds = [...friendIds, user.id];

      // Get profiles with privacy settings
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, privacy_peak_checkins, privacy_peak_checkins_friends')
        .in('id', allUserIds);

      if (!profiles) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Filter based on privacy (self always visible)
      const visibleUserIds = profiles.filter(p => {
        if (p.id === user.id) return true;
        const privacy = p.privacy_peak_checkins || 'friends';
        if (privacy === 'me') return false;
        if (privacy === 'friends') return true;
        if (privacy === 'selected') {
          const allowed = (p.privacy_peak_checkins_friends as string[]) || [];
          return allowed.includes(user.id);
        }
        return true;
      }).map(p => p.id);

      if (visibleUserIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Get recent checkins
      const { data: checkins, error: cError } = await supabase
        .from('peak_checkins')
        .select('*')
        .in('user_id', visibleUserIds)
        .order('checked_in_at', { ascending: false })
        .limit(50);

      if (cError) { console.error('Feed checkins error:', cError); }

      if (!checkins || checkins.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Get peak info - filter out non-UUID peak_ids to avoid query errors
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const allPeakIds = [...new Set((checkins as any[]).map((c: any) => c.peak_id))];
      const validUuidPeakIds = allPeakIds.filter(id => uuidRegex.test(id));
      
      let peaks: any[] = [];
      if (validUuidPeakIds.length > 0) {
        const { data } = await supabase
          .from('peaks_db')
          .select('id, name_no, elevation_moh, area')
          .in('id', validUuidPeakIds);
        peaks = data || [];
      }

      const peakMap = new Map((peaks || []).map((p: any) => [p.id, p]));
      const profileMap = new Map(profiles.map(p => [p.id, p]));

      const feedItems: FeedItem[] = (checkins as any[]).map((c: any) => {
        const peak = peakMap.get(c.peak_id);
        const profile = profileMap.get(c.user_id);
        return {
          id: c.id,
          user_id: c.user_id,
          peak_id: c.peak_id,
          checked_in_at: c.checked_in_at,
          username: profile?.username || null,
          avatar_url: profile?.avatar_url || null,
          peak_name: peak?.name_no || 'Ukjent topp',
          peak_elevation: peak?.elevation_moh || 0,
          peak_area: peak?.area || '',
        };
      }).filter(item => item.peak_name !== 'Ukjent topp');

      setItems(feedItems);
    } catch (e) {
      console.error('Feed load error:', e);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Mountain className="w-8 h-8 text-primary/60" />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">Ingen innsjekkinger ennå</p>
        <p className="text-xs text-muted-foreground max-w-[240px]">
          Når du eller vennene dine sjekker inn på fjelltopper, dukker de opp her!
        </p>
      </div>
    );
  }

  // Group by date
  const grouped = new Map<string, FeedItem[]>();
  for (const item of items) {
    const dateKey = format(new Date(item.checked_in_at), 'yyyy-MM-dd');
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(item);
  }

  const formatGroupDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const yesterday = format(new Date(now.getTime() - 86400000), 'yyyy-MM-dd');
    if (dateStr === today) return 'I dag';
    if (dateStr === yesterday) return 'I går';
    return format(d, "EEEE d. MMMM", { locale: nb });
  };

  return (
    <div className="flex flex-col gap-1 p-4">
      {/* Refresh button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={loadFeed}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Oppdater
        </button>
      </div>

      {Array.from(grouped.entries()).map(([dateKey, dateItems]) => (
        <div key={dateKey} className="mb-4">
          {/* Date header */}
          <div className="flex items-center gap-3 mb-2.5">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">
              {formatGroupDate(dateKey)}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          <div className="space-y-2.5">
            {dateItems.map(item => {
              const isMe = item.user_id === user?.id;
              const timeAgo = formatDistanceToNow(new Date(item.checked_in_at), { locale: nb, addSuffix: true });

              return (
                <div
                  key={item.id}
                  className="group relative rounded-2xl bg-card border border-border/40 overflow-hidden hover:border-border/80 transition-all duration-200"
                >
                  {/* Top accent bar */}
                  <div className="h-0.5 bg-gradient-to-r from-emerald-500/60 via-emerald-400/30 to-transparent" />
                  
                  <div className="p-3.5">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <Avatar className="w-10 h-10 shrink-0 ring-2 ring-emerald-500/20">
                        <AvatarImage src={item.avatar_url || undefined} />
                        <AvatarFallback className="text-sm font-bold bg-emerald-500/10 text-emerald-600">
                          {item.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">
                          <span className="font-semibold">{isMe ? 'Du' : (item.username || 'Ukjent')}</span>
                          <span className="text-muted-foreground"> nådde toppen av </span>
                          <span className="font-semibold">{item.peak_name}</span>
                        </p>
                        
                        {/* Peak info chips */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/60 text-[11px] font-medium text-muted-foreground">
                            <Mountain className="w-3 h-3" />
                            {item.peak_elevation} moh
                          </span>
                          {item.peak_area && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary/60 text-[11px] font-medium text-muted-foreground">
                              📍 {item.peak_area}
                            </span>
                          )}
                        </div>

                        {/* Timestamp */}
                        <p className="text-[11px] text-muted-foreground/70 mt-1.5">{timeAgo}</p>
                      </div>

                      {/* Mountain icon badge */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/10 flex items-center justify-center shrink-0">
                        <Mountain className="w-5 h-5 text-emerald-500" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PeakFeed;
