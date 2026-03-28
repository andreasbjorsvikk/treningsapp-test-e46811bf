import { supabase } from '@/integrations/supabase/client';

export interface Friend {
  id: string;
  username: string | null;
  avatarUrl: string | null;
}

export interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
}

export interface ChallengeRow {
  id: string;
  name: string;
  emoji: string | null;
  metric: string;
  activity_type: string;
  target: number;
  period_start: string;
  period_end: string;
  created_by: string;
  created_at: string;
}

export interface ChallengeParticipantRow {
  id: string;
  challenge_id: string;
  user_id: string;
  status: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  challenge_id: string | null;
  from_user_id: string | null;
  created_at: string;
}

// ===== FRIENDS =====

export async function getFriends(): Promise<Friend[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: friendships } = await supabase
    .from('friendships')
    .select('*')
    .eq('status', 'accepted');

  if (!friendships || friendships.length === 0) return [];

  const friendIds = friendships.map(f =>
    f.user_id === user.id ? f.friend_id : f.user_id
  );

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', friendIds);

  return (profiles || []).map(p => ({
    id: p.id,
    username: p.username,
    avatarUrl: p.avatar_url,
  }));
}

export async function getPendingFriendRequests(): Promise<{ id: string; from: Friend; createdAt: string }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: pending } = await supabase
    .from('friendships')
    .select('*')
    .eq('friend_id', user.id)
    .eq('status', 'pending');

  if (!pending || pending.length === 0) return [];

  const userIds = pending.map(p => p.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);

  const profileMap = new Map((profiles || []).map(p => [p.id, p]));

  return pending.map(p => {
    const profile = profileMap.get(p.user_id);
    return {
      id: p.id,
      from: {
        id: p.user_id,
        username: profile?.username || 'Ukjent',
        avatarUrl: profile?.avatar_url || null,
      },
      createdAt: p.created_at,
    };
  });
}

export async function sendFriendRequest(friendId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase.from('friendships').insert({
    user_id: user.id,
    friend_id: friendId,
    status: 'pending',
  });
  if (error) throw error;

  // Create notification for the friend
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
  await supabase.from('community_notifications').insert({
    user_id: friendId,
    type: 'friend_request',
    title: 'Venneforespørsel',
    message: `${profile?.username || 'Noen'} vil bli vennen din`,
    from_user_id: user.id,
  });
}

export async function respondToFriendRequest(friendshipId: string, accept: boolean) {
  const { error } = await supabase.from('friendships')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', friendshipId);
  if (error) throw error;
}

export async function removeFriend(friendId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('friendships')
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
}

// ===== CHALLENGES =====

export async function getChallenges() {
  const { data } = await supabase
    .from('challenges')
    .select('*')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getChallengeParticipants(challengeId: string) {
  const { data } = await supabase
    .from('challenge_participants')
    .select('*')
    .eq('challenge_id', challengeId);
  return data || [];
}

export async function createChallenge(challenge: {
  name: string;
  emoji?: string;
  metric: string;
  activityType: string;
  target: number;
  periodStart: string;
  periodEnd: string;
  invitedUserIds: string[];
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: newChallenge, error } = await supabase.from('challenges').insert({
    name: challenge.name,
    emoji: challenge.emoji || null,
    metric: challenge.metric,
    activity_type: challenge.activityType,
    target: challenge.target,
    period_start: challenge.periodStart,
    period_end: challenge.periodEnd,
    created_by: user.id,
  }).select().single();

  if (error || !newChallenge) throw error || new Error('Failed to create challenge');

  // Add creator as participant
  await supabase.from('challenge_participants').insert({
    challenge_id: newChallenge.id,
    user_id: user.id,
    status: 'accepted',
  });

  // Invite friends
  for (const friendId of challenge.invitedUserIds) {
    await supabase.from('challenge_participants').insert({
      challenge_id: newChallenge.id,
      user_id: friendId,
      status: 'pending',
    });

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    await supabase.from('community_notifications').insert({
      user_id: friendId,
      type: 'invite',
      title: 'Ny utfordring',
      message: `${profile?.username || 'Noen'} inviterte deg til «${challenge.name}»`,
      challenge_id: newChallenge.id,
      from_user_id: user.id,
    });
  }

  return newChallenge;
}

export async function respondToChallenge(challengeId: string, accept: boolean) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (accept) {
    await supabase.from('challenge_participants')
      .update({ status: 'accepted' })
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id);
  } else {
    // Delete the participant row so user disappears for everyone
    await supabase.from('challenge_participants')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('user_id', user.id);
  }
}

export async function deleteChallenge(challengeId: string) {
  // Delete participants first, then challenge
  await supabase.from('challenge_participants').delete().eq('challenge_id', challengeId);
  await supabase.from('community_notifications').delete().eq('challenge_id', challengeId);
  await supabase.from('challenges').delete().eq('id', challengeId);
}

