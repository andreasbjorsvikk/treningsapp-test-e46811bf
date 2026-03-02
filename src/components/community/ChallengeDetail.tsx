import { Challenge, metricUnits, metricLabels } from '@/data/mockCommunity';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from '@/components/ui/drawer';
import { Trophy, Link2 } from 'lucide-react';
import { toast } from 'sonner';

interface ChallengeDetailProps {
  challenge: Challenge | null;
  open: boolean;
  onClose: () => void;
}

const ChallengeDetail = ({ challenge, open, onClose }: ChallengeDetailProps) => {
  if (!challenge) return null;

  const unit = metricUnits[challenge.metric];
  const endDate = new Date(challenge.periodEnd);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  const periodStr = `${new Date(challenge.periodStart).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })} – ${endDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long' })}`;

  const sorted = [...challenge.participants].sort((a, b) => a.rank - b.rank);

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <div className="overflow-y-auto scrollbar-hide pb-4">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              {challenge.emoji && <span className="text-xl">{challenge.emoji}</span>}
              {challenge.name}
            </DrawerTitle>
            <DrawerDescription>{periodStr}</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 space-y-4">
            {/* Countdown / status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {metricLabels[challenge.metric]}
                {challenge.target > 0 ? ` · Mål: ${challenge.target}${unit ? ` ${unit}` : ''}` : ' · Ingen satt mål'}
              </span>
              {challenge.status !== 'archived' ? (
                <span className="text-xs font-medium bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                  {daysLeft} dager igjen
                </span>
              ) : (
                <span className="text-xs font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  Avsluttet
                </span>
              )}
            </div>

            {/* Ranked participant list */}
            <div className="space-y-1">
              {sorted.map((p, i) => {
                const maxProgress = Math.max(...challenge.participants.map(pp => pp.progress));
                const pct = challenge.target > 0
                  ? Math.min((p.progress / challenge.target) * 100, 100)
                  : maxProgress > 0 ? (p.progress / maxProgress) * 100 : 0;
                return (
                  <div key={p.user.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-2.5">
                    <span className={`font-display font-bold text-sm w-6 text-center ${i === 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                      {i === 0 ? <Trophy className="w-4 h-4 inline text-warning" /> : `#${p.rank}`}
                    </span>
                    <div className="w-6 h-6 rounded-full bg-secondary border border-background flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-medium">{p.user.username[0]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium truncate">{p.user.username}</span>
                        <span className="text-xs font-medium">{p.progress}{unit ? ` ${unit}` : ''}</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
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
  );
};

export default ChallengeDetail;
