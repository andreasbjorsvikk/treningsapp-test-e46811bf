import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ChevronRight, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface UserStats {
  totalSessions: number;
  totalCheckins: number;
  totalGoals: number;
  totalFriends: number;
}

const AdminUsersTab = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, created_at')
        .order('created_at', { ascending: false });
      setUsers(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const openUser = async (user: UserProfile) => {
    setSelectedUser(user);
    setLoadingStats(true);
    
    const [sessions, checkins, goals, friendships] = await Promise.all([
      supabase.from('workout_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('peak_checkins').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('goals').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('friendships').select('id', { count: 'exact', head: true }).or(`user_id.eq.${user.id},friend_id.eq.${user.id}`).eq('status', 'accepted'),
    ]);

    setUserStats({
      totalSessions: sessions.count || 0,
      totalCheckins: checkins.count || 0,
      totalGoals: goals.count || 0,
      totalFriends: friendships.count || 0,
    });
    setLoadingStats(false);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{users.length} brukere totalt</p>
      {users.map(user => (
        <button
          key={user.id}
          onClick={() => openUser(user)}
          className="w-full flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-all text-left"
        >
          <Avatar className="w-8 h-8">
            {user.avatar_url ? <AvatarImage src={user.avatar_url} /> : null}
            <AvatarFallback className="text-xs font-medium">
              {(user.username || '?')[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.username || 'Uten navn'}</p>
            <p className="text-[10px] text-muted-foreground">
              Opprettet {new Date(user.created_at).toLocaleDateString('nb-NO')}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ))}

      <Sheet open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <SheetContent side="bottom" className="max-h-[75vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left">Brukerdetaljer</SheetTitle>
          </SheetHeader>
          {selectedUser && (
            <div className="space-y-4 pb-6">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  {selectedUser.avatar_url ? <AvatarImage src={selectedUser.avatar_url} /> : null}
                  <AvatarFallback className="text-sm font-bold">
                    {(selectedUser.username || '?')[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{selectedUser.username || 'Uten navn'}</p>
                  <p className="text-xs text-muted-foreground">
                    Registrert {new Date(selectedUser.created_at).toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground font-mono break-all">ID: {selectedUser.id}</p>

              {loadingStats ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : userStats ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{userStats.totalSessions}</p>
                    <p className="text-xs text-muted-foreground">Økter</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{userStats.totalCheckins}</p>
                    <p className="text-xs text-muted-foreground">Fjelltopp-innsj.</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{userStats.totalGoals}</p>
                    <p className="text-xs text-muted-foreground">Mål</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">{userStats.totalFriends}</p>
                    <p className="text-xs text-muted-foreground">Venner</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminUsersTab;
