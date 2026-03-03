import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { mockNotifications } from '@/data/mockCommunity';
import { Mail, Settings, Trophy, UserPlus } from 'lucide-react';

interface NotificationSheetProps {
  open: boolean;
  onClose: () => void;
  onNavigateToFriends?: () => void;
}

const iconMap = {
  invite: Mail,
  edit_approval: Settings,
  challenge_ended: Trophy,
  friend_request: UserPlus,
};

const NotificationSheet = ({ open, onClose, onNavigateToFriends }: NotificationSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Varsler</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {mockNotifications.map(n => {
            const Icon = iconMap[n.type];
            const timeAgo = getTimeAgo(n.timestamp);
            const isFriendRequest = n.type === 'friend_request';
            return (
              <button
                key={n.id}
                onClick={() => {
                  if (isFriendRequest && onNavigateToFriends) {
                    onClose();
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
                    <p className="text-[10px] text-primary mt-1 font-medium">Trykk for å se forespørsel →</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">{timeAgo}</p>
                </div>
              </button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

function getTimeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Akkurat nå';
  if (hours < 24) return `${hours}t siden`;
  const days = Math.floor(hours / 24);
  return `${days}d siden`;
}

export default NotificationSheet;
