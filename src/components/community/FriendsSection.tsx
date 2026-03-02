import { useState } from 'react';
import { mockUsers, MockUser } from '@/data/mockCommunity';
import { Input } from '@/components/ui/input';
import { Search, UserPlus, Link2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface FriendsSectionProps {
  onOpenProfile: (user: MockUser) => void;
}

const FriendsSection = ({ onOpenProfile }: FriendsSectionProps) => {
  const [search, setSearch] = useState('');
  const friends = mockUsers.filter(u => u.id !== 'me');
  const filtered = search
    ? friends.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
    : friends;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText('https://treningsapp.no/invite/abc123');
    toast.success('Invitasjonslenke kopiert!');
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Søk etter brukernavn..."
          className="pl-9"
        />
      </div>

      {/* Invite link */}
      <button
        onClick={handleCopyInvite}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
      >
        <Link2 className="w-4 h-4" /> Inviter med lenke
      </button>

      {/* Friends list */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Ingen venner funnet</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(u => (
            <button
              key={u.id}
              onClick={() => onOpenProfile(u)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-secondary border border-background flex items-center justify-center shrink-0">
                <span className="text-xs font-medium">{u.username[0]}</span>
              </div>
              <span className="flex-1 text-sm font-medium">{u.username}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendsSection;
