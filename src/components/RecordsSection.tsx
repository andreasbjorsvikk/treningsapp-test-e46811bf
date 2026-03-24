import { useState, useMemo, useEffect, useCallback } from 'react';
import { WorkoutSession } from '@/types/workout';
import { useAppDataContext } from '@/contexts/AppDataContext';
import { formatDuration } from '@/utils/workoutUtils';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, ChevronRight, Plus, Trash2, Mountain, Pencil, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import DurationPicker from '@/components/DurationPicker';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

// Running distance benchmarks
const RUNNING_BENCHMARKS = [
  { label: '1 km', distance: 1 },
  { label: '3 km', distance: 3 },
  { label: '5 km', distance: 5 },
  { label: '10 km', distance: 10 },
  { label: '21,1 km', distance: 21.1 },
  { label: '42,2 km', distance: 42.2 },
];

const CYCLING_BENCHMARKS = [
  { label: '10 km', distance: 10 },
  { label: '25 km', distance: 25 },
  { label: '50 km', distance: 50 },
  { label: '100 km', distance: 100 },
  { label: '160 km', distance: 160 },
];

function formatRecordTime(totalMinutes: number): string {
  const totalSeconds = Math.round(totalMinutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface BestTimeResult {
  time: string;
  date: string;
  sessionTitle?: string;
  sessionId?: string;
}

function estimateBestTime(sessions: WorkoutSession[], benchmarkKm: number): BestTimeResult | null {
  const qualifying = sessions.filter(s => s.distance && s.distance >= benchmarkKm);
  if (qualifying.length === 0) return null;

  let bestMinutes = Infinity;
  let bestSession: WorkoutSession | null = null;
  for (const s of qualifying) {
    if (!s.distance || s.distance <= 0) continue;
    const paceMinPerKm = s.durationMinutes / s.distance;
    const estimatedMin = paceMinPerKm * benchmarkKm;
    if (estimatedMin < bestMinutes) {
      bestMinutes = estimatedMin;
      bestSession = s;
    }
  }

  if (bestMinutes === Infinity || !bestSession) return null;
  return {
    time: formatRecordTime(bestMinutes),
    date: bestSession.date,
    sessionTitle: bestSession.title || undefined,
    sessionId: bestSession.id,
  };
}

// Hiking record types
export interface HikingRecord {
  id: string;
  name: string;
  elevation?: number;
  distance?: number;
  elevationGain?: number;
  routeDescription?: string;
  entries: HikingEntry[];
}

export interface HikingEntry {
  id: string;
  time: string;
  date: string;
  avgHeartrate?: number;
  maxHeartrate?: number;
}

interface SharedEntry {
  id: string;
  hiking_record_id: string;
  user_id: string;
  time: string;
  date: string;
  avg_heartrate?: number | null;
  max_heartrate?: number | null;
}

interface ShareInfo {
  id: string;
  shared_with_user_id: string;
  status: string;
  username?: string;
  avatar_url?: string;
}

type RecordTab = 'running' | 'cycling' | 'hiking';

const RecordsSection = () => {
  const appData = useAppDataContext();
  const { user } = useAuth();
  const { t, locale, language } = useTranslation();
  const [tab, setTab] = useState<RecordTab>('running');
  const [selectedHike, setSelectedHike] = useState<HikingRecord | null>(null);
  const [showAddHike, setShowAddHike] = useState(false);
  const [showEditHike, setShowEditHike] = useState(false);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [newHikeName, setNewHikeName] = useState('');
  const [newHikeElevation, setNewHikeElevation] = useState('');
  const [newHikeDistance, setNewHikeDistance] = useState('');
  const [newHikeElevationGain, setNewHikeElevationGain] = useState('');
  const [newHikeRouteDesc, setNewHikeRouteDesc] = useState('');
  const [newEntryHours, setNewEntryHours] = useState(0);
  const [newEntryMinutes, setNewEntryMinutes] = useState(0);
  const [newEntrySeconds, setNewEntrySeconds] = useState(0);
  const [newEntryAvgHr, setNewEntryAvgHr] = useState('');
  const [newEntryMaxHr, setNewEntryMaxHr] = useState('');
  const [newEntryDate, setNewEntryDate] = useState(new Date().toISOString().slice(0, 10));

  const [hikingRecords, setHikingRecords] = useState<HikingRecord[]>([]);

  // Sharing state
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [friends, setFriends] = useState<{ id: string; username: string; avatar_url?: string }[]>([]);
  const [shares, setShares] = useState<ShareInfo[]>([]);
  const [sharedEntries, setSharedEntries] = useState<SharedEntry[]>([]);
  const [viewMode, setViewMode] = useState<'mine' | 'all'>('mine');
  const [profileCache, setProfileCache] = useState<Map<string, { username: string; avatar_url?: string }>>(new Map());
  const [showRemoveFriendConfirm, setShowRemoveFriendConfirm] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<HikingEntry | SharedEntry | null>(null);
  const [showEditEntry, setShowEditEntry] = useState(false);

  // Load hiking records from DB (or localStorage fallback)
  const loadHikingRecords = useCallback(async () => {
    if (user) {
      try {
        const { data, error } = await supabase
          .from('hiking_records')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });
        if (!error && data) {
          const records: HikingRecord[] = data.map((r: any) => ({
            id: r.id,
            name: r.name,
            elevation: r.elevation || undefined,
            distance: r.distance || undefined,
            elevationGain: r.elevation_gain || undefined,
            routeDescription: r.route_description || undefined,
            entries: (r.entries as HikingEntry[]) || [],
          }));
          setHikingRecords(records);
          return;
        }
      } catch {}
    }
    try {
      const stored = localStorage.getItem('treningslogg_hiking_records');
      setHikingRecords(stored ? JSON.parse(stored) : []);
    } catch { setHikingRecords([]); }
  }, [user]);

  useEffect(() => { loadHikingRecords(); }, [loadHikingRecords]);

  // Migrate localStorage hiking records to DB on first load
  useEffect(() => {
    if (!user) return;
    const migratedKey = 'treningslogg_hiking_records_migrated';
    if (localStorage.getItem(migratedKey)) return;
    const stored = localStorage.getItem('treningslogg_hiking_records');
    if (!stored) { localStorage.setItem(migratedKey, 'true'); return; }
    try {
      const local: HikingRecord[] = JSON.parse(stored);
      if (local.length === 0) { localStorage.setItem(migratedKey, 'true'); return; }
      (async () => {
        for (const r of local) {
          await supabase.from('hiking_records').insert({
            user_id: user.id,
            name: r.name,
            elevation: r.elevation || null,
            distance: r.distance || null,
            elevation_gain: r.elevationGain || null,
            entries: r.entries || [],
          } as any);
        }
        localStorage.setItem(migratedKey, 'true');
        loadHikingRecords();
      })();
    } catch { localStorage.setItem(migratedKey, 'true'); }
  }, [user, loadHikingRecords]);

  const saveHikingRecords = async (records: HikingRecord[]) => {
    setHikingRecords(records);
    if (!user) {
      localStorage.setItem('treningslogg_hiking_records', JSON.stringify(records));
    }
  };

  // Keep selectedHike in sync with hikingRecords after DB reload
  useEffect(() => {
    if (selectedHike) {
      const updated = hikingRecords.find(h => h.id === selectedHike.id);
      if (updated) setSelectedHike(updated);
    }
  }, [hikingRecords]);

  // Load shares and shared entries when a hike is selected
  const loadShares = useCallback(async (hikeId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('hiking_record_shares')
      .select('id, shared_with_user_id, status')
      .eq('hiking_record_id', hikeId) as any;
    
    if (data && data.length > 0) {
      const userIds = data.map((s: any) => s.shared_with_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const enriched: ShareInfo[] = data.map((s: any) => ({
        ...s,
        username: profileMap.get(s.shared_with_user_id)?.username || 'Ukjent',
        avatar_url: profileMap.get(s.shared_with_user_id)?.avatar_url,
      }));
      setShares(enriched);
    } else {
      setShares([]);
    }
  }, [user]);

  const loadSharedEntries = useCallback(async (hikeId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('shared_hiking_entries')
      .select('*')
      .eq('hiking_record_id', hikeId) as any;
    
    if (data) {
      // Load profiles for entry users
      const userIds = [...new Set((data as SharedEntry[]).map(e => e.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIds);
        if (profiles) {
          const newCache = new Map(profileCache);
          profiles.forEach((p: any) => newCache.set(p.id, { username: p.username || 'Ukjent', avatar_url: p.avatar_url }));
          setProfileCache(newCache);
        }
      }
      setSharedEntries(data);
    } else {
      setSharedEntries([]);
    }
  }, [user]);

  useEffect(() => {
    if (selectedHike && user) {
      loadShares(selectedHike.id);
      loadSharedEntries(selectedHike.id);
      setViewMode('mine');
    }
  }, [selectedHike?.id, user]);

  // Load friends for invite dialog
  const loadFriends = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
    
    if (!data) return;
    const friendIds = data.map(f => f.user_id === user.id ? f.friend_id : f.user_id);
    if (friendIds.length === 0) { setFriends([]); return; }
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', friendIds);
    
    setFriends((profiles || []).map((p: any) => ({ id: p.id, username: p.username || 'Ukjent', avatar_url: p.avatar_url })));
  }, [user]);

  const runningSessions = useMemo(() =>
    appData.sessions.filter(s => s.type === 'løping'),
    [appData.sessions]
  );

  const cyclingSessions = useMemo(() =>
    appData.sessions.filter(s => s.type === 'sykling'),
    [appData.sessions]
  );

  const tabs: { id: RecordTab; label: string }[] = [
    { id: 'running', label: t('records.running') },
    { id: 'cycling', label: t('records.cycling') },
    { id: 'hiking', label: t('records.hiking') },
  ];

  const handleAddHike = async () => {
    if (!newHikeName.trim()) return;
    if (user) {
      await supabase.from('hiking_records').insert({
        user_id: user.id,
        name: newHikeName.trim(),
        elevation: newHikeElevation ? Number(newHikeElevation) : null,
        distance: newHikeDistance ? Number(newHikeDistance) : null,
        elevation_gain: newHikeElevationGain ? Number(newHikeElevationGain) : null,
        route_description: newHikeRouteDesc.trim() || null,
        entries: [],
      } as any);
      loadHikingRecords();
    } else {
      const record: HikingRecord = {
        id: `h${Date.now()}`,
        name: newHikeName.trim(),
        elevation: newHikeElevation ? Number(newHikeElevation) : undefined,
        distance: newHikeDistance ? Number(newHikeDistance) : undefined,
        elevationGain: newHikeElevationGain ? Number(newHikeElevationGain) : undefined,
        routeDescription: newHikeRouteDesc.trim() || undefined,
        entries: [],
      };
      saveHikingRecords([...hikingRecords, record]);
    }
    setNewHikeName('');
    setNewHikeElevation('');
    setNewHikeDistance('');
    setNewHikeElevationGain('');
    setNewHikeRouteDesc('');
    setShowAddHike(false);
  };

  const handleAddEntry = async () => {
    if (!selectedHike || (newEntryHours === 0 && newEntryMinutes === 0 && newEntrySeconds === 0)) return;
    const timeStr = newEntryHours > 0
      ? `${newEntryHours}:${String(newEntryMinutes).padStart(2, '0')}:${String(newEntrySeconds).padStart(2, '0')}`
      : `${newEntryMinutes}:${String(newEntrySeconds).padStart(2, '0')}`;
    
    // If hike is shared and user is not the owner, save to shared_hiking_entries
    const isOwner = selectedHike.entries !== undefined; // Owner has entries in the record
    const hikeOwnedByUser = hikingRecords.some(h => h.id === selectedHike.id);
    
    if (user && !hikeOwnedByUser) {
      // User is a shared participant, save to shared_hiking_entries
      await supabase.from('shared_hiking_entries').insert({
        hiking_record_id: selectedHike.id,
        user_id: user.id,
        time: timeStr,
        date: newEntryDate,
        avg_heartrate: newEntryAvgHr ? Number(newEntryAvgHr) : null,
        max_heartrate: newEntryMaxHr ? Number(newEntryMaxHr) : null,
      } as any);
      await loadSharedEntries(selectedHike.id);
    } else {
      const entry: HikingEntry = {
        id: `e${Date.now()}`,
        time: timeStr,
        date: newEntryDate,
        avgHeartrate: newEntryAvgHr ? Number(newEntryAvgHr) : undefined,
        maxHeartrate: newEntryMaxHr ? Number(newEntryMaxHr) : undefined,
      };
      const newEntries = [...selectedHike.entries, entry];
      if (user) {
        await supabase.from('hiking_records').update({ entries: newEntries } as any).eq('id', selectedHike.id);
        await loadHikingRecords();
        setSelectedHike(prev => {
          const found = hikingRecords.find(h => h.id === selectedHike.id);
          return found ? { ...found, entries: newEntries } : prev;
        });
      } else {
        const updated = hikingRecords.map(h =>
          h.id === selectedHike.id ? { ...h, entries: newEntries } : h
        );
        saveHikingRecords(updated);
        setSelectedHike(updated.find(h => h.id === selectedHike.id) || null);
      }
    }
    setNewEntryHours(0);
    setNewEntryMinutes(0);
    setNewEntrySeconds(0);
    setNewEntryAvgHr('');
    setNewEntryMaxHr('');
    setShowAddEntry(false);
  };

  const [showDeleteHikeConfirm, setShowDeleteHikeConfirm] = useState(false);
  const [hikeToDelete, setHikeToDelete] = useState<string | null>(null);

  const handleDeleteHike = async (id: string) => {
    if (user) {
      await supabase.from('hiking_records').delete().eq('id', id);
      loadHikingRecords();
    } else {
      saveHikingRecords(hikingRecords.filter(h => h.id !== id));
    }
  };

  const handleEditHike = async () => {
    if (!selectedHike || !newHikeName.trim()) return;
    if (user) {
      await supabase.from('hiking_records').update({
        name: newHikeName.trim(),
        elevation: newHikeElevation ? Number(newHikeElevation) : null,
        distance: newHikeDistance ? Number(newHikeDistance) : null,
        elevation_gain: newHikeElevationGain ? Number(newHikeElevationGain) : null,
        route_description: newHikeRouteDesc.trim() || null,
      } as any).eq('id', selectedHike.id);
      await loadHikingRecords();
    } else {
      const updated = hikingRecords.map(h =>
        h.id === selectedHike.id
          ? {
              ...h,
              name: newHikeName.trim(),
              elevation: newHikeElevation ? Number(newHikeElevation) : undefined,
              distance: newHikeDistance ? Number(newHikeDistance) : undefined,
              elevationGain: newHikeElevationGain ? Number(newHikeElevationGain) : undefined,
              routeDescription: newHikeRouteDesc.trim() || undefined,
            }
          : h
      );
      saveHikingRecords(updated);
      setSelectedHike(updated.find(h => h.id === selectedHike.id) || null);
    }
    setShowEditHike(false);
  };

  const openEditHike = () => {
    if (!selectedHike) return;
    setNewHikeName(selectedHike.name);
    setNewHikeElevation(selectedHike.elevation?.toString() || '');
    setNewHikeDistance(selectedHike.distance?.toString() || '');
    setNewHikeElevationGain(selectedHike.elevationGain?.toString() || '');
    setNewHikeRouteDesc(selectedHike.routeDescription || '');
    setShowEditHike(true);
  };

  const handleDeleteEntry = async (entryId: string, isShared = false) => {
    if (!selectedHike) return;
    if (isShared) {
      await supabase.from('shared_hiking_entries').delete().eq('id', entryId) as any;
      await loadSharedEntries(selectedHike.id);
    } else {
      const newEntries = selectedHike.entries.filter(e => e.id !== entryId);
      if (user) {
        await supabase.from('hiking_records').update({ entries: newEntries } as any).eq('id', selectedHike.id);
        await loadHikingRecords();
        setSelectedHike(prev => prev ? { ...prev, entries: newEntries } : null);
      } else {
        const updated = hikingRecords.map(h =>
          h.id === selectedHike.id ? { ...h, entries: newEntries } : h
        );
        saveHikingRecords(updated);
        setSelectedHike(updated.find(h => h.id === selectedHike.id) || null);
      }
    }
  };

  // Parse time string like "3:45" or "1:23:45" to minutes for sorting
  const parseTimeToMinutes = (t: string): number => {
    const parts = t.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 60 + parts[1] + parts[2] / 60;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return Infinity;
  };

  // Invite friend to share hike
  const handleInviteFriend = async (friendId: string) => {
    if (!selectedHike || !user) return;
    await supabase.from('hiking_record_shares').insert({
      hiking_record_id: selectedHike.id,
      owner_id: user.id,
      shared_with_user_id: friendId,
      status: 'pending',
    } as any);
    
    // Send notification
    const friendProfile = friends.find(f => f.id === friendId);
    await supabase.from('community_notifications').insert({
      user_id: friendId,
      from_user_id: user.id,
      type: 'hike_share',
      title: language === 'no' ? 'Fjelltur-invitasjon' : 'Hike invitation',
      message: language === 'no' 
        ? `har invitert deg til å dele fjellturen "${selectedHike.name}"`
        : `invited you to share the hike "${selectedHike.name}"`,
    });
    
    toast.success(t('records.inviteSent'));
    await loadShares(selectedHike.id);
    setShowInviteDialog(false);
  };

  const handleRemoveFriend = async (shareId: string) => {
    await supabase.from('hiking_record_shares').delete().eq('id', shareId) as any;
    if (selectedHike) await loadShares(selectedHike.id);
    setShowRemoveFriendConfirm(false);
    setFriendToRemove(null);
  };

  const renderDistanceRecords = (sessions: WorkoutSession[], benchmarks: typeof RUNNING_BENCHMARKS) => {
    const records = benchmarks
      .map(b => ({ ...b, result: estimateBestTime(sessions, b.distance) }))
      .filter(b => b.result !== null);

    if (records.length === 0) {
      return (
        <p className="text-center py-8 text-muted-foreground text-sm">
          {t('records.noDistanceSessions')}
        </p>
      );
    }

    return (
      <div className="glass-card rounded-xl overflow-hidden divide-y divide-border/50">
        <div className="px-4 py-2.5 bg-secondary/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> {t('records.fastest')}
          </p>
        </div>
        {records.map(r => (
          <button
            key={r.label}
            onClick={() => {
              if (r.result?.sessionId) {
                const session = sessions.find(s => s.id === r.result?.sessionId);
                if (session) {
                  window.dispatchEvent(new CustomEvent('open-workout-detail', { detail: session }));
                }
              }
            }}
            className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-secondary/30 transition-colors"
          >
            <span className="text-sm font-medium w-20 shrink-0">{r.label}</span>
            <span className="text-xs text-muted-foreground flex-1 text-center">
              {r.result && new Date(r.result.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="font-display font-bold text-sm">{r.result?.time}</span>
          </button>
        ))}
      </div>
    );
  };

  const hasAcceptedShares = shares.some(s => s.status === 'accepted');

  // Combine own entries and shared entries for "all" view
  const getAllEntries = () => {
    if (!selectedHike) return [];
    const ownEntries = selectedHike.entries.map(e => ({
      id: e.id,
      time: e.time,
      date: e.date,
      avgHeartrate: e.avgHeartrate,
      maxHeartrate: e.maxHeartrate,
      userId: user?.id || '',
      isShared: false,
    }));
    const friendEntries = sharedEntries
      .filter(e => e.hiking_record_id === selectedHike.id)
      .map(e => ({
        id: e.id,
        time: e.time,
        date: e.date,
        avgHeartrate: e.avg_heartrate || undefined,
        maxHeartrate: e.max_heartrate || undefined,
        userId: e.user_id,
        isShared: true,
      }));
    return [...ownEntries, ...friendEntries].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="relative flex rounded-lg bg-muted p-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
              tab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'running' && renderDistanceRecords(runningSessions, RUNNING_BENCHMARKS)}
      {tab === 'cycling' && renderDistanceRecords(cyclingSessions, CYCLING_BENCHMARKS)}

      {tab === 'hiking' && (
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddHike(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> {t('records.addHike')}
          </Button>

          {hikingRecords.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              {t('records.noHikes')}
            </p>
          ) : (
            <div className="space-y-1">
              {hikingRecords.map(h => {
                const sorted = [...h.entries].sort((a, b) =>
                  parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
                );
                const best = sorted[0];
                return (
                  <button
                    key={h.id}
                    onClick={() => setSelectedHike(h)}
                    className="w-full glass-card rounded-xl p-3 flex items-center gap-3 text-left hover:bg-secondary/30 transition-colors"
                  >
                       <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Mountain className="w-4 h-4 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{h.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {best && `${t('records.best')}: ${best.time}`}
                        {h.distance && ` · ${h.distance} km`}
                        {h.elevationGain && ` · ${h.elevationGain} ${t('records.elevationGainUnit')}`}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHike(h);
                        setTimeout(() => openEditHike(), 50);
                      }}
                      className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHikeToDelete(h.id);
                        setShowDeleteHikeConfirm(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </button>
                );
              })}
            </div>
          )}

          {/* Add hike dialog */}
          <Dialog open={showAddHike} onOpenChange={setShowAddHike}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('records.newHike')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  value={newHikeName}
                  onChange={e => setNewHikeName(e.target.value)}
                  placeholder={t('records.hikeName')}
                />
                <Input
                  type="number"
                  value={newHikeElevation}
                  onChange={e => setNewHikeElevation(e.target.value)}
                  placeholder={t('records.elevationOptional')}
                />
                <Input
                  type="number"
                  value={newHikeDistance}
                  onChange={e => setNewHikeDistance(e.target.value)}
                  placeholder={t('records.distanceOptional')}
                />
                <Input
                  type="number"
                  value={newHikeElevationGain}
                  onChange={e => setNewHikeElevationGain(e.target.value)}
                  placeholder={t('records.elevationGainOptional')}
                />
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('records.routeDescription')}</label>
                  <Textarea
                    value={newHikeRouteDesc}
                    onChange={e => setNewHikeRouteDesc(e.target.value)}
                    placeholder={t('records.routeDescriptionPlaceholder')}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddHike} disabled={!newHikeName.trim()}>
                  {t('common.add')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Hike detail drawer */}
          <Drawer open={!!selectedHike} onOpenChange={o => { if (!o) setSelectedHike(null); }}>
            <DrawerContent className="max-h-[85vh]">
              <div className="overflow-y-auto scrollbar-hide pb-6">
                <DrawerHeader className="text-left">
                  <div className="flex items-center justify-between">
                    <DrawerTitle className="flex items-center gap-2">
                      <Mountain className="w-5 h-5 text-muted-foreground" />
                      {selectedHike?.name}
                    </DrawerTitle>
                    {user && (
                      <button
                        onClick={() => { loadFriends(); setShowInviteDialog(true); }}
                        className="p-2 rounded-lg hover:bg-secondary/60 transition-colors"
                        title={t('records.inviteFriend')}
                      >
                        <UserPlus className="w-5 h-5 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <DrawerDescription>
                    {selectedHike?.entries.length || 0} {t('records.registrations')}
                  </DrawerDescription>
                </DrawerHeader>

                {/* Route description */}
                {selectedHike?.routeDescription && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-muted-foreground italic">{selectedHike.routeDescription}</p>
                  </div>
                )}

                {/* Hike info tiles */}
                {selectedHike && (selectedHike.elevation || selectedHike.distance || selectedHike.elevationGain) && (
                  <div className="px-4 pb-3">
                    <div className="flex gap-2">
                      {selectedHike.elevation != null && (
                        <div className="flex-1 rounded-lg bg-secondary/50 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{t('records.elevationLabel')}</p>
                          <p className="font-display font-bold text-sm">{selectedHike.elevation} m</p>
                        </div>
                      )}
                      {selectedHike.distance != null && (
                        <div className="flex-1 rounded-lg bg-secondary/50 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{t('metric.distance.label')}</p>
                          <p className="font-display font-bold text-sm">{selectedHike.distance} km</p>
                        </div>
                      )}
                      {selectedHike.elevationGain != null && (
                        <div className="flex-1 rounded-lg bg-secondary/50 p-2.5 text-center">
                          <p className="text-[10px] text-muted-foreground mb-0.5">{t('metric.elevation.label')}</p>
                          <p className="font-display font-bold text-sm">{selectedHike.elevationGain} m</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Shared with section */}
                {shares.filter(s => s.status === 'accepted').length > 0 && (
                  <div className="px-4 pb-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">{t('records.sharedWith')}</p>
                    <div className="flex gap-2 flex-wrap">
                      {shares.filter(s => s.status === 'accepted').map(s => (
                        <div key={s.id} className="flex items-center gap-1.5 bg-secondary/50 rounded-full pl-1 pr-2 py-0.5">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={s.avatar_url} />
                            <AvatarFallback className="text-[8px]">{(s.username || '?')[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs">{s.username}</span>
                          <button
                            onClick={() => { setFriendToRemove(s.id); setShowRemoveFriendConfirm(true); }}
                            className="ml-0.5 p-0.5 rounded-full hover:bg-destructive/10"
                          >
                            <X className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mine / All toggle */}
                {hasAcceptedShares && (
                  <div className="px-4 pb-3">
                    <div className="flex rounded-lg bg-muted p-0.5">
                      <button
                        onClick={() => setViewMode('mine')}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          viewMode === 'mine' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        {t('records.mine')}
                      </button>
                      <button
                        onClick={() => setViewMode('all')}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          viewMode === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                        }`}
                      >
                        {t('records.all')}
                      </button>
                    </div>
                  </div>
                )}

                <div className="px-4 space-y-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowAddEntry(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" /> {t('records.addTime')}
                  </Button>

                  {selectedHike && (() => {
                    if (viewMode === 'all' && hasAcceptedShares) {
                      const allEntries = getAllEntries();
                      return allEntries.length === 0 ? (
                        <p className="text-center py-6 text-muted-foreground text-sm">
                          {t('records.noTimes')}
                        </p>
                      ) : (
                        <div className="glass-card rounded-xl overflow-hidden divide-y divide-border/50">
                          {allEntries.map((e, i) => {
                            const profile = e.userId === user?.id
                              ? { username: language === 'no' ? 'Deg' : 'You', avatar_url: undefined }
                              : profileCache.get(e.userId) || { username: 'Ukjent' };
                            const isOwnEntry = e.userId === user?.id;
                            return (
                              <div key={e.id} className="flex items-center gap-2.5 px-4 py-3">
                                <span className={`text-xs font-bold w-6 text-center ${
                                  i === 0 ? 'text-warning' : 'text-muted-foreground'
                                }`}>
                                  {i === 0 ? '🏆' : `#${i + 1}`}
                                </span>
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={profile.avatar_url} />
                                  <AvatarFallback className="text-[8px]">{(profile.username || '?')[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium text-muted-foreground truncate">{profile.username}</span>
                                  </div>
                                  <span className="font-display font-bold text-sm">{e.time}</span>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(e.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    // "Mine" view (default)
                    const sorted = [...selectedHike.entries].sort((a, b) =>
                      parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
                    );
                     return sorted.length === 0 ? (
                       <p className="text-center py-6 text-muted-foreground text-sm">
                         {t('records.noTimes')}
                      </p>
                    ) : (
                      <div className="glass-card rounded-xl overflow-hidden divide-y divide-border/50">
                        {sorted.map((e, i) => (
                          <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                            <span className={`text-xs font-bold w-6 text-center ${
                              i === 0 ? 'text-warning' : 'text-muted-foreground'
                            }`}>
                              {i === 0 ? '🏆' : `#${i + 1}`}
                            </span>
                            <div className="flex-1">
                              <span className="font-display font-bold text-sm">{e.time}</span>
                              {(e.avgHeartrate || e.maxHeartrate) && (
                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                  {e.avgHeartrate && <span>♥ {e.avgHeartrate}</span>}
                                  {e.avgHeartrate && e.maxHeartrate && <span> / </span>}
                                  {e.maxHeartrate && <span>maks {e.maxHeartrate}</span>}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {new Date(e.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <button
                              onClick={() => handleDeleteEntry(e.id)}
                              className="p-1 rounded hover:bg-destructive/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={openEditHike}
                    >
                      <Pencil className="w-4 h-4 mr-2" /> {t('common.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => { setHikeToDelete(selectedHike!.id); setShowDeleteHikeConfirm(true); }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" /> {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </div>
            </DrawerContent>
          </Drawer>

          {/* Invite friend dialog */}
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('records.inviteFriend')}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mb-3">{t('records.inviteFriendDesc')}</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {friends.filter(f => !shares.some(s => s.shared_with_user_id === f.id)).map(friend => (
                  <button
                    key={friend.id}
                    onClick={() => handleInviteFriend(friend.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={friend.avatar_url} />
                      <AvatarFallback>{(friend.username || '?')[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium flex-1 text-left">{friend.username}</span>
                    <UserPlus className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
                {friends.filter(f => !shares.some(s => s.shared_with_user_id === f.id)).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {language === 'no' ? 'Ingen venner å invitere' : 'No friends to invite'}
                  </p>
                )}
              </div>
              {shares.filter(s => s.status === 'pending').length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{t('records.pending')}</p>
                  {shares.filter(s => s.status === 'pending').map(s => (
                    <div key={s.id} className="flex items-center gap-2 py-1.5">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={s.avatar_url} />
                        <AvatarFallback className="text-[8px]">{(s.username || '?')[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-xs flex-1">{s.username}</span>
                      <span className="text-xs text-muted-foreground">{t('records.pending')}</span>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Add entry dialog */}
          <Dialog open={showAddEntry} onOpenChange={setShowAddEntry}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('records.newTime')} – {selectedHike?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                   <label className="text-sm font-medium mb-1 block">{t('workout.duration')}</label>
                   <button
                     type="button"
                     onClick={() => setShowDurationPicker(true)}
                     className="w-full h-10 px-3 rounded-md border border-input bg-background text-left text-sm font-medium hover:bg-accent/50 transition-colors"
                   >
                     {newEntryHours > 0
                       ? `${newEntryHours}:${String(newEntryMinutes).padStart(2, '0')}:${String(newEntrySeconds).padStart(2, '0')}`
                       : newEntryMinutes > 0 || newEntrySeconds > 0
                       ? `${newEntryMinutes}:${String(newEntrySeconds).padStart(2, '0')}`
                       : t('records.tapToSetTime')}
                   </button>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('workout.date')}</label>
                  <Input
                    type="date"
                    value={newEntryDate}
                    onChange={e => setNewEntryDate(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Snitt-puls</label>
                    <Input
                      type="number"
                      value={newEntryAvgHr}
                      onChange={e => setNewEntryAvgHr(e.target.value)}
                      placeholder="Valgfri"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Maks-puls</label>
                    <Input
                      type="number"
                      value={newEntryMaxHr}
                      onChange={e => setNewEntryMaxHr(e.target.value)}
                      placeholder="Valgfri"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                 <Button onClick={handleAddEntry} disabled={newEntryHours === 0 && newEntryMinutes === 0 && newEntrySeconds === 0}>
                   {t('common.add')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Duration picker */}
          <DurationPicker
            open={showDurationPicker}
            onClose={() => setShowDurationPicker(false)}
            hours={newEntryHours}
            minutes={newEntryMinutes}
            seconds={newEntrySeconds}
            showSeconds
            onConfirm={(h, m, s) => {
              setNewEntryHours(h);
              setNewEntryMinutes(m);
              setNewEntrySeconds(s ?? 0);
            }}
          />

          {/* Edit hike dialog */}
          <Dialog open={showEditHike} onOpenChange={setShowEditHike}>
             <DialogContent>
               <DialogHeader>
                 <DialogTitle>{t('records.editHike')}</DialogTitle>
               </DialogHeader>
               <div className="space-y-3">
                 <Input
                   value={newHikeName}
                   onChange={e => setNewHikeName(e.target.value)}
                   placeholder={t('records.hikeName')}
                />
                <Input
                  type="number"
                  value={newHikeElevation}
                  onChange={e => setNewHikeElevation(e.target.value)}
                   placeholder={t('records.elevationOptional')}
                 />
                 <Input
                   type="number"
                   value={newHikeDistance}
                   onChange={e => setNewHikeDistance(e.target.value)}
                   placeholder={t('records.distanceOptional')}
                 />
                 <Input
                   type="number"
                   value={newHikeElevationGain}
                   onChange={e => setNewHikeElevationGain(e.target.value)}
                   placeholder={t('records.elevationGainOptional')}
                />
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('records.routeDescription')}</label>
                  <Textarea
                    value={newHikeRouteDesc}
                    onChange={e => setNewHikeRouteDesc(e.target.value)}
                    placeholder={t('records.routeDescriptionPlaceholder')}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                 <Button onClick={handleEditHike} disabled={!newHikeName.trim()}>
                   {t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete hike confirmation */}
          <AlertDialog open={showDeleteHikeConfirm} onOpenChange={setShowDeleteHikeConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{language === 'no' ? 'Er du sikker?' : 'Are you sure?'}</AlertDialogTitle>
                <AlertDialogDescription>
                  {language === 'no' ? 'Denne handlingen kan ikke angres. Alle registreringer for denne fjellturen vil bli slettet.' : 'This action cannot be undone. All entries for this hike will be deleted.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{language === 'no' ? 'Avbryt' : 'Cancel'}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    if (hikeToDelete) {
                      handleDeleteHike(hikeToDelete);
                      setSelectedHike(null);
                      setHikeToDelete(null);
                    }
                  }}
                >
                  {language === 'no' ? 'Slett' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Remove friend confirmation */}
          <AlertDialog open={showRemoveFriendConfirm} onOpenChange={setShowRemoveFriendConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('records.removeFriend')}</AlertDialogTitle>
                <AlertDialogDescription>{t('records.removeFriendConfirm')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{language === 'no' ? 'Avbryt' : 'Cancel'}</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => friendToRemove && handleRemoveFriend(friendToRemove)}
                >
                  {t('records.removeFriend')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
};

export default RecordsSection;
