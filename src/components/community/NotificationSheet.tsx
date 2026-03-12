import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getNotifications, markAllNotificationsRead, respondToChallenge, NotificationRow } from '@/services/communityService';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Settings, Trophy, UserPlus, Loader2, Check, X, Eye } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'sonner';

interface NotificationSheetProps {
  open: boolean;
  onClose: () => void;
  onNavigateToFriends?: () => void;
  onViewChallenge?: (challengeId: string) => void;
}
const iconMap: Record<string, typeof Mail> = {
  invite: Mail,
  edit_approval: Settings,
  challenge_ended: Trophy,
  friend_request: UserPlus,
};

interface EnrichedNotification extends NotificationRow {
  currentChallengeName?: string;
  alreadyResponded?: boolean;
}

const NotificationSheet = ({ open, onClose, onNavigateToFriends, onViewChallenge }: NotificationSheetProps) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<EnrichedNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      enrichNotifications().then(n => { setNotifications(n); setLoading(false); });
    }
  }, [open]);

  const enrichNotifications = async (): Promise<EnrichedNotification[]> => {
    const raw = await getNotifications();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return raw;

    // Get unique challenge IDs from invite notifications
    const challengeIds = [...new Set(raw.filter(n => n.type === 'invite' && n.challenge_id).map(n => n.challenge_id!))];
    
    // Fetch current challenge names and user's participation status
    let challengeNameMap: Record<string, string> = {};
    let respondedChallenges = new Set<string>();

    if (challengeIds.length > 0) {
      const { data: challenges } = await supabase
        .from('challenges')
        .select('id, name')
        .in('id', challengeIds);
      challengeNameMap = Object.fromEntries((challenges || []).map(c => [c.id, c.name]));

      // Check which challenges user has already accepted (status != 'pending') or left
      const { data: participations } = await supabase
        .from('challenge_participants')
        .select('challenge_id, status')
        .eq('user_id', user.id)
        .in('challenge_id', challengeIds);
      
      for (const p of participations || []) {
        if (p.status === 'accepted' || p.status === 'declined') {
          respondedChallenges.add(p.challenge_id);
        }
      }

      // Also mark challenges where user is no longer a participant (left/declined+deleted)
      const participatedIds = new Set((participations || []).map(p => p.challenge_id));
      for (const cid of challengeIds) {
        if (!participatedIds.has(cid)) {
          respondedChallenges.add(cid); // user was removed or left
        }
      }
    }

    return raw.map(n => ({
      ...n,
      currentChallengeName: n.challenge_id ? challengeNameMap[n.challenge_id] : undefined,
      alreadyResponded: n.type === 'invite' && n.challenge_id ? respondedChallenges.has(n.challenge_id) : false,
    }));
  };

  const handleClose = () => {
    markAllNotificationsRead();
    onClose();
  };

  const handleRespondChallenge = async (challengeId: string, accept: boolean) => {
    setRespondingTo(challengeId);
    try {
      await respondToChallenge(challengeId, accept);
      toast.success(accept ? t('notifications.challengeAccepted') : t('notifications.challengeDeclined'));
      const updated = await enrichNotifications();
      setNotifications(updated);
    } catch {
      toast.error(t('notifications.respondError'));
    }
    setRespondingTo(null);
  };

  const getTimeAgo = (ts: string): string => {
    const diff = Date.now() - new Date(ts).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return t('notifications.justNow');
    if (hours < 24) return t('notifications.hoursAgo', { n: hours });
    const days = Math.floor(hours / 24);
    return t('notifications.daysAgo', { n: days });
  };

  // Build display message, replacing old challenge name with current one
  const getDisplayMessage = (n: EnrichedNotification): string => {
    if (n.type === 'invite' && n.currentChallengeName && n.challenge_id) {
      // Replace the old name in the message with the current name
      const match = n.message.match(/«(.+?)»/);
      if (match && match[1] !== n.currentChallengeName) {
        return n.message.replace(`«${match[1]}»`, `«${n.currentChallengeName}»`);
      }
    }
    return n.message;
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{t('notifications.title')}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('notifications.none')}</p>
          ) : (
            notifications.map(n => {
              const Icon = iconMap[n.type] || Mail;
              const timeAgo = getTimeAgo(n.created_at);
              const isFriendRequest = n.type === 'friend_request';
              const isChallengeInvite = n.type === 'invite';
              const showActions = isChallengeInvite && n.challenge_id && !n.alreadyResponded;
              return (
                <div
                  key={n.id}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    n.read ? 'bg-secondary/30' : 'bg-accent/5 border border-accent/20'
                  }`}
                >
                  <div className={`p-1.5 rounded-md shrink-0 ${n.read ? 'bg-secondary' : 'bg-accent/10'}`}>
                    <Icon className={`w-4 h-4 ${n.read ? 'text-muted-foreground' : 'text-accent'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{getDisplayMessage(n)}</p>
                    {isFriendRequest && (
                      <button
                        onClick={() => {
                          handleClose();
                          setTimeout(() => onNavigateToFriends?.(), 150);
                        }}
                        className="text-[10px] text-primary mt-1 font-medium hover:underline"
                      >
                        {t('notifications.tapToSee')}
                      </button>
                    )}
                    {showActions && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => {
                            handleClose();
                            setTimeout(() => onViewChallenge?.(n.challenge_id!), 150);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                        >
                          <Eye className="w-3 h-3" /> {t('notifications.viewChallenge')}
                        </button>
                        <button
                          onClick={() => handleRespondChallenge(n.challenge_id!, false)}
                          disabled={respondingTo === n.challenge_id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                        >
                          <X className="w-3 h-3" /> {t('notifications.decline')}
                        </button>
                      </div>
                    )}
                    {isChallengeInvite && n.alreadyResponded && (
                      <p className="text-[10px] text-muted-foreground/60 mt-1 italic">{t('notifications.alreadyResponded')}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationSheet;