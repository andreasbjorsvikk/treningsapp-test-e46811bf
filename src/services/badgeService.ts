import { supabase } from '@/integrations/supabase/client';

// Badge images
import badge10 from '@/assets/badges/10_topper.png';
import badge20 from '@/assets/badges/20_topper.png';
import badge50 from '@/assets/badges/50_topper.png';
import badge100 from '@/assets/badges/100_topper.png';
import badge200 from '@/assets/badges/200_topper.png';

export type BadgeCategory = 'topper' | 'fjellmerker' | 'trening';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface BadgeDefinition {
  id: string;
  category: BadgeCategory;
  nameKey: string;
  descriptionKey: string;
  requirementKey: string;
  threshold: number;
  rarity: BadgeRarity;
  emoji: string;
  image?: string; // optional image path
  sortOrder: number;
  repeatable?: boolean; // can be achieved multiple times
}

export interface UserBadge {
  badge: BadgeDefinition;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  repeatCount?: number; // how many times achieved (for repeatable badges)
}

// All badge definitions
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ── Topper badges (unique peaks) ──
  { id: 'peaks_10', category: 'topper', nameKey: 'badge.peaks10', descriptionKey: 'badge.peaks10Desc', requirementKey: 'badge.peaks10Req', threshold: 10, rarity: 'common', emoji: '⛰️', image: badge10, sortOrder: 1 },
  { id: 'peaks_20', category: 'topper', nameKey: 'badge.peaks20', descriptionKey: 'badge.peaks20Desc', requirementKey: 'badge.peaks20Req', threshold: 20, rarity: 'uncommon', emoji: '🏔️', image: badge20, sortOrder: 2 },
  { id: 'peaks_50', category: 'topper', nameKey: 'badge.peaks50', descriptionKey: 'badge.peaks50Desc', requirementKey: 'badge.peaks50Req', threshold: 50, rarity: 'rare', emoji: '🗻', image: badge50, sortOrder: 3 },
  { id: 'peaks_100', category: 'topper', nameKey: 'badge.peaks100', descriptionKey: 'badge.peaks100Desc', requirementKey: 'badge.peaks100Req', threshold: 100, rarity: 'epic', emoji: '🏆', image: badge100, sortOrder: 4 },
  { id: 'peaks_200', category: 'topper', nameKey: 'badge.peaks200', descriptionKey: 'badge.peaks200Desc', requirementKey: 'badge.peaks200Req', threshold: 200, rarity: 'legendary', emoji: '👑', image: badge200, sortOrder: 5 },

  // ── Fjellmerker badges ──
  { id: 'high_peak_1', category: 'fjellmerker', nameKey: 'badge.highPeak1', descriptionKey: 'badge.highPeak1Desc', requirementKey: 'badge.highPeak1Req', threshold: 1, rarity: 'uncommon', emoji: '🏔️', sortOrder: 1 },
  { id: 'high_peak_5', category: 'fjellmerker', nameKey: 'badge.highPeak5', descriptionKey: 'badge.highPeak5Desc', requirementKey: 'badge.highPeak5Req', threshold: 5, rarity: 'rare', emoji: '🗻', sortOrder: 2 },
  { id: 'high_peak_10', category: 'fjellmerker', nameKey: 'badge.highPeak10', descriptionKey: 'badge.highPeak10Desc', requirementKey: 'badge.highPeak10Req', threshold: 10, rarity: 'epic', emoji: '🦅', sortOrder: 3 },
  { id: 'checkins_3_day', category: 'fjellmerker', nameKey: 'badge.checkins3Day', descriptionKey: 'badge.checkins3DayDesc', requirementKey: 'badge.checkins3DayReq', threshold: 3, rarity: 'uncommon', emoji: '⚡', sortOrder: 4, repeatable: true },
  { id: 'checkins_5_day', category: 'fjellmerker', nameKey: 'badge.checkins5Day', descriptionKey: 'badge.checkins5DayDesc', requirementKey: 'badge.checkins5DayReq', threshold: 5, rarity: 'rare', emoji: '🔥', sortOrder: 5, repeatable: true },
  { id: 'streak_3', category: 'fjellmerker', nameKey: 'badge.streak3', descriptionKey: 'badge.streak3Desc', requirementKey: 'badge.streak3Req', threshold: 3, rarity: 'uncommon', emoji: '📅', sortOrder: 6, repeatable: true },
  { id: 'streak_5', category: 'fjellmerker', nameKey: 'badge.streak5', descriptionKey: 'badge.streak5Desc', requirementKey: 'badge.streak5Req', threshold: 5, rarity: 'rare', emoji: '🗓️', sortOrder: 7, repeatable: true },
  { id: 'streak_10', category: 'fjellmerker', nameKey: 'badge.streak10', descriptionKey: 'badge.streak10Desc', requirementKey: 'badge.streak10Req', threshold: 10, rarity: 'epic', emoji: '🏅', sortOrder: 8, repeatable: true },

  // ── Trening badges (total sessions since signup) ──
  { id: 'sessions_10', category: 'trening', nameKey: 'badge.sessions10', descriptionKey: 'badge.sessions10Desc', requirementKey: 'badge.sessions10Req', threshold: 10, rarity: 'common', emoji: '💪', sortOrder: 1 },
  { id: 'sessions_50', category: 'trening', nameKey: 'badge.sessions50', descriptionKey: 'badge.sessions50Desc', requirementKey: 'badge.sessions50Req', threshold: 50, rarity: 'uncommon', emoji: '🔥', sortOrder: 2 },
  { id: 'sessions_100', category: 'trening', nameKey: 'badge.sessions100', descriptionKey: 'badge.sessions100Desc', requirementKey: 'badge.sessions100Req', threshold: 100, rarity: 'rare', emoji: '⚡', sortOrder: 3 },
  { id: 'sessions_250', category: 'trening', nameKey: 'badge.sessions250', descriptionKey: 'badge.sessions250Desc', requirementKey: 'badge.sessions250Req', threshold: 250, rarity: 'epic', emoji: '🏅', sortOrder: 4 },
  { id: 'sessions_500', category: 'trening', nameKey: 'badge.sessions500', descriptionKey: 'badge.sessions500Desc', requirementKey: 'badge.sessions500Req', threshold: 500, rarity: 'legendary', emoji: '🎖️', sortOrder: 5 },
  // Monthly sessions
  { id: 'month_sessions_10', category: 'trening', nameKey: 'badge.monthSessions10', descriptionKey: 'badge.monthSessions10Desc', requirementKey: 'badge.monthSessions10Req', threshold: 10, rarity: 'common', emoji: '📊', sortOrder: 10, repeatable: true },
  { id: 'month_sessions_20', category: 'trening', nameKey: 'badge.monthSessions20', descriptionKey: 'badge.monthSessions20Desc', requirementKey: 'badge.monthSessions20Req', threshold: 20, rarity: 'uncommon', emoji: '📈', sortOrder: 11, repeatable: true },
  { id: 'month_sessions_30', category: 'trening', nameKey: 'badge.monthSessions30', descriptionKey: 'badge.monthSessions30Desc', requirementKey: 'badge.monthSessions30Req', threshold: 30, rarity: 'rare', emoji: '🏋️', sortOrder: 12, repeatable: true },
  // Monthly elevation
  { id: 'month_elev_1000', category: 'trening', nameKey: 'badge.monthElev1000', descriptionKey: 'badge.monthElev1000Desc', requirementKey: 'badge.monthElev1000Req', threshold: 1000, rarity: 'common', emoji: '⛰️', sortOrder: 13, repeatable: true },
  { id: 'month_elev_3000', category: 'trening', nameKey: 'badge.monthElev3000', descriptionKey: 'badge.monthElev3000Desc', requirementKey: 'badge.monthElev3000Req', threshold: 3000, rarity: 'uncommon', emoji: '🏔️', sortOrder: 14, repeatable: true },
  { id: 'month_elev_5000', category: 'trening', nameKey: 'badge.monthElev5000', descriptionKey: 'badge.monthElev5000Desc', requirementKey: 'badge.monthElev5000Req', threshold: 5000, rarity: 'rare', emoji: '🗻', sortOrder: 15, repeatable: true },
  { id: 'month_elev_10000', category: 'trening', nameKey: 'badge.monthElev10000', descriptionKey: 'badge.monthElev10000Desc', requirementKey: 'badge.monthElev10000Req', threshold: 10000, rarity: 'epic', emoji: '🦅', sortOrder: 16, repeatable: true },
  // Monthly same type
  { id: 'month_same_5', category: 'trening', nameKey: 'badge.monthSame5', descriptionKey: 'badge.monthSame5Desc', requirementKey: 'badge.monthSame5Req', threshold: 5, rarity: 'common', emoji: '🎯', sortOrder: 17, repeatable: true },
  { id: 'month_same_10', category: 'trening', nameKey: 'badge.monthSame10', descriptionKey: 'badge.monthSame10Desc', requirementKey: 'badge.monthSame10Req', threshold: 10, rarity: 'uncommon', emoji: '🎯', sortOrder: 18, repeatable: true },
  { id: 'month_same_15', category: 'trening', nameKey: 'badge.monthSame15', descriptionKey: 'badge.monthSame15Desc', requirementKey: 'badge.monthSame15Req', threshold: 15, rarity: 'rare', emoji: '🎯', sortOrder: 19, repeatable: true },
  // Monthly distance
  { id: 'month_dist_50', category: 'trening', nameKey: 'badge.monthDist50', descriptionKey: 'badge.monthDist50Desc', requirementKey: 'badge.monthDist50Req', threshold: 50, rarity: 'common', emoji: '🏃', sortOrder: 20, repeatable: true },
  { id: 'month_dist_100', category: 'trening', nameKey: 'badge.monthDist100', descriptionKey: 'badge.monthDist100Desc', requirementKey: 'badge.monthDist100Req', threshold: 100, rarity: 'uncommon', emoji: '🏃', sortOrder: 21, repeatable: true },
  { id: 'month_dist_150', category: 'trening', nameKey: 'badge.monthDist150', descriptionKey: 'badge.monthDist150Desc', requirementKey: 'badge.monthDist150Req', threshold: 150, rarity: 'rare', emoji: '🏃', sortOrder: 22, repeatable: true },
];

