import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getNotifications, markAllNotificationsRead, respondToChallenge, NotificationRow } from '@/services/communityService';
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

const NotificationSheet = ({ open, onClose, onNavigateToFriends, onViewChallenge }: NotificationSheetProps) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      getNotifications().then(n => { setNotifications(n); setLoading(false); });
    }
  }, [open]);

  const handleClose = () => {
    markAllNotificationsRead();
    onClose();
  };

  const handleRespondChallenge = async (challengeId: string, accept: boolean) => {
    setRespondingTo(challengeId);
    try {
      await respondToChallenge(challengeId, accept);
      toast.success(accept ? t('notifications.challengeAccepted') : t('notifications.challengeDeclined'));
      // Refresh notifications
      const updated = await getNotifications();
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
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
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
                    {isChallengeInvite && n.challenge_id && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleRespondChallenge(n.challenge_id!, true)}
                          disabled={respondingTo === n.challenge_id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          <Check className="w-3 h-3" /> {t('notifications.accept')}
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
