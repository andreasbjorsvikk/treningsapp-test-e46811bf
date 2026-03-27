import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { updateCheckinImage, deleteCheckin, checkinPeak } from '@/services/peakCheckinService';
import { getChildProfiles, getSharedChildProfiles, ChildProfile } from '@/services/childProfileService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, RefreshCw, Pencil, Trash2, ImageIcon, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import CheckinImageUpload from '@/components/map/CheckinImageUpload';
import ChildProfileDetailDrawer from '@/components/map/ChildProfileDetailDrawer';
import UserProfileDrawer from '@/components/community/UserProfileDrawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { getPeakIcon } from '@/utils/peakIcons';


const WEATHER_ICON_BASE = 'https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/';

const mapWmoToSymbol = (code: number): string => {
  if (code === 0) return 'clearsky_day';
  if ([1, 2].includes(code)) return 'fair_day';
  if (code === 3) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'lightrain';
  if ([61, 63, 65, 66, 67].includes(code)) return 'rain';
  if ([71, 73, 75, 77].includes(code)) return 'snow';
  if ([80, 81, 82].includes(code)) return 'rainshowers_day';
  if ([85, 86].includes(code)) return 'snowshowers_day';
  if ([95, 96, 99].includes(code)) return 'heavyrainandthunder';
  return 'cloudy';
};

// Small weather badge for feed posts
const FeedWeatherBadge = ({ lat, lng, checkinDate }: { lat: number; lng: number; checkinDate: string }) => {
  const [weather, setWeather] = useState<{ temp: number; symbol: string } | null>(null);

  useEffect(() => {
    if (!lat || !lng) return;
    let cancelled = false;
    const d = new Date(checkinDate);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const hour = d.getHours();
    const isToday = dateStr === new Date().toISOString().slice(0, 10);
    const isFuture = new Date(dateStr) > new Date();

    const fetchWeather = async () => {
      try {
        let url: string;
        if (isToday || isFuture) {
          url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&hourly=temperature_2m,weather_code&forecast_days=1`;
        } else {
          url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&start_date=${dateStr}&end_date=${dateStr}&hourly=temperature_2m,weather_code`;
        }
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        const hourIdx = Math.min(hour, (data.hourly?.time?.length || 1) - 1);
        const temp = Math.round(data.hourly?.temperature_2m?.[hourIdx] ?? 0);
        const code = data.hourly?.weather_code?.[hourIdx] ?? 3;
        if (!cancelled) setWeather({ temp, symbol: mapWmoToSymbol(code) });
      } catch {}
    };

    fetchWeather();
    return () => { cancelled = true; };
  }, [lat, lng, checkinDate]);

  if (!weather) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 border border-border/30">
      <img
        src={`${WEATHER_ICON_BASE}${weather.symbol}.svg`}
        alt=""
        className="w-4 h-4"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <span className="text-[11px] text-muted-foreground font-medium">{weather.temp}°</span>
    </div>
  );
};

type FeedFilter = 'alle' | 'friends' | 'mine' | 'global';

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
  peak_lat: number;
  peak_lng: number;
  image_url: string | null;
  is_child: boolean;
  child_parent_id: string | null;
  child_emoji: string | null;
  checked_in_by: string | null;
}

// Group key: parent_user_id + peak_id + date (within 1hr window)
interface GroupedFeedPost {
  parentItem: FeedItem;
  childItems: FeedItem[];
}

