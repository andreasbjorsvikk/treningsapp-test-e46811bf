import { useState } from 'react';
import CommunitySubTabs from '@/components/community/CommunitySubTabs';
import ChallengeCard from '@/components/community/ChallengeCard';
import ChallengeDetail from '@/components/community/ChallengeDetail';
import ChallengeForm from '@/components/community/ChallengeForm';
import LeaderboardSection from '@/components/community/LeaderboardSection';
import FriendsSection from '@/components/community/FriendsSection';
import UserProfileDrawer from '@/components/community/UserProfileDrawer';
import NotificationBell from '@/components/community/NotificationBell';
import NotificationSheet from '@/components/community/NotificationSheet';
import { mockChallenges, Challenge, MockUser } from '@/data/mockCommunity';
import { Plus } from 'lucide-react';

const mainTabs = [
  { id: 'challenges', label: 'Utfordringer' },
  { id: 'leaderboard', label: 'Ledertavle' },
  { id: 'friends', label: 'Venner' },
];

const challengeFilterTabs = [
  { id: 'active', label: 'Aktive' },
  { id: 'mine', label: 'Mine' },
  { id: 'archived', label: 'Arkiv' },
];

const CommunityPage = () => {
  const [mainTab, setMainTab] = useState('challenges');
  const [challengeFilter, setChallengeFilter] = useState('active');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileUser, setProfileUser] = useState<MockUser | null>(null);
  const [preselectedUser, setPreselectedUser] = useState<MockUser | null>(null);

  const filteredChallenges = mockChallenges.filter(c => {
    if (challengeFilter === 'active') return c.status === 'active';
    if (challengeFilter === 'mine') return c.status === 'mine' || c.createdBy === 'me';
    if (challengeFilter === 'archived') return c.status === 'archived';
    return true;
  });

  const handleInviteToChallenge = (user: MockUser) => {
    setProfileUser(null);
    setPreselectedUser(user);
    setTimeout(() => setShowForm(true), 200);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Fellesskap
        </h2>
        <NotificationBell onClick={() => setShowNotifications(true)} />
      </div>

      {/* Main tabs */}
      <CommunitySubTabs tabs={mainTabs} active={mainTab} onChange={setMainTab} />

      {mainTab === 'challenges' && (
        <>
          <CommunitySubTabs tabs={challengeFilterTabs} active={challengeFilter} onChange={setChallengeFilter} />

          <button
            onClick={() => { setPreselectedUser(null); setShowForm(true); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> Ny utfordring
          </button>

          <div className="space-y-2">
            {filteredChallenges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Ingen utfordringer her ennå</p>
              </div>
            ) : (
              filteredChallenges.map(c => (
                <ChallengeCard key={c.id} challenge={c} onClick={setSelectedChallenge} />
              ))
            )}
          </div>
        </>
      )}

      {mainTab === 'leaderboard' && <LeaderboardSection />}

      {mainTab === 'friends' && (
        <FriendsSection onOpenProfile={setProfileUser} />
      )}

      {/* Drawers / Dialogs */}
      <ChallengeDetail
        challenge={selectedChallenge}
        open={!!selectedChallenge}
        onClose={() => setSelectedChallenge(null)}
      />
      <ChallengeForm
        open={showForm}
        onClose={() => { setShowForm(false); setPreselectedUser(null); }}
        preselectedUser={preselectedUser}
      />
      <NotificationSheet open={showNotifications} onClose={() => setShowNotifications(false)} />
      <UserProfileDrawer
        user={profileUser}
        open={!!profileUser}
        onClose={() => setProfileUser(null)}
        onInviteToChallenge={handleInviteToChallenge}
      />
    </div>
  );
};

export default CommunityPage;
