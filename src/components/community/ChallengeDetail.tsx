import { useState, useEffect } from 'react';
import { ChallengeWithParticipants } from '@/pages/CommunityPage';
import { Friend, respondToChallenge, leaveChallenge } from '@/services/communityService';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Trophy, Link2, Home, Pencil, Check, X, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/hooks/useAuth';
import UserProfileDrawer from '@/components/community/UserProfileDrawer';
import { useTranslation } from '@/i18n/useTranslation';

const metricUnits: Record<string, string> = {
  sessions: '',
  distance: 'km',
  duration: 't',
  elevation: 'm',
};

interface ChallengeDetailProps {
  challenge: ChallengeWithParticipants | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (challenge: ChallengeWithParticipants) => void;
  onResponded?: () => void;
}

const ChallengeDetail = ({ challenge, open, onClose, onEdit, onResponded }: ChallengeDetailProps) => {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [profileUser, setProfileUser] = useState<Friend | null>(null);
  const [responding, setResponding] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (open && challenge && user) {
      supabase.from('challenge_participants')
        .select('status')
        .eq('challenge_id', challenge.challenge.id)
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          setIsPending(data?.status === 'pending');
        });

      // Fetch creator name
      supabase.from('profiles')
        .select('username')
        .eq('id', challenge.challenge.created_by)
        .single()
        .then(({ data }) => {
          setCreatorName(data?.username || null);
        });
    }
  }, [open, challenge, user]);

  const handleRespond = async (accept: boolean) => {
    if (!challenge) return;
    setResponding(true);
    try {
      await respondToChallenge(challenge.challenge.id, accept);
      toast.success(accept ? t('notifications.challengeAccepted') : t('notifications.challengeDeclined'));
      setIsPending(false);
      onResponded?.();
      onClose();
    } catch {
      toast.error(t('notifications.respondError'));
    }
    setResponding(false);
  };

  const handleLeave = async () => {
    if (!challenge) return;
    setResponding(true);
    try {
      await leaveChallenge(challenge.challenge.id);
      toast.success(t('challenge.leftChallenge'));
      onResponded?.();
      onClose();
    } catch {
      toast.error(t('notifications.respondError'));
    }
    setResponding(false);
    setShowLeaveConfirm(false);
  };

  if (!challenge) return null;

  const c = challenge.challenge;
  const unit = metricUnits[c.metric] || '';
  const endDate = new Date(c.period_end);
  const now = new Date();
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const isEnded = c.period_end < now.toISOString().split('T')[0];
  const locale = t('date.locale');
  const periodStr = `${new Date(c.period_start).toLocaleDateString(locale, { day: 'numeric', month: 'long' })} – ${endDate.toLocaleDateString(locale, { day: 'numeric', month: 'long' })}`;
  const isCreator = c.created_by === user?.id;

  // Filter participants: hide pending users from others, but show pending user to themselves
  const visibleParticipants = challenge.participants.filter(p => {
    if (p.status === 'accepted') return true;
    if (p.status === 'pending' && p.userId === user?.id) return true;
    return false;
  });
  const sorted = [...visibleParticipants].sort((a, b) => a.rank - b.rank);

  const isPinned = settings.pinnedChallengeIds?.includes(c.id);

  const togglePin = () => {
    const current = settings.pinnedChallengeIds || [];
    const next = isPinned ? current.filter(id => id !== c.id) : [...current, c.id];
    updateSettings({ pinnedChallengeIds: next });
    toast.success(isPinned ? t('challenge.removedFromHome') : t('challenge.addedToHome'));
  };

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <div className="overflow-y-auto scrollbar-hide pb-4">
            <DrawerHeader className="text-left relative">
              <DrawerTitle className="flex items-center gap-2">
                {c.emoji && <span className="text-xl">{c.emoji}</span>}
                {c.name}
              </DrawerTitle>
              <DrawerDescription>{periodStr}</DrawerDescription>
              <button
                onClick={togglePin}
                className={`absolute bottom-2 right-4 p-1.5 rounded-md transition-colors ${
                  isPinned ? 'text-primary bg-primary/10' : 'text-muted-foreground/40 hover:text-muted-foreground'
                }`}
                title={isPinned ? t('challenge.removeFromHome') : t('challenge.showOnHome')}
              >
                <Home className="w-4 h-4" />
              </button>
            </DrawerHeader>

            <div className="px-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-base text-muted-foreground">
                  {t(`challenge.metric${c.metric.charAt(0).toUpperCase() + c.metric.slice(1)}`)}
                  {c.target > 0 ? ` · ${t('challengeCard.target')}: ${c.target}${unit ? ` ${unit}` : ''}` : ` · ${t(`challenge.noTarget.${c.metric}`)}`}
                </span>
                {!isEnded ? (
                  <span className="text-sm font-medium bg-accent/10 text-accent px-2.5 py-1 rounded-full">
                    {daysLeft} {t('challenge.daysLeft')}
                  </span>
                ) : (
                  <span className="text-sm font-medium bg-muted text-muted-foreground px-2.5 py-1 rounded-full">
                    {t('common.ended')}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {sorted.map((p, i) => {
                  const maxProgress = Math.max(...challenge.participants.map(pp => pp.progress));
                  const pct = c.target > 0
                    ? Math.min((p.progress / c.target) * 100, 100)
                    : maxProgress > 0 ? (p.progress / maxProgress) * 100 : 0;
                  const isSelf = p.userId === user?.id;
                  const isLeader = i === 0 && p.progress > 0;
                  return (
                    <button
                      key={p.userId}
                      onClick={() => !isSelf && setProfileUser({ id: p.userId, username: p.username, avatarUrl: p.avatarUrl })}
                      className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors ${
                        isLeader ? 'bg-accent/10 ring-1 ring-accent/20' : 'bg-secondary/50'
                      } ${!isSelf ? 'hover:bg-secondary/70 cursor-pointer' : ''}`}
                    >
                      <span className={`font-display font-bold text-base w-7 text-center ${
                        i === 0 ? 'text-warning' : i === 1 ? 'text-muted-foreground' : i === 2 ? 'text-amber-800 dark:text-amber-600' : 'text-muted-foreground'
                      }`}>
                        {i === 0 ? <Trophy className="w-4.5 h-4.5 inline text-warning" /> : `#${p.rank}`}
                      </span>
                      <Avatar className="w-8 h-8">
                        {p.avatarUrl ? <AvatarImage src={p.avatarUrl} /> : null}
                        <AvatarFallback className="text-xs font-medium">{(p.username || '?')[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-base truncate ${isSelf ? 'font-semibold' : 'font-medium'}`}>
                            {isSelf ? t('common.me') : p.username}
                          </span>
                          <span className="text-sm font-bold tabular-nums">{(c.metric === 'distance' ? p.progress.toFixed(1) : Math.round(p.progress))}{unit ? ` ${unit}` : ''}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${isLeader ? 'bg-accent' : 'bg-muted-foreground/40'}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        {c.target > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{Math.round(pct)}%</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <DrawerFooter className="flex-col gap-2 pt-4">
              {isPending && (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => handleRespond(true)}
                    disabled={responding}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" /> {t('notifications.accept')}
                  </button>
                  <button
                    onClick={() => handleRespond(false)}
                    disabled={responding}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary text-foreground text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" /> {t('notifications.decline')}
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                {onEdit && isCreator && (
                  <button
                    onClick={() => { onEdit(challenge); onClose(); }}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> {t('common.edit')}
                  </button>
                )}
                {!isEnded && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/challenge/${c.id}/invite`);
                      toast.success(t('challenge.inviteLink'));
                    }}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                  >
                    <Link2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Footer: created by + leave */}
              <div className="flex items-center justify-between w-full pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {t('challenge.createdBy')} {creatorName || t('common.unknown')}
                </span>
                {!isCreator && !isPending && (
                  <button
                    onClick={() => setShowLeaveConfirm(true)}
                    className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    {t('challenge.leave')}
                  </button>
                )}
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('challenge.leaveConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('challenge.leaveConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('challenge.leave')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserProfileDrawer
        user={profileUser}
        open={!!profileUser}
        onClose={() => setProfileUser(null)}
      />
    </>
  );
};

export default ChallengeDetail;