const PeakFeed = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<{ id: string; username: string | null; avatar_url: string | null } | null>(null);
  const [filter, setFilter] = useState<FeedFilter>('alle');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [myChildIds, setMyChildIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Add child to existing checkin
  const [myChildren, setMyChildren] = useState<ChildProfile[]>([]);
  const [addChildSelectedIds, setAddChildSelectedIds] = useState<Set<string>>(new Set());
  const [addingChildren, setAddingChildren] = useState(false);

  // Child profile detail
  const [selectedChildProfile, setSelectedChildProfile] = useState<ChildProfile | null>(null);
  const [childProfileMap, setChildProfileMap] = useState<Map<string, ChildProfile>>(new Map());

  useEffect(() => {
    if (!user) return;
    loadFeed();
    loadMyChildren();
  }, [user]);

  const loadMyChildren = async () => {
    if (!user) return;
    try {
      const [owned, shared] = await Promise.all([
        getChildProfiles(user.id),
        getSharedChildProfiles(user.id),
      ]);
      setMyChildren([...owned, ...shared]);
    } catch {}
  };

  const loadFeed = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: ownChildren } = await supabase
        .from('child_profiles')
        .select('id, name, avatar_url, parent_user_id, emoji')
        .eq('parent_user_id', user.id);

      const { data: sharedAccess } = await supabase
        .from('child_shared_access')
        .select('child_id')
        .eq('shared_with_user_id', user.id)
        .eq('status', 'accepted');

      const sharedChildIds = (sharedAccess || []).map((s: any) => s.child_id);
      let sharedChildren: any[] = [];
      if (sharedChildIds.length > 0) {
        const { data } = await supabase
          .from('child_profiles')
          .select('id, name, avatar_url, parent_user_id, emoji')
          .in('id', sharedChildIds);
        sharedChildren = data || [];
      }

      const allMyChildren = [...(ownChildren || []), ...sharedChildren];
      const childIdSet = new Set(allMyChildren.map(c => c.id));
      setMyChildIds(childIdSet);

      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = (friendships || []).map(f =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, privacy_peak_checkins, privacy_peak_checkins_friends, privacy_child_checkins')
        .in('id', [...friendIds, user.id]);

      if (!profiles) { setItems([]); setLoading(false); return; }

      const visibleFriendIds = profiles.filter(p => {
        if (p.id === user.id) return true;
        const privacy = p.privacy_peak_checkins || 'friends';
        if (privacy === 'me') return false;
        if (privacy === 'friends' || privacy === 'all') return true;
        if (privacy === 'selected') {
          const allowed = (p.privacy_peak_checkins_friends as string[]) || [];
          return allowed.includes(user.id);
        }
        return true;
      }).map(p => p.id);

      const visibleChildParentIds = profiles
        .filter((p) => {
          if (p.id === user.id) return true;
          const childPrivacy = (p as any).privacy_child_checkins || 'friends';
          if (childPrivacy === 'me') return false;
          if (childPrivacy === 'all') return true;
          return friendIds.includes(p.id);
        })
        .map((p) => p.id);

      const { data: visibleChildren } = visibleChildParentIds.length > 0
        ? await supabase
            .from('child_profiles')
            .select('id, parent_user_id')
            .in('parent_user_id', visibleChildParentIds)
        : { data: [] as { id: string; parent_user_id: string }[] };

      const friendChildIds = (visibleChildren || [])
        .filter((c) => c.parent_user_id !== user.id)
        .map((c) => c.id);

      const ownAndSharedChildIds = Array.from(childIdSet);
      const friendChildIdSet = new Set(friendChildIds.filter((id) => !childIdSet.has(id)));

      // Determine which user IDs to fetch based on filter
      let fetchUserIds: string[];
      if (filter === 'global') {
        // Global: fetch all (no user_id filter)
        fetchUserIds = [];
      } else if (filter === 'mine') {
        // Mine: own + own/shared children
        fetchUserIds = [user.id, ...ownAndSharedChildIds];
      } else if (filter === 'friends') {
        // Venner: friends + their children
        fetchUserIds = [...visibleFriendIds.filter(id => id !== user.id), ...Array.from(friendChildIdSet)];
      } else {
        // Alle: own + friends + own/shared children + friends' children
        fetchUserIds = [...visibleFriendIds, ...ownAndSharedChildIds, ...Array.from(friendChildIdSet)];
      }

      let checkins: any[];
      if (filter === 'global') {
        const { data } = await supabase
          .from('peak_checkins')
          .select('*')
          .order('checked_in_at', { ascending: false })
          .limit(50);
        checkins = data || [];
      } else {
        if (fetchUserIds.length === 0) { setItems([]); setLoading(false); return; }
        const { data } = await supabase
          .from('peak_checkins')
          .select('*')
          .in('user_id', fetchUserIds)
          .order('checked_in_at', { ascending: false })
          .limit(50);
        checkins = data || [];
      }

      if (checkins.length === 0) { setItems([]); setLoading(false); return; }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const allPeakIds = [...new Set(checkins.map((c: any) => c.peak_id))];
      const validUuidPeakIds = allPeakIds.filter(id => uuidRegex.test(id));

      let peaks: any[] = [];
      if (validUuidPeakIds.length > 0) {
        const { data } = await supabase
          .from('peaks_db')
          .select('id, name_no, elevation_moh, area, latitude, longitude')
          .in('id', validUuidPeakIds);
        peaks = data || [];
      }

      const peakMap = new Map(peaks.map((p: any) => [p.id, p]));
      const profileMap = new Map(profiles.map(p => [p.id, p]));

      const allCheckinUserIds = [...new Set(checkins.map((c: any) => c.user_id))];
      const missingUserIds = allCheckinUserIds.filter(id => !profileMap.has(id));
      let childMap = new Map<string, any>();

      const childIdsToFetch = [...new Set([...missingUserIds, ...Array.from(childIdSet)])];
      if (childIdsToFetch.length > 0) {
        const { data: childProfiles } = await supabase
          .from('child_profiles')
          .select('id, name, avatar_url, parent_user_id, emoji')
          .in('id', childIdsToFetch);
        childMap = new Map(((childProfiles || []) as any[]).map(c => [c.id, c]));
        const cpMap = new Map<string, ChildProfile>();
        for (const cp of (childProfiles || [])) {
          cpMap.set(cp.id, cp as unknown as ChildProfile);
        }
        setChildProfileMap(cpMap);
      }

      if (filter === 'global') {
        const unknownUserIds = allCheckinUserIds.filter(id => !profileMap.has(id) && !childMap.has(id));
        if (unknownUserIds.length > 0) {
          const { data: extraProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', unknownUserIds);
          (extraProfiles || []).forEach(p => profileMap.set(p.id, p as any));
        }
        const unknownChildIds = allCheckinUserIds.filter(id => !profileMap.has(id) && !childMap.has(id));
        if (unknownChildIds.length > 0) {
          const { data: extraChildren } = await supabase
            .from('child_profiles')
            .select('id, name, avatar_url, parent_user_id, emoji')
            .in('id', unknownChildIds);
          for (const c of (extraChildren || [])) {
            childMap.set(c.id, c);
          }
        }
      }

      const feedItems: FeedItem[] = checkins.map((c: any) => {
        const peak = peakMap.get(c.peak_id);
        const profile = profileMap.get(c.user_id);
        const child = childMap.get(c.user_id);
        return {
          id: c.id,
          user_id: c.user_id,
          peak_id: c.peak_id,
          checked_in_at: c.checked_in_at,
          username: profile?.username || child?.name || null,
          avatar_url: profile?.avatar_url || child?.avatar_url || null,
          peak_name: peak?.name_no || 'Ukjent topp',
          peak_elevation: peak?.elevation_moh || 0,
          peak_area: peak?.area || '',
          peak_lat: peak?.latitude || 0,
          peak_lng: peak?.longitude || 0,
          image_url: c.image_url || null,
          is_child: !!child,
          child_parent_id: child?.parent_user_id || null,
          child_emoji: child?.emoji || null,
          checked_in_by: c.checked_in_by || null,
        };
      }).filter(item => item.peak_name !== 'Ukjent topp');

      setItems(feedItems);
    } catch (e) {
      console.error('Feed load error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadFeed();
    }
  }, [filter]);

  const handleSaveEditImage = async (itemId: string) => {
    if (!user || !pendingImage) return;
    setSavingImage(true);
    try {
      const newUrl = await updateCheckinImage(itemId, user.id, pendingImage);
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, image_url: newUrl } : item
      ));
      setEditingItemId(null);
      setPendingImage(null);
      toast.success('Bilde lagret!');
    } catch {
      toast.error('Kunne ikke lagre bildet.');
    }
    setSavingImage(false);
  };

  const handleAddChildrenToCheckin = async (parentItem: FeedItem) => {
    if (addChildSelectedIds.size === 0) return;
    setAddingChildren(true);
    try {
      for (const childId of addChildSelectedIds) {
        await checkinPeak(childId, parentItem.peak_id, parentItem.checked_in_at, null, user?.id);
      }
      toast.success(`${addChildSelectedIds.size} barn lagt til i innsjekkingen!`);
      setAddChildSelectedIds(new Set());
      setEditingItemId(null);
      loadFeed();
    } catch {
      toast.error('Kunne ikke legge til barn.');
    }
    setAddingChildren(false);
  };

  // No client-side filtering needed - the query already handles it
  const filteredItems = items;

  // Group child checkins with parent posts
  const groupPosts = (items: FeedItem[]): GroupedFeedPost[] => {
    const posts: GroupedFeedPost[] = [];
    const usedIds = new Set<string>();

    for (const item of items) {
      if (usedIds.has(item.id)) continue;
      if (item.is_child) continue;

      const childItems = items.filter(ci => {
        if (usedIds.has(ci.id)) return false;
        if (!ci.is_child) return false;
        if (ci.peak_id !== item.peak_id) return false;
        // Use checked_in_by if available, otherwise fall back to child_parent_id
        const checkedInByUser = ci.checked_in_by || ci.child_parent_id;
        if (checkedInByUser !== item.user_id) return false;
        const timeDiff = Math.abs(new Date(ci.checked_in_at).getTime() - new Date(item.checked_in_at).getTime());
        return timeDiff <= 60 * 60 * 1000;
      });

      usedIds.add(item.id);
      const seenChildUserIds = new Set<string>();
      const dedupedChildren: FeedItem[] = [];
      for (const ci of childItems) {
        if (!seenChildUserIds.has(ci.user_id)) {
          seenChildUserIds.add(ci.user_id);
          dedupedChildren.push(ci);
        }
        usedIds.add(ci.id);
      }
      posts.push({ parentItem: item, childItems: dedupedChildren });
    }

    for (const item of items) {
      if (usedIds.has(item.id)) continue;
      usedIds.add(item.id);
      posts.push({ parentItem: item, childItems: [] });
    }

    return posts;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grouped = new Map<string, GroupedFeedPost[]>();
  const groupedPosts = groupPosts(filteredItems);
  for (const post of groupedPosts) {
    const dateKey = format(new Date(post.parentItem.checked_in_at), 'yyyy-MM-dd');
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(post);
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

  const canEdit = (item: FeedItem) => {
    if (item.user_id === user?.id) return true;
    if (item.is_child && myChildIds.has(item.user_id)) return true;
    return false;
  };

  const isWithin24h = (item: FeedItem) => {
    return Date.now() - new Date(item.checked_in_at).getTime() <= 24 * 60 * 60 * 1000;
  };

  const handleDeleteCheckin = async (itemId: string) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (item && !item.is_child) {
        const childCheckins = items.filter(ci =>
          ci.is_child &&
          ci.peak_id === item.peak_id &&
          ci.child_parent_id === item.user_id &&
          Math.abs(new Date(ci.checked_in_at).getTime() - new Date(item.checked_in_at).getTime()) <= 60 * 60 * 1000
        );
        for (const ci of childCheckins) {
          await deleteCheckin(ci.id);
        }
      }
      await deleteCheckin(itemId);
      loadFeed();
      toast.success('Innsjekking slettet');
    } catch { toast.error('Kunne ikke slette innsjekking'); }
    setDeleteConfirmId(null);
  };

  const handleRemoveImage = async (itemId: string) => {
    try {
      await supabase.from('peak_checkins').update({ image_url: null }).eq('id', itemId);
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, image_url: null } : i));
      setEditingItemId(null);
      toast.success('Bilde fjernet');
    } catch { toast.error('Kunne ikke fjerne bildet'); }
  };

  const getAvailableChildrenForPost = (post: GroupedFeedPost) => {
    const checkedChildIds = new Set(post.childItems.map(ci => ci.user_id));
    return myChildren.filter(c => !checkedChildIds.has(c.id));
  };

  return (
    <div className="flex flex-col gap-1 p-4">
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett innsjekking</AlertDialogTitle>
            <AlertDialogDescription>Er du sikker på at du vil slette denne innsjekkingen? Dette kan ikke angres.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteConfirmId && handleDeleteCheckin(deleteConfirmId)}>Slett</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChildProfileDetailDrawer
        child={selectedChildProfile}
        open={!!selectedChildProfile}
        onClose={() => setSelectedChildProfile(null)}
      />

      {/* Filter bar: Alle/Venner/Mine grouped + Global separate */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/50">
            {(['alle', 'friends', 'mine'] as FeedFilter[]).map(opt => (
              <button
                key={opt}
                onClick={() => setFilter(opt)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filter === opt
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt === 'alle' ? 'Alle' : opt === 'friends' ? 'Venner' : 'Mine'}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/50">
            <button
              onClick={() => setFilter('global')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === 'global'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Global
            </button>
          </div>
        </div>
        <button
          onClick={loadFeed}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Feed content */}
      {groupedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <img src={getPeakIcon(500)} alt="" className="w-10 h-10 object-contain opacity-50 mb-3" />
          <p className="text-sm text-muted-foreground">Ingen innsjekkinger å vise.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {Array.from(grouped.entries()).map(([dateKey, posts]) => (
            <div key={dateKey}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 capitalize">
                {formatGroupDate(dateKey)}
              </p>
              <div className="flex flex-col gap-2">
                {posts.map(({ parentItem, childItems }) => {
                  const isEditing = editingItemId === parentItem.id;
                  const availableChildren = getAvailableChildrenForPost({ parentItem, childItems });
                  return (
                    <div key={parentItem.id} className="rounded-xl bg-card border border-border/50 p-3 space-y-2">
                      {/* Header row */}
                      <div className="flex items-center gap-3">
                        <button onClick={() => {
                          if (!parentItem.is_child) {
                            setSelectedProfile({ id: parentItem.user_id, username: parentItem.username, avatar_url: parentItem.avatar_url });
                          } else {
                            const cp = childProfileMap.get(parentItem.user_id);
                            if (cp) setSelectedChildProfile(cp);
                          }
                        }}>
                          <Avatar className="w-9 h-9">
                            <AvatarImage src={parentItem.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{parentItem.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1 min-w-0">
                          <button
                            className="text-sm font-semibold truncate block text-left"
                            onClick={() => {
                              if (!parentItem.is_child) {
                                setSelectedProfile({ id: parentItem.user_id, username: parentItem.username, avatar_url: parentItem.avatar_url });
                              } else {
                                const cp = childProfileMap.get(parentItem.user_id);
                                if (cp) setSelectedChildProfile(cp);
                              }
                            }}
                          >
                            {parentItem.username || 'Ukjent'}
                          </button>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(parentItem.checked_in_at), { addSuffix: true, locale: nb })}
                          </p>
                        </div>
                        {canEdit(parentItem) && isWithin24h(parentItem) && (
                          <button
                            onClick={() => {
                              if (isEditing) {
                                setEditingItemId(null);
                                setPendingImage(null);
                                setAddChildSelectedIds(new Set());
                              } else {
                                setEditingItemId(parentItem.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Children in check-in (shown above peak name) */}
                      {childItems.length > 0 && (
                        <div className="pt-1 space-y-1 ml-2">
                          {childItems.map(ci => (
                            <div key={ci.id} className="flex items-center gap-2 px-1">
                              <button onClick={() => {
                                const cp = childProfileMap.get(ci.user_id);
                                if (cp) setSelectedChildProfile(cp);
                              }}>
                                <Avatar className="w-7 h-7">
                                  <AvatarImage src={ci.avatar_url || undefined} />
                                  <AvatarFallback className="text-[10px]">{ci.child_emoji || '👶'}</AvatarFallback>
                                </Avatar>
                              </button>
                              <span className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{ci.username}</span> var med
                              </span>
                              {/* Remove child button in edit mode */}
                              {isEditing && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await deleteCheckin(ci.id);
                                      toast.success(`${ci.username} fjernet fra innsjekkingen`);
                                      loadFeed();
                                    } catch { toast.error('Kunne ikke fjerne barn'); }
                                  }}
                                  className="ml-auto p-1 rounded hover:bg-destructive/10 text-destructive"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Peak info */}
                      <div className="flex items-center gap-2 px-1">
                        <img src={getPeakIcon(parentItem.peak_elevation)} alt="" className="w-5 h-5 object-contain shrink-0 self-center" style={{ verticalAlign: 'middle', position: 'relative', top: parentItem.peak_elevation >= 300 && parentItem.peak_elevation < 650 ? '-0.5px' : '0px' }} />
                        <span className="text-sm font-medium leading-5">{parentItem.peak_name}</span>
                        <span className="text-xs text-muted-foreground leading-5">{parentItem.peak_elevation} moh · {parentItem.peak_area}</span>
                        <div className="ml-auto">
                          <FeedWeatherBadge lat={parentItem.peak_lat} lng={parentItem.peak_lng} checkinDate={parentItem.checked_in_at} />
                        </div>
                      </div>

                      {/* Image */}
                      {parentItem.image_url && (
                        <button onClick={() => setExpandedImage(parentItem.image_url)} className="w-full">
                          <img src={parentItem.image_url} alt="" className="w-full h-40 object-cover rounded-lg" />
                        </button>
                      )}

                      {/* Edit mode */}
                      {isEditing && (
                        <div className="pt-2 border-t border-border/30 space-y-3">
                          {/* Image editing */}
                          <div className="space-y-2">
                            {parentItem.image_url ? (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleRemoveImage(parentItem.id)}>
                                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />Fjern bilde
                                </Button>
                              </div>
                            ) : null}
                            <CheckinImageUpload onImageReady={setPendingImage} />
                            {pendingImage && (
                              <Button onClick={() => handleSaveEditImage(parentItem.id)} disabled={savingImage} size="sm" className="w-full">
                                {savingImage ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <ImageIcon className="w-4 h-4 mr-1.5" />}
                                {savingImage ? 'Lagrer...' : parentItem.image_url ? 'Bytt bilde' : 'Lagre bilde'}
                              </Button>
                            )}
                          </div>

                          {/* Add children */}
                          {myChildren.length > 0 && availableChildren.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">Legg til barn</p>
                              {availableChildren.map(child => {
                                const isSelected = addChildSelectedIds.has(child.id);
                                return (
                                  <button
                                    key={child.id}
                                    onClick={() => {
                                      setAddChildSelectedIds(prev => {
                                        const next = new Set(prev);
                                        if (next.has(child.id)) next.delete(child.id);
                                        else next.add(child.id);
                                        return next;
                                      });
                                    }}
                                    className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                                      isSelected ? 'bg-primary/5 border-primary/30' : 'border-border/50 hover:border-border'
                                    }`}
                                  >
                                    <Checkbox checked={isSelected} className="pointer-events-none" />
                                    <Avatar className="w-6 h-6">
                                      {child.avatar_url && <AvatarImage src={child.avatar_url} />}
                                      <AvatarFallback className="text-[10px]">{child.emoji || '👶'}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{child.name} {child.emoji}</span>
                                  </button>
                                );
                              })}
                              {addChildSelectedIds.size > 0 && (
                                <Button
                                  onClick={() => handleAddChildrenToCheckin(parentItem)}
                                  disabled={addingChildren}
                                  size="sm"
                                  className="w-full"
                                >
                                  {addingChildren ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Users className="w-4 h-4 mr-1.5" />}
                                  Legg til {addChildSelectedIds.size} barn
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Delete */}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(parentItem.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                            Slett innsjekking
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expanded image overlay */}
      {expandedImage && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4" onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
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

export default PeakFeed;