export function getRarityGlow(rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common': return 'rgba(100,200,120,0.15)';
    case 'uncommon': return 'rgba(80,180,220,0.2)';
    case 'rare': return 'rgba(160,100,220,0.25)';
    case 'epic': return 'rgba(220,160,50,0.3)';
    case 'legendary': return 'rgba(255,200,50,0.4)';
  }
}

export function getRarityColor(rarity: BadgeRarity): string {
  switch (rarity) {
    case 'common': return 'hsl(142, 50%, 48%)';
    case 'uncommon': return 'hsl(195, 70%, 50%)';
    case 'rare': return 'hsl(270, 60%, 55%)';
    case 'epic': return 'hsl(38, 80%, 50%)';
    case 'legendary': return 'hsl(45, 95%, 55%)';
  }
}

// Helper: group checkins by date string
function groupByDate(checkins: { checked_in_at: string }[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of checkins) {
    const d = c.checked_in_at.slice(0, 10);
    map.set(d, (map.get(d) || 0) + 1);
  }
  return map;
}

// Helper: max consecutive days with checkins
function maxStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort();
  let max = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { cur++; max = Math.max(max, cur); }
    else cur = 1;
  }
  return max;
}

// Helper: count how many distinct months achieved a threshold
function countMonthsAchieved(sessions: { date: string; type: string; distance: number | null; elevation_gain: number | null }[], metric: 'sessions' | 'elevation' | 'sameType' | 'distance', threshold: number): number {
  const monthMap = new Map<string, any>();
  for (const s of sessions) {
    const m = s.date.slice(0, 7); // YYYY-MM
    if (!monthMap.has(m)) monthMap.set(m, { count: 0, elev: 0, dist: 0, types: new Map<string, number>() });
    const d = monthMap.get(m)!;
    d.count++;
    d.elev += s.elevation_gain || 0;
    d.dist += (s.distance || 0) / 1000; // convert m to km
    d.types.set(s.type, (d.types.get(s.type) || 0) + 1);
  }
  let count = 0;
  for (const [, d] of monthMap) {
    if (metric === 'sessions' && d.count >= threshold) count++;
    else if (metric === 'elevation' && d.elev >= threshold) count++;
    else if (metric === 'distance' && d.dist >= threshold) count++;
    else if (metric === 'sameType') {
      let maxType = 0;
      for (const [, v] of d.types) maxType = Math.max(maxType, v);
      if (maxType >= threshold) count++;
    }
  }
  return count;
}