export async function updateChallenge(challengeId: string, updates: {
  name: string;
  emoji?: string;
  metric: string;
  activityType: string;
  target: number;
  periodStart: string;
  periodEnd: string;
  newInvitedUserIds?: string[];
}) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('challenges').update({
    name: updates.name,
    emoji: updates.emoji || null,
    metric: updates.metric,
    activity_type: updates.activityType,
    target: updates.target,
    period_start: updates.periodStart,
    period_end: updates.periodEnd,
  }).eq('id', challengeId);
  if (error) throw error;

  // Invite new participants
  if (updates.newInvitedUserIds && updates.newInvitedUserIds.length > 0 && user) {
    const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
    const { data: challenge } = await supabase.from('challenges').select('name').eq('id', challengeId).single();
    for (const friendId of updates.newInvitedUserIds) {
      // Try to create a fresh pending participant row.
      // If the user already has a row (e.g. declined previously), we still send a new notification
      // and let the invited user accept directly from notifications.
      await supabase.from('challenge_participants').insert({
        challenge_id: challengeId,
        user_id: friendId,
        status: 'pending',
      });
      await supabase.from('community_notifications').insert({
        user_id: friendId,
        type: 'invite',
        title: 'Ny utfordring',
        message: `${profile?.username || 'Noen'} inviterte deg til «${challenge?.name || ''}»`,
        challenge_id: challengeId,
        from_user_id: user.id,
      });
    }
  }
}

export async function leaveChallenge(challengeId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  await supabase.from('challenge_participants')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('user_id', user.id);
}

// ===== NOTIFICATIONS =====

export async function getNotifications() {
  const { data } = await supabase
    .from('community_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function markNotificationRead(id: string) {
  await supabase.from('community_notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('community_notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count } = await supabase
    .from('community_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('read', false);
  return count || 0;
}

// ===== SEARCH USERS =====

export async function searchUsers(query: string): Promise<Friend[]> {
  if (!query || query.length < 2) return [];

  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url')
    .ilike('username', `%${query}%`)
    .limit(10);

  const { data: { user } } = await supabase.auth.getUser();
  return (data || [])
    .filter(p => p.id !== user?.id)
    .map(p => ({ id: p.id, username: p.username, avatarUrl: p.avatar_url }));
}

// ===== LEADERBOARD =====

export type LeaderboardMetric = 'sessions' | 'distance' | 'duration' | 'elevation';

export async function getLeaderboard(period: 'week' | 'month' | 'all' = 'month', metric: LeaderboardMetric = 'sessions', activityType: string = 'all') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get friend IDs
  const friends = await getFriends();
  const userIds = [user.id, ...friends.map(f => f.id)];

  let query = supabase.from('workout_sessions').select('user_id, duration_minutes, distance, elevation_gain, type');

  const now = new Date();
  if (period === 'week') {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
    query = query.gte('date', monday.toISOString());
  } else if (period === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    query = query.gte('date', monthStart.toISOString());
  } else {
    // 'all' = current year only
    const yearStart = new Date(now.getFullYear(), 0, 1);
    query = query.gte('date', yearStart.toISOString());
  }

  query = query.in('user_id', userIds);
  
  // Filter by activity type if specified
  if (activityType !== 'all') {
    query = query.eq('type', activityType);
  }
  
  const { data: sessions } = await query;

  // Aggregate by user based on selected metric
  const userValues: Record<string, number> = {};
  for (const s of sessions || []) {
    let val = 0;
    switch (metric) {
      case 'sessions': val = 1; break;
      case 'distance': val = s.distance || 0; break;
      case 'duration': val = s.duration_minutes || 0; break;
      case 'elevation': val = s.elevation_gain || 0; break;
    }
    userValues[s.user_id] = (userValues[s.user_id] || 0) + val;
  }

  const allProfiles = [
    { id: user.id, username: 'Meg', avatarUrl: null as string | null },
    ...friends,
  ];

  return allProfiles
    .map(p => ({ user: p, value: Math.round(userValues[p.id] * 10) / 10 || 0 }))
    .sort((a, b) => b.value - a.value)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

// ===== CHALLENGE PROGRESS =====

export async function getChallengeProgress(challenge: ChallengeRow, participantUserIds: string[]) {
  let query = supabase.from('workout_sessions')
    .select('user_id, duration_minutes, distance, elevation_gain, exclude_from_count')
    .in('user_id', participantUserIds)
    .gte('date', challenge.period_start)
    .lte('date', challenge.period_end);

  if (challenge.activity_type !== 'all') {
    if (challenge.activity_type.includes(',')) {
      query = query.in('type', challenge.activity_type.split(','));
    } else {
      query = query.eq('type', challenge.activity_type);
    }
  }

  const { data: sessions } = await query;

  const progress: Record<string, number> = {};
  for (const uid of participantUserIds) progress[uid] = 0;

  for (const s of sessions || []) {
    switch (challenge.metric) {
      case 'sessions':
        if (!s.exclude_from_count) progress[s.user_id] = (progress[s.user_id] || 0) + 1;
        break;
      case 'distance':
        progress[s.user_id] = (progress[s.user_id] || 0) + (s.distance || 0);
        break;
      case 'duration':
        progress[s.user_id] = (progress[s.user_id] || 0) + (s.duration_minutes || 0);
        break;
      case 'elevation':
        progress[s.user_id] = (progress[s.user_id] || 0) + (s.elevation_gain || 0);
        break;
    }
  }

  return progress;
}
