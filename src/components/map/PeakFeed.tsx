import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Mountain, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
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
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      
      if (!friendships || friendships.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const friendIds = friendships.map(f => 
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      // Get friend profiles with privacy settings
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, privacy_peak_checkins, privacy_peak_checkins_friends')
        .in('id', friendIds);

      if (!profiles) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Filter friends based on privacy settings
      const visibleFriendIds = profiles.filter(p => {
        const privacy = p.privacy_peak_checkins || 'friends';
        if (privacy === 'me') return false;
        if (privacy === 'friends') return true;
        if (privacy === 'selected') {
          const allowed = (p.privacy_peak_checkins_friends as string[]) || [];
          return allowed.includes(user.id);
        }
        return true;
      }).map(p => p.id);

      if (visibleFriendIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Get recent checkins from visible friends
      const { data: checkins } = await supabase
        .from('peak_checkins')
        .select('*')
        .in('user_id', visibleFriendIds)
        .order('checked_in_at', { ascending: false })
        .limit(50);

      if (!checkins || checkins.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      // Get peak info
      const peakIds = [...new Set((checkins as any[]).map((c: any) => c.peak_id))];
      const { data: peaks } = await supabase
        .from('peaks_db')
        .select('id, name_no, elevation_moh, area')
        .in('id', peakIds);

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
        <Mountain className="w-10 h-10 text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">Ingen innsjekkinger fra venner ennå.</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Legg til venner for å se deres turer!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {items.map(item => (
        <div key={item.id} className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border/50">
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage src={item.avatar_url || undefined} />
            <AvatarFallback>{item.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-semibold">{item.username || 'Ukjent'}</span>
              <span className="text-muted-foreground"> sjekket inn på </span>
              <span className="font-semibold">{item.peak_name}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.peak_elevation} moh {item.peak_area && `· ${item.peak_area}`} · {format(new Date(item.checked_in_at), "d. MMM yyyy", { locale: nb })}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center shrink-0">
            <Mountain className="w-4 h-4 text-success" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default PeakFeed;
