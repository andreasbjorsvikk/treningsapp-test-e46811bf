import { MockUser, mockChallenges, metricUnits } from '@/data/mockCommunity';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import { Trophy, Swords, Clock, MapPin, MountainSnow, Activity } from 'lucide-react';

interface UserProfileDrawerProps {
  user: MockUser | null;
  open: boolean;
  onClose: () => void;
  onInviteToChallenge?: (user: MockUser) => void;
}

// Mock profile data for each user
const mockProfileData: Record<string, {
  monthSessions: number; monthTarget: number; yearSessions: number; yearTarget: number;
  last7d: { sessions: number; distance: number; duration: number; elevation: number };
  last30d: { sessions: number; distance: number; duration: number; elevation: number };
  recentWorkouts: { type: string; title: string; date: string; duration: string; distance?: string }[];
  privacy: { workouts: boolean; stats: boolean; goals: boolean };
}> = {
  u1: {
    monthSessions: 14, monthTarget: 18, yearSessions: 28, yearTarget: 200,
    last7d: { sessions: 4, distance: 32, duration: 285, elevation: 450 },
    last30d: { sessions: 14, distance: 112, duration: 980, elevation: 1800 },
    recentWorkouts: [
      { type: 'løping', title: 'Morgentur', date: '2026-03-02', duration: '45 min', distance: '8.2 km' },
      { type: 'styrke', title: 'Overkropp', date: '2026-03-01', duration: '55 min' },
      { type: 'løping', title: 'Intervaller', date: '2026-02-28', duration: '35 min', distance: '6.1 km' },
      { type: 'fjelltur', title: 'Skåla', date: '2026-02-25', duration: '3t 20min', distance: '12 km' },
    ],
    privacy: { workouts: true, stats: true, goals: true },
  },
  u2: {
    monthSessions: 9, monthTarget: 12, yearSessions: 22, yearTarget: 150,
    last7d: { sessions: 3, distance: 18, duration: 190, elevation: 820 },
    last30d: { sessions: 9, distance: 65, duration: 720, elevation: 2400 },
    recentWorkouts: [
      { type: 'fjelltur', title: 'Besseggenturen', date: '2026-03-01', duration: '4t 30min', distance: '14 km' },
      { type: 'yoga', title: 'Morgen-yoga', date: '2026-02-28', duration: '30 min' },
      { type: 'løping', title: 'Kveldsjobb', date: '2026-02-26', duration: '40 min', distance: '7 km' },
    ],
    privacy: { workouts: true, stats: true, goals: true },
  },
  u3: {
    monthSessions: 7, monthTarget: 10, yearSessions: 15, yearTarget: 120,
    last7d: { sessions: 2, distance: 12, duration: 120, elevation: 200 },
    last30d: { sessions: 7, distance: 45, duration: 480, elevation: 600 },
    recentWorkouts: [
      { type: 'sykling', title: 'Langtur', date: '2026-03-02', duration: '2t 15min', distance: '55 km' },
    ],
    privacy: { workouts: true, stats: true, goals: false },
  },
  u4: {
    monthSessions: 5, monthTarget: 8, yearSessions: 12, yearTarget: 100,
    last7d: { sessions: 1, distance: 5, duration: 60, elevation: 50 },
    last30d: { sessions: 5, distance: 28, duration: 320, elevation: 150 },
    recentWorkouts: [
      { type: 'svømming', title: 'Bassengtrening', date: '2026-03-01', duration: '45 min', distance: '1.8 km' },
    ],
    privacy: { workouts: false, stats: false, goals: false },
  },
  u5: {
    monthSessions: 3, monthTarget: 6, yearSessions: 8, yearTarget: 80,
    last7d: { sessions: 1, distance: 8, duration: 55, elevation: 120 },
    last30d: { sessions: 3, distance: 22, duration: 180, elevation: 350 },
    recentWorkouts: [
      { type: 'løping', title: 'Kveldsjobb', date: '2026-02-27', duration: '40 min', distance: '7 km' },
    ],
    privacy: { workouts: false, stats: true, goals: false },
  },
};

