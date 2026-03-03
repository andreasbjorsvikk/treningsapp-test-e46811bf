import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getNotifications, markAllNotificationsRead, NotificationRow } from '@/services/communityService';
import { Mail, Settings, Trophy, UserPlus, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface NotificationSheetProps {
  open: boolean;
  onClose: () => void;
  onNavigateToFriends?: () => void;
}

const iconMap: Record<string, typeof Mail> = {
  invite: Mail,
  edit_approval: Settings,
  challenge_ended: Trophy,
  friend_request: UserPlus,
};

const NotificationSheet = ({ open, onClose, onNavigateToFriends }: NotificationSheetProps) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

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
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (isFriendRequest && onNavigateToFriends) {
                      handleClose();
                      setTimeout(() => onNavigateToFriends(), 150);
                    }
                  }}
                  className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    n.read ? 'bg-secondary/30' : 'bg-accent/5 border border-accent/20'
                  } ${isFriendRequest ? 'hover:bg-secondary/50 cursor-pointer' : ''}`}
                >
                  <div className={`p-1.5 rounded-md shrink-0 ${n.read ? 'bg-secondary' : 'bg-accent/10'}`}>
                    <Icon className={`w-4 h-4 ${n.read ? 'text-muted-foreground' : 'text-accent'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    {isFriendRequest && (
                      <p className="text-[10px] text-primary mt-1 font-medium">{t('notifications.tapToSee')}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationSheet;