// Count how many times a daily-checkin threshold was met
function countDaysWithCheckins(dateMap: Map<string, number>, threshold: number): number {
  let count = 0;
  for (const [, v] of dateMap) {
    if (v >= threshold) count++;
  }
  return count;
}

// Count how many streak runs of length >= threshold
function countStreakRuns(dates: string[], threshold: number): number {
  if (dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort();
  let runs = 0, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    if ((curr.getTime() - prev.getTime()) / 86400000 === 1) {
      cur++;
    } else {
      if (cur >= threshold) runs++;
      cur = 1;
    }
  }
  if (cur >= threshold) runs++;
  return runs;
}

// Get current month's data for progress on repeatable monthly badges
function getCurrentMonthData(sessions: { date: string; type: string; distance: number | null; elevation_gain: number | null }[]): { count: number; elev: number; dist: number; maxSameType: number } {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let count = 0, elev = 0, dist = 0;
  const types = new Map<string, number>();
  for (const s of sessions) {
    if (s.date.startsWith(ym)) {
      count++;
      elev += s.elevation_gain || 0;
      dist += (s.distance || 0) / 1000;
      types.set(s.type, (types.get(s.type) || 0) + 1);
    }
  }
  let maxSameType = 0;
  for (const [, v] of types) maxSameType = Math.max(maxSameType, v);
  return { count, elev, dist, maxSameType };
}

