import { useState } from 'react';
import { Challenge, metricUnits, metricLabels, MockUser } from '@/data/mockCommunity';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from '@/components/ui/drawer';
import { Trophy, Link2, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import UserProfileDrawer from '@/components/community/UserProfileDrawer';

interface ChallengeDetailProps {
  challenge: Challenge | null;
  open: boolean;
  onClose: () => void;
}

const ChallengeDetail = ({ challenge, open, onClose }: ChallengeDetailProps) => {
  const { settings, updateSettings } = useSettings();
  const [profileUser, setProfileUser] = useState<MockUser | null>(null);

  if (!challenge) return null;

  const unit = metricUnits[challenge.metric];
  const endDate = new Date(challenge.periodEnd);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const periodStr = `${new Date(challenge.periodStart).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })} – ${endDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })}`;

  const sorted = [...challenge.participants].sort((a, b) => a.rank - b.rank);

  const isPinned = settings.pinnedChallengeIds?.includes(challenge.id);

  const togglePin = () => {
    const current = settings.pinnedChallengeIds || [];
    const next = isPinned
      ? current.filter(id => id !== challenge.id)
      : [...current, challenge.id];
    updateSettings({ pinnedChallengeIds: next });
    toast.success(isPinned ? 'Fjernet fra forsiden' : 'Lagt til på forsiden');
  };

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <div className="overflow-y-auto scrollbar-hide pb-4">
            <DrawerHeader className="text-left relative">
              <DrawerTitle className="flex items-center gap-2">
                {challenge.emoji && <span className="text-xl">{challenge.emoji}</span>}
                {challenge.name}
              </DrawerTitle>
              <DrawerDescription>{periodStr}</DrawerDescription>
              {/* Pin to home */}
              <button
                onClick={togglePin}
                className={`absolute bottom-2 right-4 p-1.5 rounded-md transition-colors ${
                  isPinned
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground/40 hover:text-muted-foreground'
                }`}
                title={isPinned ? 'Fjern fra forsiden' : 'Vis på forsiden'}
              >
                <Home className="w-4 h-4" />
              </button>
            </DrawerHeader>

            <div className="px-4 space-y-4">
              {/* Countdown / status */}
              <div className="flex items-center justify-between">
                <span className="text-base text-muted-foreground">
                  {metricLabels[challenge.metric]}
                  {challenge.target > 0 ? ` · Mål: ${challenge.target}${unit ? ` ${unit}` : ''}` : ' · Ingen satt mål'}
                </span>
                {challenge.status !== 'archived' ? (
                  <span className="text-sm font-medium bg-accent/10 text-accent px-2.5 py-1 rounded-full">
                    {daysLeft} dager igjen
                  </span>
                ) : (
                  <span className="text-sm font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                    Avsluttet
                  </span>
                )}
              </div>

              {/* Ranked participant list with avatars */}
              <div className="space-y-1.5">
                {sorted.map((p, i) => {
                  const maxProgress = Math.max(...challenge.participants.map(pp => pp.progress));
                  const pct = challenge.target > 0
                    ? Math.min((p.progress / challenge.target) * 100, 100)
                    : maxProgress > 0 ? (p.progress / maxProgress) * 100 : 0;
                  return (
                    <button
                      key={p.user.id}
                      onClick={() => p.user.id !== 'me' && setProfileUser(p.user)}
                      className={`w-full flex items-center gap-3 rounded-lg bg-secondary/50 p-3 text-left ${
                        p.user.id !== 'me' ? 'hover:bg-secondary/70 cursor-pointer' : ''
                      } transition-colors`}
                    >
                      <span className={`font-display font-bold text-base w-7 text-center ${i === 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                        {i === 0 ? <Trophy className="w-4.5 h-4.5 inline text-warning" /> : `#${p.rank}`}
                      </span>
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs font-medium">{p.user.username[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-base font-medium truncate">{p.user.username}</span>
                          <span className="text-sm font-medium">{p.progress}{unit ? ` ${unit}` : ''}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <DrawerFooter className="flex-row gap-2 pt-4">
              {challenge.status !== 'archived' && (
                <>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://treningsapp.no/challenge/${challenge.id}/invite`);
                      toast.success('Invitasjonslenke kopiert!');
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                  {challenge.createdBy === 'me' && (
                    <button className="flex-1 py-2.5 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors">
                      Rediger
                    </button>
                  )}
                  <button className="flex-1 py-2.5 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors">
                    Forlat
                  </button>
                </>
              )}
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <UserProfileDrawer
        user={profileUser}
        open={!!profileUser}
        onClose={() => setProfileUser(null)}
      />
    </>
  );
};

export default ChallengeDetail;
