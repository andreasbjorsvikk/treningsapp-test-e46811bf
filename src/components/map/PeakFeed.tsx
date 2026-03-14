import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { updateCheckinImage, deleteCheckin } from '@/services/peakCheckinService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Mountain, Loader2, RefreshCw, Pencil, Trash2, ImageIcon } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';
import CheckinImageUpload from '@/components/map/CheckinImageUpload';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type FeedFilter = 'all' | 'mine' | 'friends' | 'global';

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

const PeakFeed = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [savingImage, setSavingImage] = useState(false);
  const [myChildIds, setMyChildIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadFeed();
  }, [user]);

  const loadFeed = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load user's own children (owned + shared)
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

      // Load friends
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

      const friendIds = (friendships || []).map(f =>
        f.user_id === user.id ? f.friend_id : f.user_id
      );

      const allUserIds = [...friendIds, user.id, ...Array.from(childIdSet)];

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

      // Include children in visible user IDs
      const allVisibleIds = [...visibleUserIds, ...Array.from(childIdSet)];

      if (allVisibleIds.length === 0) { setItems([]); setLoading(false); return; }

      // For "global" filter, fetch all checkins (no user filter)
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

      // Fetch child profiles for user_ids not in profiles
      const allCheckinUserIds = [...new Set(checkins.map((c: any) => c.user_id))];
      const missingUserIds = allCheckinUserIds.filter(id => !profileMap.has(id));
      let childMap = new Map<string, any>();

      // Also include our known children
      const childIdsToFetch = [...new Set([...missingUserIds, ...Array.from(childIdSet)])];
      if (childIdsToFetch.length > 0) {
        const { data: childProfiles } = await supabase
          .from('child_profiles')
          .select('id, name, avatar_url, parent_user_id, emoji')
          .in('id', childIdsToFetch);
        childMap = new Map(((childProfiles || []) as any[]).map(c => [c.id, c]));
      }

      // For global filter, fetch profiles for all checkin users we don't have yet
      if (filter === 'global') {
        const unknownUserIds = allCheckinUserIds.filter(id => !profileMap.has(id) && !childMap.has(id));
        if (unknownUserIds.length > 0) {
          const { data: extraProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', unknownUserIds);
          (extraProfiles || []).forEach(p => profileMap.set(p.id, p as any));
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

  // Reload when filter changes to 'global' (needs different query)
  useEffect(() => {
    if (user && filter === 'global') {
      loadFeed();
    }
  }, [filter]);

  const handleSaveEditImage = async (itemId: string, targetUserId: string) => {
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

  const filteredItems = items.filter(item => {
    if (filter === 'mine') return item.user_id === user?.id;
    if (filter === 'friends') {
      // Friends + my children
      return item.user_id !== user?.id || myChildIds.has(item.user_id);
    }
    if (filter === 'global') return true;
    return true; // 'all' = me + friends + children
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const grouped = new Map<string, FeedItem[]>();
  for (const item of filteredItems) {
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

  const filterOptions: { value: FeedFilter; label: string }[] = [
    { value: 'all', label: 'Alle' },
    { value: 'mine', label: 'Mine' },
    { value: 'friends', label: 'Venner' },
    { value: 'global', label: 'Global' },
  ];

  // Can edit own posts AND own children's posts
  const canEdit = (item: FeedItem) => {
    if (item.user_id === user?.id) return true;
    if (item.is_child && myChildIds.has(item.user_id)) return true;
    return false;
  };

  return (
    <div className="flex flex-col gap-1 p-4">
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

      {filteredItems.length === 0 ? (
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
        Array.from(grouped.entries()).map(([dateKey, dateItems]) => (
          <div key={dateKey} className="mb-4">
            <div className="flex items-center gap-3 mb-2.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider capitalize">
                {formatGroupDate(dateKey)}
              </span>
              <div className="flex-1 h-px bg-border/50" />
            </div>

            <div className="space-y-3">
              {dateItems.map(item => {
                const isMe = item.user_id === user?.id;
                const isMyChild = item.is_child && myChildIds.has(item.user_id);
                const timeAgo = formatDistanceToNow(new Date(item.checked_in_at), { locale: nb, addSuffix: true });
                const isEditing = editingItemId === item.id;
                const editable = canEdit(item);

                return (
                  <div
                    key={item.id}
                    className="group relative rounded-2xl bg-card border border-border/40 overflow-hidden hover:border-border/80 transition-all duration-200"
                  >
                    {/* Top accent bar */}
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
                          {/* Edit button for own posts and own children's posts */}
                          {editable && (
                            <button
                              onClick={() => {
                                if (isEditing) {
                                  setEditingItemId(null);
                                  setPendingImage(null);
                                } else {
                                  setEditingItemId(item.id);
                                  setPendingImage(null);
                                }
                              }}
                              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                              title="Rediger innlegg"
                            >
                              <Pencil className="w-4 h-4" />
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

                      {/* Edit mode: image upload */}
                      {isEditing && (
                        <div className="mt-3 pt-3 border-t border-border/30">
                          <CheckinImageUpload onImageReady={setPendingImage} />
                          {pendingImage && (
                            <Button
                              onClick={() => handleSaveEditImage(item.id, item.user_id)}
                              disabled={savingImage}
                              size="sm"
                              className="w-full mt-2"
                            >
                              {savingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                              {savingImage ? 'Lagrer...' : 'Lagre bilde'}
                            </Button>
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
