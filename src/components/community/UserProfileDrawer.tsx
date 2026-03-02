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
  monthSessions: number; yearSessions: number;
  last7d: { sessions: number; distance: number; duration: number };
  last30d: { sessions: number; distance: number; duration: number };
  recentWorkouts: { type: string; title: string; date: string; duration: string; distance?: string }[];
}> = {
  u1: {
    monthSessions: 14, yearSessions: 28,
    last7d: { sessions: 4, distance: 32, duration: 285 },
    last30d: { sessions: 14, distance: 112, duration: 980 },
    recentWorkouts: [
      { type: 'løping', title: 'Morgentur', date: '2026-03-02', duration: '45 min', distance: '8.2 km' },
      { type: 'styrke', title: 'Overkropp', date: '2026-03-01', duration: '55 min' },
      { type: 'løping', title: 'Intervaller', date: '2026-02-28', duration: '35 min', distance: '6.1 km' },
    ],
  },
  u2: {
    monthSessions: 9, yearSessions: 22,
    last7d: { sessions: 3, distance: 18, duration: 190 },
    last30d: { sessions: 9, distance: 65, duration: 720 },
    recentWorkouts: [
      { type: 'fjelltur', title: 'Besseggenturen', date: '2026-03-01', duration: '4t 30min', distance: '14 km' },
      { type: 'yoga', title: 'Morgen-yoga', date: '2026-02-28', duration: '30 min' },
    ],
  },
  u3: {
    monthSessions: 7, yearSessions: 15,
    last7d: { sessions: 2, distance: 12, duration: 120 },
    last30d: { sessions: 7, distance: 45, duration: 480 },
    recentWorkouts: [
      { type: 'sykling', title: 'Langtur', date: '2026-03-02', duration: '2t 15min', distance: '55 km' },
    ],
  },
  u4: {
    monthSessions: 5, yearSessions: 12,
    last7d: { sessions: 1, distance: 5, duration: 60 },
    last30d: { sessions: 5, distance: 28, duration: 320 },
    recentWorkouts: [
      { type: 'svømming', title: 'Bassengtrening', date: '2026-03-01', duration: '45 min', distance: '1.8 km' },
    ],
  },
  u5: {
    monthSessions: 3, yearSessions: 8,
    last7d: { sessions: 1, distance: 8, duration: 55 },
    last30d: { sessions: 3, distance: 22, duration: 180 },
    recentWorkouts: [
      { type: 'løping', title: 'Kveldsjobb', date: '2026-02-27', duration: '40 min', distance: '7 km' },
    ],
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
            {/* Month/Year wheels - simplified as numbers */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <p className="font-display font-bold text-2xl">{profile.monthSessions}</p>
                <p className="text-xs text-muted-foreground">Økter denne mnd</p>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3 text-center">
                <p className="font-display font-bold text-2xl">{profile.yearSessions}</p>
                <p className="text-xs text-muted-foreground">Økter i år</p>
              </div>
            </div>

            {/* Stats tiles */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Siste 7 dager</p>
              <div className="grid grid-cols-3 gap-2">
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
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Siste 30 dager</p>
              <div className="grid grid-cols-3 gap-2">
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
              </div>
            </div>

            {/* Recent workouts */}
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
