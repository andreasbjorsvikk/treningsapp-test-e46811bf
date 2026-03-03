import { useState } from 'react';
import { mockUsers, mockFriendRequests, MockUser, FriendRequest } from '@/data/mockCommunity';
import { Input } from '@/components/ui/input';
import { Search, Link2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface FriendsSectionProps {
  onOpenProfile: (user: MockUser) => void;
}

const FriendsSection = ({ onOpenProfile }: FriendsSectionProps) => {
  const [search, setSearch] = useState('');
  const [requests, setRequests] = useState<FriendRequest[]>(mockFriendRequests.filter(r => r.status === 'pending'));
  const friends = mockUsers.filter(u => u.id !== 'me');
  const filtered = search
    ? friends.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))
    : friends;

  const handleCopyInvite = () => {
    navigator.clipboard.writeText('https://treningsapp.no/invite/abc123');
    toast.success('Invitasjonslenke kopiert!');
  };

  const handleAccept = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
    toast.success('Venneforespørsel godtatt!');
  };

  const handleDecline = (id: string) => {
    setRequests(prev => prev.filter(r => r.id !== id));
    toast.info('Venneforespørsel avslått');
  };

  return (
    <div className="space-y-3">
      {/* Friend requests */}
      {requests.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Venneforespørsler</p>
          {requests.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
              <div className="w-8 h-8 rounded-full bg-secondary border border-background flex items-center justify-center shrink-0">
                <span className="text-xs font-medium">{r.from.username[0]}</span>
              </div>
              <span className="flex-1 text-sm font-medium">{r.from.username}</span>
              <Button size="sm" variant="default" className="h-7 px-2.5 text-xs" onClick={() => handleAccept(r.id)}>
                <Check className="w-3.5 h-3.5 mr-1" /> Bekreft
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => handleDecline(r.id)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

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