export async function computeUserBadges(userId: string, isChild = false): Promise<UserBadge[]> {
  // Get peak checkins
  const { data: checkins } = await supabase
    .from('peak_checkins')
    .select('peak_id, checked_in_at')
    .eq('user_id', userId);

  const uniquePeaks = new Set(checkins?.map(c => c.peak_id) || []).size;
  const checkinDates = (checkins || []).map(c => c.checked_in_at.slice(0, 10));
  const dateMap = groupByDate(checkins || []);

  // Get peaks_db for elevation data (high peaks)
  let highPeakCount = 0;
  if (checkins && checkins.length > 0) {
    const uniquePeakIds = [...new Set(checkins.map(c => c.peak_id))];
    const { data: peaks } = await supabase
      .from('peaks_db')
      .select('id, elevation_moh')
      .in('id', uniquePeakIds);
    if (peaks) {
      highPeakCount = peaks.filter(p => p.elevation_moh >= 1000).length;
    }
  }

  // Get workout sessions (only for non-child profiles)
  let sessions: { date: string; type: string; distance: number | null; elevation_gain: number | null; created_at: string }[] = [];
  let totalSessionsSinceSignup = 0;
  if (!isChild) {
    // Get user signup date
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();
    const signupDate = profile?.created_at?.slice(0, 10) || '2020-01-01';

    const { data: sessionData } = await supabase
      .from('workout_sessions')
      .select('date, type, distance, elevation_gain, created_at')
      .eq('user_id', userId)
      .gte('date', signupDate);
    sessions = sessionData || [];
    totalSessionsSinceSignup = sessions.length;
  }

  const currentMonth = getCurrentMonthData(sessions);

  return BADGE_DEFINITIONS.filter(b => isChild ? b.category !== 'trening' : true).map(badge => {
    let progress = 0;
    let repeatCount = 0;

    // ── Topper (unique peaks) ──
    if (badge.category === 'topper') {
      progress = uniquePeaks;
    }
    // ── Fjellmerker ──
    else if (badge.id.startsWith('high_peak_')) {
      progress = highPeakCount;
    }
    else if (badge.id === 'checkins_3_day') {
      repeatCount = countDaysWithCheckins(dateMap, 3);
      progress = repeatCount > 0 ? 3 : Math.max(...Array.from(dateMap.values()), 0);
    }
    else if (badge.id === 'checkins_5_day') {
      repeatCount = countDaysWithCheckins(dateMap, 5);
      progress = repeatCount > 0 ? 5 : Math.max(...Array.from(dateMap.values()), 0);
    }
    else if (badge.id === 'streak_3') {
      repeatCount = countStreakRuns(checkinDates, 3);
      progress = repeatCount > 0 ? 3 : maxStreak(checkinDates);
    }
    else if (badge.id === 'streak_5') {
      repeatCount = countStreakRuns(checkinDates, 5);
      progress = repeatCount > 0 ? 5 : maxStreak(checkinDates);
    }
    else if (badge.id === 'streak_10') {
      repeatCount = countStreakRuns(checkinDates, 10);
      progress = repeatCount > 0 ? 10 : maxStreak(checkinDates);
    }
    // ── Trening: total sessions since signup ──
    else if (['sessions_10', 'sessions_50', 'sessions_100', 'sessions_250', 'sessions_500'].includes(badge.id)) {
      progress = totalSessionsSinceSignup;
    }
    // ── Monthly sessions ──
    else if (badge.id === 'month_sessions_10') {
      repeatCount = countMonthsAchieved(sessions, 'sessions', 10);
      progress = repeatCount > 0 ? 10 : currentMonth.count;
    }
    else if (badge.id === 'month_sessions_20') {
      repeatCount = countMonthsAchieved(sessions, 'sessions', 20);
      progress = repeatCount > 0 ? 20 : currentMonth.count;
    }
    else if (badge.id === 'month_sessions_30') {
      repeatCount = countMonthsAchieved(sessions, 'sessions', 30);
      progress = repeatCount > 0 ? 30 : currentMonth.count;
    }
    // ── Monthly elevation ──
    else if (badge.id === 'month_elev_1000') {
      repeatCount = countMonthsAchieved(sessions, 'elevation', 1000);
      progress = repeatCount > 0 ? 1000 : currentMonth.elev;
    }
    else if (badge.id === 'month_elev_3000') {
      repeatCount = countMonthsAchieved(sessions, 'elevation', 3000);
      progress = repeatCount > 0 ? 3000 : currentMonth.elev;
    }
    else if (badge.id === 'month_elev_5000') {
      repeatCount = countMonthsAchieved(sessions, 'elevation', 5000);
      progress = repeatCount > 0 ? 5000 : currentMonth.elev;
    }
    else if (badge.id === 'month_elev_10000') {
      repeatCount = countMonthsAchieved(sessions, 'elevation', 10000);
      progress = repeatCount > 0 ? 10000 : currentMonth.elev;
    }
    // ── Monthly same type ──
    else if (badge.id === 'month_same_5') {
      repeatCount = countMonthsAchieved(sessions, 'sameType', 5);
      progress = repeatCount > 0 ? 5 : currentMonth.maxSameType;
    }
    else if (badge.id === 'month_same_10') {
      repeatCount = countMonthsAchieved(sessions, 'sameType', 10);
      progress = repeatCount > 0 ? 10 : currentMonth.maxSameType;
    }
    else if (badge.id === 'month_same_15') {
      repeatCount = countMonthsAchieved(sessions, 'sameType', 15);
      progress = repeatCount > 0 ? 15 : currentMonth.maxSameType;
    }
    // ── Monthly distance ──
    else if (badge.id === 'month_dist_50') {
      repeatCount = countMonthsAchieved(sessions, 'distance', 50);
      progress = repeatCount > 0 ? 50 : currentMonth.dist;
    }
    else if (badge.id === 'month_dist_100') {
      repeatCount = countMonthsAchieved(sessions, 'distance', 100);
      progress = repeatCount > 0 ? 100 : currentMonth.dist;
    }
    else if (badge.id === 'month_dist_150') {
      repeatCount = countMonthsAchieved(sessions, 'distance', 150);
      progress = repeatCount > 0 ? 150 : currentMonth.dist;
    }

    const unlocked = badge.repeatable ? repeatCount > 0 : progress >= badge.threshold;

    let unlockedAt: string | null = null;
    if (unlocked && badge.category === 'topper' && checkins) {
      // Find when Nth unique peak was reached
      const sorted = [...checkins].sort((a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime());
      const seen = new Set<string>();
      for (const c of sorted) {
        seen.add(c.peak_id);
        if (seen.size >= badge.threshold) {
          unlockedAt = c.checked_in_at;
          break;
        }
      }
    }

    return { badge, unlocked, unlockedAt, progress, repeatCount: badge.repeatable ? repeatCount : undefined };
  });
}

export function findNewlyUnlocked(prevBadges: UserBadge[], newBadges: UserBadge[]): UserBadge[] {
  const prevUnlocked = new Set(prevBadges.filter(b => b.unlocked).map(b => b.badge.id));
  return newBadges.filter(b => b.unlocked && !prevUnlocked.has(b.badge.id));
}
