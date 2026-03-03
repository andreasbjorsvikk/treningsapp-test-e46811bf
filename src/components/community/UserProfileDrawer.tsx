import { useState, useEffect } from 'react';
import { Friend, getChallenges, getChallengeParticipants, getChallengeProgress, ChallengeRow } from '@/services/communityService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Drawer, DrawerContent,
} from '@/components/ui/drawer';
import { Swords, Activity, Clock, Mountain, Loader2, TrendingUp, ChevronLeft, Trophy, Target, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ActivityIcon from '@/components/ActivityIcon';
import { SessionType } from '@/types/workout';
import { useAuth } from '@/hooks/useAuth';
import { getActivityColors } from '@/utils/activityColors';
import { useSettings } from '@/contexts/SettingsContext';

interface UserProfileDrawerProps {
  user: Friend | null;
  open: boolean;
  onClose: () => void;
  onInviteToChallenge?: (user: Friend) => void;
}

interface FriendStats {
  totalSessions: number;
  totalDuration: number;
  totalDistance: number;
  totalElevation: number;
  weekSessions: number;
  weekDuration: number;
  weekDistance: number;
  monthSessions: number;
  monthDuration: number;
  monthDistance: number;
  recentSessions: { type: string; date: string; distance: number | null; duration_minutes: number; title: string | null }[];
  activityBreakdown: { type: string; count: number }[];
}

interface SharedChallenge {
  id: string;
  name: string;
  emoji: string | null;
  metric: string;
  target: number;
  periodEnd: string;
  myProgress: number;
  friendProgress: number;
  isActive: boolean;
}

const UserProfileDrawer = ({ user, open, onClose, onInviteToChallenge }: UserProfileDrawerProps) => {
  const { user: me } = useAuth();
  const { settings } = useSettings();
  const [stats, setStats] = useState<FriendStats | null>(null);
  const [sharedChallenges, setSharedChallenges] = useState<SharedChallenge[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !open || !me) { setStats(null); setSharedChallenges([]); return; }

    const load = async () => {
      setLoading(true);

      // Fetch friend's sessions
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('type, date, distance, duration_minutes, elevation_gain, title')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(200);

      if (sessions) {
        const now = new Date();
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7);
        const monthAgo = new Date(now); monthAgo.setMonth(now.getMonth() - 1);

        let weekS = 0, weekD = 0, weekDist = 0, monthS = 0, monthD = 0, monthDist = 0;

        const typeCounts: Record<string, number> = {};
        for (const s of sessions) {
          typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
          const d = new Date(s.date);
          if (d >= weekAgo) { weekS++; weekD += s.duration_minutes || 0; weekDist += s.distance || 0; }
          if (d >= monthAgo) { monthS++; monthD += s.duration_minutes || 0; monthDist += s.distance || 0; }
        }

        setStats({
          totalSessions: sessions.length,
          totalDuration: sessions.reduce((s, x) => s + (x.duration_minutes || 0), 0),
          totalDistance: sessions.reduce((s, x) => s + (x.distance || 0), 0),
          totalElevation: sessions.reduce((s, x) => s + (x.elevation_gain || 0), 0),
          weekSessions: weekS, weekDuration: weekD, weekDistance: weekDist,
          monthSessions: monthS, monthDuration: monthD, monthDistance: monthDist,
          recentSessions: sessions.slice(0, 6),
          activityBreakdown: Object.entries(typeCounts)
            .map(([type, count]) => ({ type, count }))
            .sort((a, b) => b.count - a.count),
        });
      }

      // Fetch shared challenges
      try {
        const allChallenges = await getChallenges();
        const shared: SharedChallenge[] = [];

        for (const c of allChallenges) {
          const parts = await getChallengeParticipants(c.id);
          const acceptedIds = parts.filter(p => p.status === 'accepted').map(p => p.user_id);
          if (acceptedIds.includes(me.id) && acceptedIds.includes(user.id)) {
            const progress = await getChallengeProgress(c, [me.id, user.id]);
            const now = new Date().toISOString().split('T')[0];
            shared.push({
              id: c.id,
              name: c.name,
              emoji: c.emoji,
              metric: c.metric,
              target: c.target,
              periodEnd: c.period_end,
              myProgress: progress[me.id] || 0,
              friendProgress: progress[user.id] || 0,
              isActive: c.period_end >= now,
            });
          }
        }

        setSharedChallenges(shared);
      } catch {}

      setLoading(false);
    };

    load();
  }, [user, open, me]);

  if (!user) return null;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}t ${m}m` : `${m}m`;
  };

  const metricUnit = (metric: string) => {
    switch (metric) {
      case 'distance': return 'km';
      case 'duration': return 'min';
      case 'elevation': return 'm';
      default: return '';
    }
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[92vh] h-[92vh]">
        <div className="overflow-y-auto scrollbar-hide pb-8 h-full">
          {/* Header with back button */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md px-4 py-3 flex items-center gap-3 border-b border-border/30">
            <button onClick={onClose} className="p-1 -ml-1 rounded-lg hover:bg-muted/50 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold flex-1">Profil</span>
          </div>

          {/* Profile hero */}
          <div className="px-4 pt-6 pb-4 text-center">
            <div className="flex justify-center mb-3">
              <Avatar className="w-20 h-20 ring-4 ring-primary/20">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {(user.username || '?')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <h2 className="text-lg font-bold">{user.username || 'Ukjent'}</h2>

            {/* Invite button */}
            {onInviteToChallenge && (
              <button
                onClick={() => onInviteToChallenge(user)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Swords className="w-4 h-4" /> Inviter til utfordring
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : stats ? (
            <div className="px-4 space-y-5">

              {/* This week / This month */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Denne uken</h3>
                <div className="grid grid-cols-3 gap-2">
                  <StatTile icon={<Activity className="w-3.5 h-3.5" />} value={String(stats.weekSessions)} label="Økter" />
                  <StatTile icon={<Clock className="w-3.5 h-3.5" />} value={formatDuration(stats.weekDuration)} label="Tid" />
                  <StatTile icon={<TrendingUp className="w-3.5 h-3.5" />} value={`${stats.weekDistance.toFixed(1)} km`} label="Distanse" />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Denne måneden</h3>
                <div className="grid grid-cols-3 gap-2">
                  <StatTile icon={<Activity className="w-3.5 h-3.5" />} value={String(stats.monthSessions)} label="Økter" />
                  <StatTile icon={<Clock className="w-3.5 h-3.5" />} value={formatDuration(stats.monthDuration)} label="Tid" />
                  <StatTile icon={<TrendingUp className="w-3.5 h-3.5" />} value={`${stats.monthDistance.toFixed(1)} km`} label="Distanse" />
                </div>
              </div>

              {/* Totals */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Totalt</h3>
                <div className="grid grid-cols-2 gap-2">
                  <StatTile icon={<Activity className="w-3.5 h-3.5" />} value={String(stats.totalSessions)} label="Økter" />
                  <StatTile icon={<Clock className="w-3.5 h-3.5" />} value={formatDuration(stats.totalDuration)} label="Treningstid" />
                  <StatTile icon={<TrendingUp className="w-3.5 h-3.5" />} value={`${stats.totalDistance.toFixed(1)} km`} label="Distanse" />
                  <StatTile icon={<Mountain className="w-3.5 h-3.5" />} value={`${stats.totalElevation} m`} label="Høydemeter" />
                </div>
              </div>

              {/* Activity breakdown */}
              {stats.activityBreakdown.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aktiviteter</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.activityBreakdown.map(a => {
                      const colors = getActivityColors(a.type as SessionType, settings.darkMode);
                      return (
                        <div
                          key={a.type}
                          className="flex items-center gap-1.5 rounded-full px-3 py-1.5"
                          style={{ backgroundColor: colors.bg }}
                        >
                          <ActivityIcon type={a.type as SessionType} className="w-4 h-4" colorOverride={!settings.darkMode ? colors.text : undefined} />
                          <span className="text-xs font-medium capitalize" style={{ color: settings.darkMode ? '#fff' : colors.text }}>{a.type}</span>
                          <span className="text-xs opacity-70" style={{ color: settings.darkMode ? '#fff' : colors.text }}>({a.count})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shared challenges */}
              {sharedChallenges.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" /> Felles utfordringer
                  </h3>
                  <div className="space-y-2">
                    {sharedChallenges.map(ch => {
                      const myPct = ch.target > 0 ? Math.min(100, (ch.myProgress / ch.target) * 100) : 0;
                      const friendPct = ch.target > 0 ? Math.min(100, (ch.friendProgress / ch.target) * 100) : 0;
                      const unit = metricUnit(ch.metric);
                      return (
                        <div key={ch.id} className="rounded-xl bg-secondary/50 p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            {ch.emoji && <span className="text-base">{ch.emoji}</span>}
                            <span className="text-sm font-semibold flex-1">{ch.name}</span>
                            {!ch.isActive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Avsluttet</span>}
                          </div>
                          {/* Me vs Friend progress bars */}
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] w-10 text-muted-foreground">Meg</span>
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${myPct}%` }} />
                              </div>
                              <span className="text-[11px] font-medium w-14 text-right">
                                {ch.metric === 'sessions' ? ch.myProgress : ch.myProgress.toFixed(1)}{unit && ` ${unit}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] w-10 text-muted-foreground truncate">{user.username?.split(' ')[0]}</span>
                              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full bg-accent-foreground/40 transition-all" style={{ width: `${friendPct}%` }} />
                              </div>
                              <span className="text-[11px] font-medium w-14 text-right">
                                {ch.metric === 'sessions' ? ch.friendProgress : ch.friendProgress.toFixed(1)}{unit && ` ${unit}`}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground">Mål: {ch.target} {unit}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent sessions */}
              {stats.recentSessions.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Siste økter</h3>
                  <div className="space-y-1.5">
                    {stats.recentSessions.map((s, i) => {
                      const colors = getActivityColors(s.type as SessionType, settings.darkMode);
                      return (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/40">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: colors.bg }}
                          >
                            <ActivityIcon type={s.type as SessionType} className="w-4 h-4" colorOverride={!settings.darkMode ? colors.text : undefined} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{s.title || s.type}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(s.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            {s.distance ? <p className="text-sm font-medium">{s.distance.toFixed(1)} km</p> : null}
                            <p className="text-[11px] text-muted-foreground">{formatDuration(s.duration_minutes)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {stats.totalSessions === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Ingen treningsdata å vise ennå</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 p-3 text-center">
      <div className="flex justify-center mb-1 text-primary">{icon}</div>
      <p className="text-base font-bold leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

export default UserProfileDrawer;