const UserProfileDrawer = ({ user, open, onClose, onInviteToChallenge }: UserProfileDrawerProps) => {
  if (!user) return null;

  const profile = mockProfileData[user.id] || mockProfileData['u1'];

  // Find shared challenges
  const sharedChallenges = mockChallenges.filter(c =>
    c.participants.some(p => p.user.id === user.id) &&
    c.participants.some(p => p.user.id === 'me')
  );

  const formatMin = (min: number) => {
    if (min >= 60) return `${Math.floor(min / 60)}t ${min % 60}min`;
    return `${min} min`;
  };

  return (
    <Drawer open={open} onOpenChange={o => !o && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <div className="overflow-y-auto scrollbar-hide pb-6">
          <DrawerHeader className="text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-secondary border-2 border-background flex items-center justify-center">
                <span className="text-lg font-bold">{user.username[0]}</span>
              </div>
              <div>
                <DrawerTitle>{user.username}</DrawerTitle>
                <DrawerDescription>Venn</DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            {/* Month/Year wheels with goals */}
            {profile.privacy.goals && (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="font-display font-bold text-2xl">{profile.monthSessions}</p>
                  <p className="text-xs text-muted-foreground">av {profile.monthTarget} denne mnd</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (profile.monthSessions / profile.monthTarget) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/50 p-3 text-center">
                  <p className="font-display font-bold text-2xl">{profile.yearSessions}</p>
                  <p className="text-xs text-muted-foreground">av {profile.yearTarget} i år</p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (profile.yearSessions / profile.yearTarget) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Stats tiles */}
            {profile.privacy.stats && (
              <>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Siste 7 dager</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-lg bg-secondary/50 p-2 text-center">
                      <Activity className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="font-display font-bold text-sm">{profile.last7d.sessions}</p>
                      <p className="text-[10px] text-muted-foreground">Økter</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2 text-center">
                      <MapPin className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="font-display font-bold text-sm">{profile.last7d.distance} km</p>
                      <p className="text-[10px] text-muted-foreground">Distanse</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2 text-center">
                      <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="font-display font-bold text-sm">{formatMin(profile.last7d.duration)}</p>
                      <p className="text-[10px] text-muted-foreground">Tid</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2 text-center">
                      <MountainSnow className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="font-display font-bold text-sm">{profile.last7d.elevation} m</p>
                      <p className="text-[10px] text-muted-foreground">Høyde</p>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Siste 30 dager</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-lg bg-secondary/50 p-2 text-center">
                      <Activity className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="font-display font-bold text-sm">{profile.last30d.sessions}</p>
                      <p className="text-[10px] text-muted-foreground">Økter</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2 text-center">
                      <MapPin className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="font-display font-bold text-sm">{profile.last30d.distance} km</p>
                      <p className="text-[10px] text-muted-foreground">Distanse</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2 text-center">
                      <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="font-display font-bold text-sm">{formatMin(profile.last30d.duration)}</p>
                      <p className="text-[10px] text-muted-foreground">Tid</p>
                    </div>
                    <div className="rounded-lg bg-secondary/50 p-2 text-center">
                      <MountainSnow className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
                      <p className="font-display font-bold text-sm">{profile.last30d.elevation} m</p>
                      <p className="text-[10px] text-muted-foreground">Høyde</p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!profile.privacy.stats && !profile.privacy.goals && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Denne brukeren har skjult sin statistikk og mål.
              </div>
            )}

            {/* Recent workouts */}
            {profile.privacy.workouts && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Siste økter</p>
                <div className="space-y-1">
                  {profile.recentWorkouts.map((w, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50">
                      <span className="text-sm font-medium flex-1 truncate">{w.title}</span>
                      <span className="text-xs text-muted-foreground">{w.duration}</span>
                      {w.distance && <span className="text-xs text-muted-foreground">{w.distance}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!profile.privacy.workouts && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Denne brukeren har skjult sine økter.
              </div>
            )}

            {/* Shared challenges */}
            {sharedChallenges.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  <Swords className="w-3.5 h-3.5 inline mr-1" />
                  Felles utfordringer
                </p>
                <div className="space-y-1">
                  {sharedChallenges.map(c => {
                    const myProgress = c.participants.find(p => p.user.id === 'me');
                    const theirProgress = c.participants.find(p => p.user.id === user.id);
                    const unit = metricUnits[c.metric];
                    const iWon = (myProgress?.rank || 99) < (theirProgress?.rank || 99);
                    return (
                      <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50">
                        {c.emoji && <span>{c.emoji}</span>}
                        <span className="text-sm font-medium flex-1 truncate">{c.name}</span>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={iWon ? 'text-accent font-semibold' : 'text-muted-foreground'}>
                            {myProgress?.progress}{unit ? ` ${unit}` : ''}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className={!iWon ? 'text-accent font-semibold' : 'text-muted-foreground'}>
                            {theirProgress?.progress}{unit ? ` ${unit}` : ''}
                          </span>
                        </div>
                        {c.status === 'archived' && (
                          <Trophy className={`w-3.5 h-3.5 ${iWon ? 'text-warning' : 'text-muted-foreground'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Invite to challenge button */}
            {onInviteToChallenge && (
              <button
                onClick={() => onInviteToChallenge(user)}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Inviter til utfordring
              </button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default UserProfileDrawer;
