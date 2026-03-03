import { useState, useEffect } from 'react';
import { Friend } from '@/services/communityService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import { Swords, Activity, Clock, Mountain, Flame, Loader2, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ActivityIcon from '@/components/ActivityIcon';
import { SessionType } from '@/types/workout';

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
  recentSessions: { type: string; date: string; distance: number | null; duration_minutes: number }[];
  activityBreakdown: { type: string; count: number }[];
}

const UserProfileDrawer = ({ user, open, onClose, onInviteToChallenge }: UserProfileDrawerProps) => {
  const [stats, setStats] = useState<FriendStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !open) { setStats(null); return; }

    const load = async () => {
      setLoading(true);
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('type, date, distance, duration_minutes, elevation_gain')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100);

      if (!sessions) { setLoading(false); return; }

      const totalSessions = sessions.length;
      const totalDuration = sessions.reduce((s, x) => s + (x.duration_minutes || 0), 0);
      const totalDistance = sessions.reduce((s, x) => s + (x.distance || 0), 0);
      const totalElevation = sessions.reduce((s, x) => s + (x.elevation_gain || 0), 0);

      const typeCounts: Record<string, number> = {};
      for (const s of sessions) {
        typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
      }
      const activityBreakdown = Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);

      setStats({
        totalSessions,
        totalDuration,
        totalDistance,
        totalElevation,
        recentSessions: sessions.slice(0, 5),
        activityBreakdown,
      });
      setLoading(false);
    };

    load();
  }, [user, open]);

  if (!user) return null;

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}t ${m}m` : `${m}m`;
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <div className="overflow-y-auto scrollbar-hide pb-6">
          <DrawerHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <Avatar className="w-16 h-16">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
                <AvatarFallback className="text-xl font-bold">{(user.username || '?')[0]}</AvatarFallback>
              </Avatar>
            </div>
            <DrawerTitle>{user.username || 'Ukjent'}</DrawerTitle>
            <DrawerDescription>Venneprofil</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            {/* Invite to challenge */}
            {onInviteToChallenge && (
              <button
                onClick={() => onInviteToChallenge(user)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Swords className="w-4 h-4" /> Inviter til utfordring
              </button>
            )}

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : stats ? (
              <>
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-secondary/60 p-3 text-center">
                    <Activity className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{stats.totalSessions}</p>
                    <p className="text-[11px] text-muted-foreground">Økter</p>
                  </div>
                  <div className="rounded-lg bg-secondary/60 p-3 text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{formatDuration(stats.totalDuration)}</p>
                    <p className="text-[11px] text-muted-foreground">Total tid</p>
                  </div>
                  <div className="rounded-lg bg-secondary/60 p-3 text-center">
                    <TrendingUp className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{stats.totalDistance.toFixed(1)} km</p>
                    <p className="text-[11px] text-muted-foreground">Total distanse</p>
                  </div>
                  <div className="rounded-lg bg-secondary/60 p-3 text-center">
                    <Mountain className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{stats.totalElevation} m</p>
                    <p className="text-[11px] text-muted-foreground">Høydemeter</p>
                  </div>
                </div>

                {/* Activity breakdown */}
                {stats.activityBreakdown.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Aktiviteter</p>
                    <div className="flex flex-wrap gap-2">
                      {stats.activityBreakdown.map(a => (
                        <div key={a.type} className="flex items-center gap-1.5 bg-secondary/60 rounded-full px-3 py-1.5">
                          <ActivityIcon type={a.type as SessionType} />
                          <span className="text-xs font-medium capitalize">{a.type}</span>
                          <span className="text-xs text-muted-foreground">({a.count})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent sessions */}
                {stats.recentSessions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Siste økter</p>
                    <div className="space-y-1.5">
                      {stats.recentSessions.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40">
                          <ActivityIcon type={s.type as SessionType} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium capitalize">{s.type}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(s.date).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <div className="text-right">
                            {s.distance ? (
                              <p className="text-sm font-medium">{s.distance.toFixed(1)} km</p>
                            ) : null}
                            <p className="text-[11px] text-muted-foreground">{formatDuration(s.duration_minutes)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {stats.totalSessions === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ingen treningsdata å vise ennå
                  </p>
                )}
              </>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default UserProfileDrawer;
