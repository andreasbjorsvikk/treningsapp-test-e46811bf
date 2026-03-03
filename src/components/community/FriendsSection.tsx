import { useState, useEffect } from 'react';
import { getFriends, getPendingFriendRequests, respondToFriendRequest, searchUsers, sendFriendRequest, Friend } from '@/services/communityService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Search, Check, X, UserPlus, Loader2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

interface FriendsSectionProps {
  onOpenProfile: (user: Friend) => void;
}

const FriendsSection = ({ onOpenProfile }: FriendsSectionProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<{ id: string; from: Friend; createdAt: string }[]>([]);
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [friendsList, pendingRequests] = await Promise.all([getFriends(), getPendingFriendRequests()]);
    setFriends(friendsList);
    setRequests(pendingRequests);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      const results = await searchUsers(search);
      const friendIds = new Set(friends.map(f => f.id));
      setSearchResults(results.filter(r => !friendIds.has(r.id)));
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, friends]);

  const handleAccept = async (id: string) => {
    await respondToFriendRequest(id, true);
    toast.success(t('friends.accepted'));
    loadData();
  };

  const handleDecline = async (id: string) => {
    await respondToFriendRequest(id, false);
    toast.info(t('friends.declined'));
    loadData();
  };

  const handleSendRequest = async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      toast.success(t('friends.sent'));
      setSearch('');
      setSearchResults([]);
    } catch {
      toast.error(t('friends.sendError'));
    }
  };

  const filtered = search.length >= 2
    ? friends.filter(u => (u.username || '').toLowerCase().includes(search.toLowerCase()))
    : friends;

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-3">
      {requests.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{t('friends.requests')}</p>
          {requests.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
              <Avatar className="w-8 h-8">
                {r.from.avatarUrl ? <AvatarImage src={r.from.avatarUrl} /> : null}
                <AvatarFallback className="text-xs font-medium">{(r.from.username || '?')[0]}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium">{r.from.username}</span>
              <Button size="sm" variant="default" className="h-7 px-2.5 text-xs" onClick={() => handleAccept(r.id)}>
                <Check className="w-3.5 h-3.5 mr-1" /> {t('friends.confirm')}
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => handleDecline(r.id)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('friends.searchPlaceholder')}
          className="pl-9"
        />
      </div>

      {search.length >= 2 && searchResults.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('friends.searchResults')}</p>
          {searchResults.map(u => (
            <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
              <Avatar className="w-8 h-8">
                {u.avatarUrl ? <AvatarImage src={u.avatarUrl} /> : null}
                <AvatarFallback className="text-xs font-medium">{(u.username || '?')[0]}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium">{u.username}</span>
              <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => handleSendRequest(u.id)}>
                <UserPlus className="w-3.5 h-3.5 mr-1" /> {t('friends.addFriend')}
              </Button>
            </div>
          ))}
        </div>
      )}

      {searching && <p className="text-xs text-muted-foreground text-center py-2">{t('friends.searching')}</p>}

      {filtered.length === 0 && search.length < 2 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">{t('friends.noFriends')}</p>
          <p className="text-xs mt-1">{t('friends.noFriendsDesc')}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map(u => (
            <button
              key={u.id}
              onClick={() => onOpenProfile(u)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 active:scale-[0.98] transition-all text-left"
            >
              <Avatar className="w-8 h-8">
                {u.avatarUrl ? <AvatarImage src={u.avatarUrl} /> : null}
                <AvatarFallback className="text-xs font-medium">{(u.username || '?')[0]}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium">{u.username || t('common.unknown')}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendsSection;
