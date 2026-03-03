import { Friend } from '@/services/communityService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from '@/components/ui/drawer';
import { Swords } from 'lucide-react';

interface UserProfileDrawerProps {
  user: Friend | null;
  open: boolean;
  onClose: () => void;
  onInviteToChallenge?: (user: Friend) => void;
}

const UserProfileDrawer = ({ user, open, onClose, onInviteToChallenge }: UserProfileDrawerProps) => {
  if (!user) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <div className="overflow-y-auto scrollbar-hide pb-4">
          <DrawerHeader className="text-center">
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

            <p className="text-sm text-muted-foreground text-center py-4">
              Mer profildata kommer snart
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default UserProfileDrawer;
