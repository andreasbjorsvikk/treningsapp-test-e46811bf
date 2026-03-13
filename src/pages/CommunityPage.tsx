import { useState, useEffect, useCallback } from 'react';
import CommunitySubTabs from '@/components/community/CommunitySubTabs';
import ChallengeCard from '@/components/community/ChallengeCard';
import ChallengeDetail from '@/components/community/ChallengeDetail';
import ChallengeForm from '@/components/community/ChallengeForm';
import LeaderboardSection from '@/components/community/LeaderboardSection';
import FriendsSection from '@/components/community/FriendsSection';
import UserProfileDrawer from '@/components/community/UserProfileDrawer';
import NotificationBell from '@/components/community/NotificationBell';
import NotificationSheet from '@/components/community/NotificationSheet';
import CommunityTutorial from '@/components/community/CommunityTutorial';
import AdminUsersTab from '@/components/community/AdminUsersTab';
import { getChallenges, getChallengeParticipants, getChallengeProgress, getNotifications, getUnreadNotificationCount, ChallengeRow, Friend } from '@/services/communityService';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2 } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

export interface ChallengeWithParticipants {
  challenge: ChallengeRow;
  participants: { userId: string; username: string; avatarUrl: string | null; progress: number; rank: number; status: string }[];
}

const CommunityPage = () => {
  const { user } = useAuth();
  const { adminMode } = useAdmin();
  const { t } = useTranslation();

  const mainTabs = [
    { id: 'challenges', label: t('community.challenges') },
    { id: 'leaderboard', label: t('community.leaderboard') },
    { id: 'friends', label: t('community.friends') },
    ...(adminMode ? [{ id: 'users', label: 'Alle brukere' }] : []),
  ];

  const challengeFilterTabs = [
    { id: 'active', label: t('community.active') },
    { id: 'mine', label: t('community.mine') },
    { id: 'archived', label: t('community.archived') },
  ];
  const [mainTab, setMainTab] = useState('challenges');
  const [challengeFilter, setChallengeFilter] = useState('active');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeWithParticipants | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editChallenge, setEditChallenge] = useState<ChallengeWithParticipants | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileUser, setProfileUser] = useState<Friend | null>(null);
  const [preselectedUser, setPreselectedUser] = useState<Friend | null>(null);
  const [challenges, setChallenges] = useState<ChallengeWithParticipants[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadChallenges = useCallback(async () => {
    setLoading(true);
    const raw = await getChallenges();
    const enriched: ChallengeWithParticipants[] = [];

    for (const c of raw) {
      const parts = await getChallengeParticipants(c.id);
      const allUserIds = parts.map(p => p.user_id);

      // Get profiles for ALL participants
      const { data: profiles } = await supabase.from('profiles').select('id, username, avatar_url').in('id', allUserIds.length > 0 ? allUserIds : ['none']);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Get progress for ALL participants (so pending users also see their stats)
      const progress = allUserIds.length > 0 ? await getChallengeProgress(c, allUserIds) : {};
      const participantData = parts.map(p => {
        const profile = profileMap.get(p.user_id);
        return {
          userId: p.user_id,
          username: profile?.username || 'Ukjent',
          avatarUrl: profile?.avatar_url || null,
          progress: progress[p.user_id] || 0,
          rank: 0,
          status: p.status,
        };
      }).sort((a, b) => b.progress - a.progress);

      participantData.forEach((p, i) => { p.rank = i + 1; });

      enriched.push({ challenge: c, participants: participantData });
    }

    setChallenges(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { loadChallenges(); }, [loadChallenges]);

  useEffect(() => {
    getUnreadNotificationCount().then(setUnreadCount);
  }, []);

  const filteredChallenges = challenges.filter(c => {
    const now = new Date().toISOString().split('T')[0];
    const isEnded = c.challenge.period_end < now;
    const isMine = c.challenge.created_by === user?.id;
    
    // Check if user has accepted the challenge (not pending)
    const myParticipant = c.participants.find(p => p.userId === user?.id);
    const isAccepted = isMine || myParticipant?.status === 'accepted';

    if (challengeFilter === 'active') return !isEnded && isAccepted;
    if (challengeFilter === 'mine') return isMine && !isEnded;
    if (challengeFilter === 'archived') return isEnded && isAccepted;
    return true;
  });

  const handleInviteToChallenge = (friend: Friend) => {
    setProfileUser(null);
    setPreselectedUser(friend);
    setTimeout(() => setShowForm(true), 200);
  };

  const handleNavigateToFriends = () => {
    setMainTab('friends');
  };

  const handleViewChallenge = (challengeId: string) => {
    setMainTab('challenges');
    const found = challenges.find(c => c.challenge.id === challengeId);
    if (found) {
      setSelectedChallenge(found);
    }
  };

  const handleSelectChallenge = (cWithP: ChallengeWithParticipants) => {
    setSelectedChallenge(cWithP);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          {t('community.title')}
        </h2>
        <NotificationBell onClick={() => setShowNotifications(true)} count={unreadCount} />
      </div>

      {/* Main tabs */}
      <CommunitySubTabs tabs={mainTabs} active={mainTab} onChange={setMainTab} />

      {mainTab === 'challenges' && (
        <>
          <div className="flex gap-1 mb-3">
            {challengeFilterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setChallengeFilter(tab.id)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  challengeFilter === tab.id ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setPreselectedUser(null); setShowForm(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> {t('community.newChallenge')}
          </button>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-2">
              {filteredChallenges.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">{t('community.noChallenges')}</p>
                </div>
              ) : (
                filteredChallenges.map(c => (
                  <ChallengeCard
                    key={c.challenge.id}
                    challenge={c}
                    onClick={() => handleSelectChallenge(c)}
                    onEdit={(ch) => { setEditChallenge(ch); setShowForm(true); }}
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {mainTab === 'leaderboard' && <LeaderboardSection />}

      {mainTab === 'friends' && (
        <FriendsSection onOpenProfile={setProfileUser} />
      )}

      {mainTab === 'users' && adminMode && (
        <AdminUsersTab />
      )}

      {/* Drawers / Dialogs */}
      <ChallengeDetail
        challenge={selectedChallenge}
        open={!!selectedChallenge}
        onClose={() => setSelectedChallenge(null)}
        onEdit={(ch) => { setSelectedChallenge(null); setEditChallenge(ch); setTimeout(() => setShowForm(true), 200); }}
        onResponded={loadChallenges}
      />
      <ChallengeForm
        open={showForm}
        onClose={() => { setShowForm(false); setPreselectedUser(null); setEditChallenge(null); }}
        preselectedUser={preselectedUser}
        editChallenge={editChallenge}
        onCreated={loadChallenges}
      />
      <NotificationSheet
        open={showNotifications}
        onClose={() => { setShowNotifications(false); getUnreadNotificationCount().then(setUnreadCount); }}
        onNavigateToFriends={handleNavigateToFriends}
        onViewChallenge={handleViewChallenge}
      />
      <UserProfileDrawer
        user={profileUser}
        open={!!profileUser}
        onClose={() => setProfileUser(null)}
        onInviteToChallenge={handleInviteToChallenge}
      />
      <CommunityTutorial />
    </div>
  );
};

export default CommunityPage;
