import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { updateCheckinImage, deleteCheckin, checkinPeak } from '@/services/peakCheckinService';
import { getChildProfiles, getSharedChildProfiles, ChildProfile } from '@/services/childProfileService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Mountain, Loader2, RefreshCw, Pencil, Trash2, ImageIcon, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import CheckinImageUpload from '@/components/map/CheckinImageUpload';
import ChildProfileDetailDrawer from '@/components/map/ChildProfileDetailDrawer';
import UserProfileDrawer from '@/components/community/UserProfileDrawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

type FeedFilter = 'mine' | 'friends' | 'global';

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
  image_url: string | null;
  is_child: boolean;
  child_parent_id: string | null;
  child_emoji: string | null;
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
  const [filter, setFilter] = useState<FeedFilter>('all');
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
        .select('id, username, avatar_url, privacy_peak_checkins, privacy_peak_checkins_friends')
        .in('id', [...friendIds, user.id]);

      if (!profiles) { setItems([]); setLoading(false); return; }

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

      const allVisibleIds = [...visibleUserIds, ...Array.from(childIdSet)];
      if (allVisibleIds.length === 0) { setItems([]); setLoading(false); return; }

      let checkins: any[];
      if (filter === 'global') {
        const { data } = await supabase
          .from('peak_checkins')
          .select('*')
          .order('checked_in_at', { ascending: false })
          .limit(50);
        checkins = data || [];
      } else {
        const { data } = await supabase
          .from('peak_checkins')
          .select('*')
          .in('user_id', allVisibleIds)
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
          .select('id, name_no, elevation_moh, area')
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
        // Store for profile detail view
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
        // Also fetch child profiles for global
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
          image_url: c.image_url || null,
          is_child: !!child,
          child_parent_id: child?.parent_user_id || null,
          child_emoji: child?.emoji || null,
        };
      }).filter(item => item.peak_name !== 'Ukjent topp');

      setItems(feedItems);
    } catch (e) {
      console.error('Feed load error:', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && filter === 'global') {
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
        await checkinPeak(childId, parentItem.peak_id, parentItem.checked_in_at);
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

  const filteredItems = items.filter(item => {
    if (filter === 'mine') return item.user_id === user?.id;
    if (filter === 'friends') {
      return item.user_id !== user?.id || myChildIds.has(item.user_id);
    }
    if (filter === 'global') return true;
    return true;
  });

  // Group child checkins with parent posts
  const groupPosts = (items: FeedItem[]): GroupedFeedPost[] => {
    const posts: GroupedFeedPost[] = [];
    const usedIds = new Set<string>();

    for (const item of items) {
      if (usedIds.has(item.id)) continue;
      if (item.is_child) continue; // children get grouped under parents

      // Find child checkins for same peak within 1 hour
      const childItems = items.filter(ci => {
        if (usedIds.has(ci.id)) return false;
        if (!ci.is_child) return false;
        if (ci.peak_id !== item.peak_id) return false;
        if (ci.child_parent_id !== item.user_id) return false;
        const timeDiff = Math.abs(new Date(ci.checked_in_at).getTime() - new Date(item.checked_in_at).getTime());
        return timeDiff <= 60 * 60 * 1000; // 1 hour window
      });

      usedIds.add(item.id);
      // Deduplicate children by user_id (prevent same child appearing twice)
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

    // Add orphan child items (no matching parent post)
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

  const filterOptions: { value: FeedFilter; label: string }[] = [
    { value: 'all', label: 'Alle' },
    { value: 'mine', label: 'Mine' },
    { value: 'friends', label: 'Venner' },
    { value: 'global', label: 'Global' },
  ];

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
      await deleteCheckin(itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
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

  // Get children not already checked in for this peak+time
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

      {/* Child profile detail drawer */}
      <ChildProfileDetailDrawer
        child={selectedChildProfile}
        open={!!selectedChildProfile}
        onClose={() => setSelectedChildProfile(null)}
      />

      {/* Filter + Refresh bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 p-0.5 rounded-lg bg-secondary/50">
          {filterOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={loadFeed}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Oppdater
        </button>
      </div>

      {groupedPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Mountain className="w-8 h-8 text-primary/60" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Ingen innsjekkinger ennå</p>
          <p className="text-xs text-muted-foreground max-w-[240px]">
            {filter === 'mine'
              ? 'Du har ingen innsjekkinger å vise.'
              : filter === 'friends'
                ? 'Vennene dine har ingen synlige innsjekkinger.'
                : filter === 'global'
                  ? 'Ingen globale innsjekkinger ennå.'
                  : 'Når du eller vennene dine sjekker inn på fjelltopper, dukker de opp her!'}
          </p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([dateKey, datePosts]) => (
          <div key={dateKey} className="mb-4">
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">
                {formatGroupDate(dateKey)}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className="space-y-3">
              {datePosts.map(post => {
                const item = post.parentItem;
                const isMe = item.user_id === user?.id;
                const timeAgo = formatDistanceToNow(new Date(item.checked_in_at), { locale: nb, addSuffix: true });
                const isEditing = editingItemId === item.id;
                const editable = canEdit(item);
                const availableChildren = isEditing ? getAvailableChildrenForPost(post) : [];

                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl bg-card border border-border/40 overflow-hidden hover:border-border/80 transition-all duration-200"
                  >
                    <div className="h-0.5 bg-gradient-to-r from-emerald-500/60 via-emerald-400/30 to-transparent" />

                    <div className="p-3.5">
                      <div className="flex items-start gap-3">
                        <Avatar className="w-10 h-10 shrink-0 ring-2 ring-emerald-500/20">
                          <AvatarImage src={item.avatar_url || undefined} />
                          <AvatarFallback className="text-sm font-bold bg-emerald-500/10 text-emerald-600">
                            {item.is_child && item.child_emoji ? item.child_emoji : (item.username?.[0]?.toUpperCase() || '?')}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm leading-snug">
                            <span className="font-semibold">
                              {isMe ? 'Du' : (item.username || 'Ukjent')}
                              {item.is_child && item.child_emoji ? ` ${item.child_emoji}` : ''}
                            </span>
                            <span className="text-muted-foreground"> nådde toppen av </span>
                            <span className="font-semibold">{item.peak_name}</span>
                          </p>

                          {/* Child companions */}
                          {post.childItems.length > 0 && (
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {post.childItems.map(ci => (
                                <button
                                  key={ci.id}
                                  onClick={() => {
                                    const cp = childProfileMap.get(ci.user_id);
                                    if (cp) setSelectedChildProfile(cp);
                                  }}
                                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/8 border border-emerald-500/15 hover:bg-emerald-500/15 transition-colors"
                                >
                                  <Avatar className="w-7 h-7">
                                    {ci.avatar_url ? <AvatarImage src={ci.avatar_url} /> : null}
                                    <AvatarFallback className="text-[10px] bg-emerald-500/10 text-emerald-600">
                                      {ci.child_emoji || '👶'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[11px] text-muted-foreground">
                                    <span className="font-medium text-foreground">{ci.username}</span> var med
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}

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

                          <p className="text-[11px] text-muted-foreground/70 mt-1.5">{timeAgo}</p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {editable && isWithin24h(item) && (
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  setEditingItemId(null);
                                  setPendingImage(null);
                                  setAddChildSelectedIds(new Set());
                                } else {
                                  setEditingItemId(item.id);
                                  setPendingImage(null);
                                  setAddChildSelectedIds(new Set());
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                              title="Rediger innlegg"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {editable && isWithin24h(item) && (
                            <button
                              onClick={() => setDeleteConfirmId(item.id)}
                              className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                              title="Slett innsjekking"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/10 flex items-center justify-center">
                            <Mountain className="w-5 h-5 text-emerald-500" />
                          </div>
                        </div>
                      </div>

                      {/* Check-in image */}
                      {item.image_url && !isEditing && (
                        <div
                          className="mt-3 rounded-xl overflow-hidden border border-border/30 cursor-pointer"
                          onClick={() => setExpandedImage(expandedImage === item.id ? null : item.id)}
                        >
                          <img
                            src={item.image_url}
                            alt={`${item.peak_name} toppbilde`}
                            className={`w-full object-cover transition-all duration-300 ${
                              expandedImage === item.id ? 'max-h-[500px]' : 'max-h-[200px]'
                            }`}
                            loading="lazy"
                          />
                        </div>
                      )}

                      {/* Edit mode */}
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
                          {/* Image upload */}
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Bilde</p>
                            <CheckinImageUpload onImageReady={setPendingImage} />
                            {pendingImage && (
                              <Button
                                onClick={() => handleSaveEditImage(item.id)}
                                disabled={savingImage}
                                size="sm"
                                className="w-full"
                              >
                                {savingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                {savingImage ? 'Lagrer...' : 'Lagre bilde'}
                              </Button>
                            )}
                            {item.image_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-destructive hover:text-destructive"
                                onClick={() => handleRemoveImage(item.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Fjern bilde
                              </Button>
                            )}
                          </div>

                          {/* Add children to checkin */}
                          {!item.is_child && availableChildren.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                Legg til barn i innsjekkingen
                              </p>
                              <div className="space-y-1">
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
                                        {child.avatar_url ? <AvatarImage src={child.avatar_url} /> : null}
                                        <AvatarFallback className="text-[10px]">{child.emoji || '👶'}</AvatarFallback>
                                      </Avatar>
                                      <span className="text-sm">{child.name} {child.emoji}</span>
                                    </button>
                                  );
                                })}
                              </div>
                              {addChildSelectedIds.size > 0 && (
                                <Button
                                  onClick={() => handleAddChildrenToCheckin(item)}
                                  disabled={addingChildren}
                                  size="sm"
                                  className="w-full"
                                >
                                  {addingChildren ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                                  Sjekk inn {addChildSelectedIds.size} barn
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default PeakFeed;
