import { SessionType } from '@/types/workout';

export interface MockUser {
  id: string;
  username: string;
  avatarUrl?: string;
}

export interface ChallengeParticipant {
  user: MockUser;
  progress: number;
  rank: number;
}

export type ChallengeMetric = 'sessions' | 'distance' | 'duration' | 'elevation';
export type ChallengeStatus = 'active' | 'mine' | 'archived';

export interface Challenge {
  id: string;
  name: string;
  emoji?: string;
  metric: ChallengeMetric;
  activityType: SessionType | 'all';
  target: number;
  periodStart: string;
  periodEnd: string;
  status: ChallengeStatus;
  createdBy: string;
  participants: ChallengeParticipant[];
}

export interface CommunityNotification {
  id: string;
  type: 'invite' | 'edit_approval' | 'challenge_ended';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  challengeId?: string;
}

export interface MockGroup {
  id: string;
  name: string;
  emoji: string;
  members: MockUser[];
}

export const mockUsers: MockUser[] = [
  { id: 'me', username: 'Meg' },
  { id: 'u1', username: 'Erik' },
  { id: 'u2', username: 'Silje' },
  { id: 'u3', username: 'Magnus' },
  { id: 'u4', username: 'Ingrid' },
  { id: 'u5', username: 'Lars' },
];

export const mockGroups: MockGroup[] = [
  { id: 'g1', name: 'Fjellgjengen', emoji: '⛰️', members: [mockUsers[0], mockUsers[1], mockUsers[2], mockUsers[3]] },
  { id: 'g2', name: 'Løpeklubben', emoji: '🏃', members: [mockUsers[0], mockUsers[4], mockUsers[5]] },
];

export const mockChallenges: Challenge[] = [
  {
    id: 'c1',
    name: 'Mars-mila',
    emoji: '🏔️',
    metric: 'distance',
    activityType: 'løping',
    target: 100,
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    status: 'active',
    createdBy: 'u1',
    participants: [
      { user: mockUsers[0], progress: 42, rank: 2 },
      { user: mockUsers[1], progress: 58, rank: 1 },
      { user: mockUsers[2], progress: 31, rank: 3 },
      { user: mockUsers[3], progress: 19, rank: 4 },
    ],
  },
  {
    id: 'c2',
    name: 'Ukens økter',
    emoji: '💪',
    metric: 'sessions',
    activityType: 'all',
    target: 5,
    periodStart: '2026-02-24',
    periodEnd: '2026-03-02',
    status: 'active',
    createdBy: 'me',
    participants: [
      { user: mockUsers[0], progress: 3, rank: 1 },
      { user: mockUsers[4], progress: 2, rank: 2 },
    ],
  },
  {
    id: 'c3',
    name: 'Høydemeter-duell',
    emoji: '🗻',
    metric: 'elevation',
    activityType: 'fjelltur',
    target: 5000,
    periodStart: '2026-03-01',
    periodEnd: '2026-03-31',
    status: 'mine',
    createdBy: 'me',
    participants: [
      { user: mockUsers[0], progress: 1200, rank: 1 },
      { user: mockUsers[2], progress: 800, rank: 2 },
      { user: mockUsers[5], progress: 450, rank: 3 },
    ],
  },
  {
    id: 'c4',
    name: 'Februar-challenge',
    emoji: '❄️',
    metric: 'sessions',
    activityType: 'all',
    target: 20,
    periodStart: '2026-02-01',
    periodEnd: '2026-02-28',
    status: 'archived',
    createdBy: 'u2',
    participants: [
      { user: mockUsers[2], progress: 22, rank: 1 },
      { user: mockUsers[0], progress: 18, rank: 2 },
      { user: mockUsers[1], progress: 15, rank: 3 },
    ],
  },
];

export const mockNotifications: CommunityNotification[] = [
  {
    id: 'n1',
    type: 'invite',
    title: 'Ny utfordring',
    message: 'Erik inviterte deg til «Vår-sprinten»',
    timestamp: '2026-03-01T14:30:00Z',
    read: false,
    challengeId: 'c1',
  },
  {
    id: 'n2',
    type: 'edit_approval',
    title: 'Godkjenning påkrevd',
    message: 'Silje vil endre målet i «Mars-mila» til 120 km',
    timestamp: '2026-03-01T10:00:00Z',
    read: false,
    challengeId: 'c1',
  },
  {
    id: 'n3',
    type: 'challenge_ended',
    title: 'Utfordring avsluttet',
    message: '«Februar-challenge» er ferdig. Du ble nr. 2!',
    timestamp: '2026-02-28T23:59:00Z',
    read: true,
    challengeId: 'c4',
  },
];

export const metricLabels: Record<ChallengeMetric, string> = {
  sessions: 'Økter',
  distance: 'Distanse (km)',
  duration: 'Varighet (min)',
  elevation: 'Høydemeter (m)',
};

export const metricUnits: Record<ChallengeMetric, string> = {
  sessions: '',
  distance: 'km',
  duration: 'min',
  elevation: 'm',
};

export interface LeaderboardEntry {
  user: MockUser;
  value: number;
  rank: number;
}

export const mockLeaderboard: LeaderboardEntry[] = [
  { user: mockUsers[1], value: 14, rank: 1 },
  { user: mockUsers[0], value: 11, rank: 2 },
  { user: mockUsers[2], value: 9, rank: 3 },
  { user: mockUsers[3], value: 7, rank: 4 },
  { user: mockUsers[4], value: 5, rank: 5 },
  { user: mockUsers[5], value: 3, rank: 6 },
];
