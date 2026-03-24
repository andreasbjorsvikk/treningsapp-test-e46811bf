import { supabase } from '@/integrations/supabase/client';

// Badge images - peaks
import badge10 from '@/assets/badges/10_topper.png';
import badge25 from '@/assets/badges/25_topper.png';
import badge50 from '@/assets/badges/50_topper.png';
import badge100 from '@/assets/badges/100_topper.png';

// Badge images - sessions
import badgeSessions10 from '@/assets/badges/10_okter.png';
import badgeSessions50 from '@/assets/badges/50_okter.png';
import badgeSessions100 from '@/assets/badges/100_okter.png';
import badgeSessions250 from '@/assets/badges/250_okter.png';
import badgeSessions500 from '@/assets/badges/500_okter.png';

// Badge images - high peaks
import badgeHighPeak1 from '@/assets/badges/1_topp_1000_moh.png';
import badgeHighPeak3 from '@/assets/badges/3_topper_1000_moh.png';
import badgeHighPeak5 from '@/assets/badges/5_topper_1000_moh.png';
import badgeHighPeak10 from '@/assets/badges/10_topper_1000_moh.png';

// Badge images - daily checkins
import badge3Day from '@/assets/badges/3_topper_dag.png';
import badge5Day from '@/assets/badges/5_topper_dag.png';
import badge7Day from '@/assets/badges/7_topper_dag.png';

// Badge images - streaks
import badgeStreak3 from '@/assets/badges/fjellfokus_3_dager.png';
import badgeStreak5 from '@/assets/badges/fjellrytme_5_dager.png';
import badgeStreak10 from '@/assets/badges/fjellflyt_10_dager.png';

// Badge images - monthly elevation
import badgeElev1000 from '@/assets/badges/elev_1000m.png';
import badgeElev3000 from '@/assets/badges/elev_3000m.png';
import badgeElev5000 from '@/assets/badges/elev_5000m.png';
import badgeElev10000 from '@/assets/badges/elev_10000m.png';

export type BadgeCategory = 'fjell' | 'trening';
export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface BadgeDefinition {
  id: string;
  category: BadgeCategory;
  subcategory: string;
  nameKey: string;
  descriptionKey: string;
  requirementKey: string;
  threshold: number;
  rarity: BadgeRarity;
  emoji: string;
  image?: string;
  sortOrder: number;
  repeatable?: boolean;
}

export interface UserBadge {
  badge: BadgeDefinition;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
  repeatCount?: number;
}

type CheckinRow = {
  peak_id: string;
  checked_in_at: string;
};

type SessionRow = {
  date: string;
  type: string;
  distance: number | null;
  elevation_gain: number | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ── Fjell: Unike topper ──
  { id: 'peaks_10', category: 'fjell', subcategory: 'unique_peaks', nameKey: 'badge.peaks10', descriptionKey: 'badge.peaks10Desc', requirementKey: 'badge.peaks10Req', threshold: 10, rarity: 'common', emoji: '⛰️', image: badge10, sortOrder: 1 },
  { id: 'peaks_25', category: 'fjell', subcategory: 'unique_peaks', nameKey: 'badge.peaks25', descriptionKey: 'badge.peaks25Desc', requirementKey: 'badge.peaks25Req', threshold: 25, rarity: 'uncommon', emoji: '🏔️', image: badge25, sortOrder: 2 },
  { id: 'peaks_50', category: 'fjell', subcategory: 'unique_peaks', nameKey: 'badge.peaks50', descriptionKey: 'badge.peaks50Desc', requirementKey: 'badge.peaks50Req', threshold: 50, rarity: 'rare', emoji: '🗻', image: badge50, sortOrder: 3 },
  { id: 'peaks_100', category: 'fjell', subcategory: 'unique_peaks', nameKey: 'badge.peaks100', descriptionKey: 'badge.peaks100Desc', requirementKey: 'badge.peaks100Req', threshold: 100, rarity: 'epic', emoji: '🏆', image: badge100, sortOrder: 4 },

  // ── Fjell: Topper over 1000 moh ──
  { id: 'high_peak_1', category: 'fjell', subcategory: 'high_peaks', nameKey: 'badge.highPeak1', descriptionKey: 'badge.highPeak1Desc', requirementKey: 'badge.highPeak1Req', threshold: 1, rarity: 'common', emoji: '🏔️', image: badgeHighPeak1, sortOrder: 10 },
  { id: 'high_peak_3', category: 'fjell', subcategory: 'high_peaks', nameKey: 'badge.highPeak3', descriptionKey: 'badge.highPeak3Desc', requirementKey: 'badge.highPeak3Req', threshold: 3, rarity: 'uncommon', emoji: '🏔️', image: badgeHighPeak3, sortOrder: 11 },
  { id: 'high_peak_5', category: 'fjell', subcategory: 'high_peaks', nameKey: 'badge.highPeak5', descriptionKey: 'badge.highPeak5Desc', requirementKey: 'badge.highPeak5Req', threshold: 5, rarity: 'rare', emoji: '🗻', image: badgeHighPeak5, sortOrder: 12 },
  { id: 'high_peak_10', category: 'fjell', subcategory: 'high_peaks', nameKey: 'badge.highPeak10', descriptionKey: 'badge.highPeak10Desc', requirementKey: 'badge.highPeak10Req', threshold: 10, rarity: 'epic', emoji: '🦅', image: badgeHighPeak10, sortOrder: 13 },

  // ── Fjell: Topper på en dag ──
  { id: 'checkins_3_day', category: 'fjell', subcategory: 'daily_checkins', nameKey: 'badge.checkins3Day', descriptionKey: 'badge.checkins3DayDesc', requirementKey: 'badge.checkins3DayReq', threshold: 3, rarity: 'uncommon', emoji: '⚡', image: badge3Day, sortOrder: 20, repeatable: true },
  { id: 'checkins_5_day', category: 'fjell', subcategory: 'daily_checkins', nameKey: 'badge.checkins5Day', descriptionKey: 'badge.checkins5DayDesc', requirementKey: 'badge.checkins5DayReq', threshold: 5, rarity: 'rare', emoji: '🔥', image: badge5Day, sortOrder: 21, repeatable: true },
  { id: 'checkins_7_day', category: 'fjell', subcategory: 'daily_checkins', nameKey: 'badge.checkins7Day', descriptionKey: 'badge.checkins7DayDesc', requirementKey: 'badge.checkins7DayReq', threshold: 7, rarity: 'epic', emoji: '🏆', image: badge7Day, sortOrder: 22, repeatable: true },

  // ── Fjell: Dager på rad ──
  { id: 'streak_3', category: 'fjell', subcategory: 'streaks', nameKey: 'badge.streak3', descriptionKey: 'badge.streak3Desc', requirementKey: 'badge.streak3Req', threshold: 3, rarity: 'uncommon', emoji: '📅', image: badgeStreak3, sortOrder: 30, repeatable: true },
  { id: 'streak_5', category: 'fjell', subcategory: 'streaks', nameKey: 'badge.streak5', descriptionKey: 'badge.streak5Desc', requirementKey: 'badge.streak5Req', threshold: 5, rarity: 'rare', emoji: '🗓️', image: badgeStreak5, sortOrder: 31, repeatable: true },
  { id: 'streak_10', category: 'fjell', subcategory: 'streaks', nameKey: 'badge.streak10', descriptionKey: 'badge.streak10Desc', requirementKey: 'badge.streak10Req', threshold: 10, rarity: 'epic', emoji: '🏅', image: badgeStreak10, sortOrder: 32, repeatable: true },

  // ── Trening: Totalt antall økter ──
  { id: 'sessions_10', category: 'trening', subcategory: 'total_sessions', nameKey: 'badge.sessions10', descriptionKey: 'badge.sessions10Desc', requirementKey: 'badge.sessions10Req', threshold: 10, rarity: 'common', emoji: '💪', image: badgeSessions10, sortOrder: 1 },
  { id: 'sessions_50', category: 'trening', subcategory: 'total_sessions', nameKey: 'badge.sessions50', descriptionKey: 'badge.sessions50Desc', requirementKey: 'badge.sessions50Req', threshold: 50, rarity: 'uncommon', emoji: '🔥', image: badgeSessions50, sortOrder: 2 },
  { id: 'sessions_100', category: 'trening', subcategory: 'total_sessions', nameKey: 'badge.sessions100', descriptionKey: 'badge.sessions100Desc', requirementKey: 'badge.sessions100Req', threshold: 100, rarity: 'rare', emoji: '⚡', image: badgeSessions100, sortOrder: 3 },
  { id: 'sessions_250', category: 'trening', subcategory: 'total_sessions', nameKey: 'badge.sessions250', descriptionKey: 'badge.sessions250Desc', requirementKey: 'badge.sessions250Req', threshold: 250, rarity: 'epic', emoji: '🏅', image: badgeSessions250, sortOrder: 4 },
  { id: 'sessions_500', category: 'trening', subcategory: 'total_sessions', nameKey: 'badge.sessions500', descriptionKey: 'badge.sessions500Desc', requirementKey: 'badge.sessions500Req', threshold: 500, rarity: 'legendary', emoji: '🎖️', image: badgeSessions500, sortOrder: 5 },

  // ── Trening: Månedlige økter ──
  { id: 'month_sessions_10', category: 'trening', subcategory: 'monthly_sessions', nameKey: 'badge.monthSessions10', descriptionKey: 'badge.monthSessions10Desc', requirementKey: 'badge.monthSessions10Req', threshold: 10, rarity: 'common', emoji: '📊', sortOrder: 10, repeatable: true },
  { id: 'month_sessions_20', category: 'trening', subcategory: 'monthly_sessions', nameKey: 'badge.monthSessions20', descriptionKey: 'badge.monthSessions20Desc', requirementKey: 'badge.monthSessions20Req', threshold: 20, rarity: 'uncommon', emoji: '📈', sortOrder: 11, repeatable: true },
  { id: 'month_sessions_30', category: 'trening', subcategory: 'monthly_sessions', nameKey: 'badge.monthSessions30', descriptionKey: 'badge.monthSessions30Desc', requirementKey: 'badge.monthSessions30Req', threshold: 30, rarity: 'rare', emoji: '🏋️', sortOrder: 12, repeatable: true },

  // ── Trening: Månedlige høydemeter ──
  { id: 'month_elev_1000', category: 'trening', subcategory: 'monthly_elevation', nameKey: 'badge.monthElev1000', descriptionKey: 'badge.monthElev1000Desc', requirementKey: 'badge.monthElev1000Req', threshold: 1000, rarity: 'common', emoji: '⛰️', sortOrder: 13, repeatable: true },
  { id: 'month_elev_3000', category: 'trening', subcategory: 'monthly_elevation', nameKey: 'badge.monthElev3000', descriptionKey: 'badge.monthElev3000Desc', requirementKey: 'badge.monthElev3000Req', threshold: 3000, rarity: 'uncommon', emoji: '🏔️', sortOrder: 14, repeatable: true },
  { id: 'month_elev_5000', category: 'trening', subcategory: 'monthly_elevation', nameKey: 'badge.monthElev5000', descriptionKey: 'badge.monthElev5000Desc', requirementKey: 'badge.monthElev5000Req', threshold: 5000, rarity: 'rare', emoji: '🗻', sortOrder: 15, repeatable: true },
  { id: 'month_elev_10000', category: 'trening', subcategory: 'monthly_elevation', nameKey: 'badge.monthElev10000', descriptionKey: 'badge.monthElev10000Desc', requirementKey: 'badge.monthElev10000Req', threshold: 10000, rarity: 'epic', emoji: '🦅', sortOrder: 16, repeatable: true },

  // ── Trening: Månedlig samme type ──
  { id: 'month_same_5', category: 'trening', subcategory: 'monthly_sametype', nameKey: 'badge.monthSame5', descriptionKey: 'badge.monthSame5Desc', requirementKey: 'badge.monthSame5Req', threshold: 5, rarity: 'common', emoji: '🎯', sortOrder: 17, repeatable: true },
  { id: 'month_same_10', category: 'trening', subcategory: 'monthly_sametype', nameKey: 'badge.monthSame10', descriptionKey: 'badge.monthSame10Desc', requirementKey: 'badge.monthSame10Req', threshold: 10, rarity: 'uncommon', emoji: '🎯', sortOrder: 18, repeatable: true },
  { id: 'month_same_15', category: 'trening', subcategory: 'monthly_sametype', nameKey: 'badge.monthSame15', descriptionKey: 'badge.monthSame15Desc', requirementKey: 'badge.monthSame15Req', threshold: 15, rarity: 'rare', emoji: '🎯', sortOrder: 19, repeatable: true },

  // ── Trening: Månedlig distanse ──
  { id: 'month_dist_50', category: 'trening', subcategory: 'monthly_distance', nameKey: 'badge.monthDist50', descriptionKey: 'badge.monthDist50Desc', requirementKey: 'badge.monthDist50Req', threshold: 50, rarity: 'common', emoji: '🏃', sortOrder: 20, repeatable: true },
  { id: 'month_dist_100', category: 'trening', subcategory: 'monthly_distance', nameKey: 'badge.monthDist100', descriptionKey: 'badge.monthDist100Desc', requirementKey: 'badge.monthDist100Req', threshold: 100, rarity: 'uncommon', emoji: '🏃', sortOrder: 21, repeatable: true },
  { id: 'month_dist_150', category: 'trening', subcategory: 'monthly_distance', nameKey: 'badge.monthDist150', descriptionKey: 'badge.monthDist150Desc', requirementKey: 'badge.monthDist150Req', threshold: 150, rarity: 'rare', emoji: '🏃', sortOrder: 22, repeatable: true },
];

export const SUBCATEGORY_NAMES: Record<string, { no: string; en: string }> = {
  unique_peaks: { no: 'Unike topper', en: 'Unique peaks' },
  high_peaks: { no: 'Topper over 1000 moh', en: 'Peaks over 1000m' },
  daily_checkins: { no: 'Topper på én dag', en: 'Peaks in one day' },
  streaks: { no: 'Dager på rad', en: 'Consecutive days' },
  total_sessions: { no: 'Totalt antall økter', en: 'Total sessions' },
  monthly_sessions: { no: 'Økter på en måned', en: 'Monthly sessions' },
  monthly_elevation: { no: 'Høydemeter på en måned', en: 'Monthly elevation' },
  monthly_sametype: { no: 'Samme type på en måned', en: 'Same type monthly' },
  monthly_distance: { no: 'Distanse på en måned', en: 'Monthly distance' },
};

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

// Special glow colors for high_peaks badges
export function getHighPeakGlow(badgeId: string): { color: string; glow: string } | null {
  switch (badgeId) {
    case 'high_peak_1': return { color: 'hsl(142, 50%, 48%)', glow: 'rgba(76, 175, 80, 0.35)' }; // green
    case 'high_peak_3': return { color: 'hsl(25, 70%, 50%)', glow: 'rgba(205, 127, 50, 0.35)' }; // bronze
    case 'high_peak_5': return { color: 'hsl(210, 10%, 65%)', glow: 'rgba(192, 192, 192, 0.35)' }; // silver
    case 'high_peak_10': return { color: 'hsl(45, 95%, 55%)', glow: 'rgba(255, 215, 0, 0.35)' }; // gold
    // Unique peaks glow
    case 'peaks_10': return { color: 'hsl(142, 50%, 48%)', glow: 'rgba(76, 175, 80, 0.35)' }; // green
    case 'peaks_25': return { color: 'hsl(25, 70%, 50%)', glow: 'rgba(205, 127, 50, 0.35)' }; // bronze
    case 'peaks_50': return { color: 'hsl(210, 10%, 65%)', glow: 'rgba(192, 192, 192, 0.35)' }; // silver
    case 'peaks_100': return { color: 'hsl(45, 95%, 55%)', glow: 'rgba(255, 215, 0, 0.35)' }; // gold
    default: return null;
  }
}
// ── Helper functions ──

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function toLocalDateKey(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toLocalMonthKey(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 7);
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function groupByDate(checkins: CheckinRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const c of checkins) {
    const d = toLocalDateKey(c.checked_in_at);
    map.set(d, (map.get(d) || 0) + 1);
  }
  return map;
}

function maxStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort();
  let max = 1, cur = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1] + 'T00:00:00Z');
    const curr = new Date(unique[i] + 'T00:00:00Z');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) { cur++; max = Math.max(max, cur); }
    else { cur = 1; }
  }
  return max;
}

function countDaysWithCheckins(dateMap: Map<string, number>, threshold: number): number {
  let count = 0;
  for (const [, v] of dateMap) {
    if (v >= threshold) count++;
  }
  return count;
}

function countStreakRuns(dates: string[], threshold: number): number {
  if (dates.length === 0) return 0;
  const unique = [...new Set(dates)].sort();
  let runs = 0, cur = 1;
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1] + 'T00:00:00Z');
    const curr = new Date(unique[i] + 'T00:00:00Z');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      cur++;
    } else {
      if (cur >= threshold) runs++;
      cur = 1;
    }
  }
  if (cur >= threshold) runs++;
  return runs;
}

function countMonthsAchieved(sessions: SessionRow[], metric: 'sessions' | 'elevation' | 'sameType' | 'distance', threshold: number): number {
  const monthMap = new Map<string, { count: number; elev: number; dist: number; types: Map<string, number> }>();
  for (const s of sessions) {
    const m = toLocalMonthKey(s.date);
    if (!monthMap.has(m)) monthMap.set(m, { count: 0, elev: 0, dist: 0, types: new Map() });
    const d = monthMap.get(m)!;
    d.count++;
    d.elev += s.elevation_gain || 0;
    d.dist += (s.distance || 0) / 1000;
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

function getCurrentMonthData(sessions: SessionRow[]): { count: number; elev: number; dist: number; maxSameType: number } {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let count = 0, elev = 0, dist = 0;
  const types = new Map<string, number>();
  for (const s of sessions) {
    if (toLocalMonthKey(s.date) === ym) {
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

// ── Main compute function ──

export async function computeUserBadges(userId: string, isChild = false): Promise<UserBadge[]> {
  // Get ALL checkins for this user (any checkin, not just unique)
  const { data: allCheckins } = await supabase
    .from('peak_checkins')
    .select('peak_id, checked_in_at')
    .eq('user_id', userId);

  const checkins: CheckinRow[] = allCheckins || [];

  let uniquePeakCount = 0;
  let highPeakCount = 0;
  let validCheckins: CheckinRow[] = [];

  if (checkins.length > 0) {
    const uniquePeakIds = [...new Set(checkins.map(c => c.peak_id).filter(isUuid))];

    if (uniquePeakIds.length > 0) {
      const { data: existingPeaks } = await supabase
        .from('peaks_db')
        .select('id, elevation_moh')
        .eq('is_published', true)
        .in('id', uniquePeakIds);

      const existingPeakMap = new Map((existingPeaks || []).map(p => [p.id, p]));

      validCheckins = checkins.filter(c => isUuid(c.peak_id) && existingPeakMap.has(c.peak_id));

      uniquePeakCount = new Set(validCheckins.map(c => c.peak_id)).size;

      const checkedHighPeaks = new Set<string>();
      for (const c of validCheckins) {
        const peak = existingPeakMap.get(c.peak_id);
        if (peak && peak.elevation_moh >= 1000) {
          checkedHighPeaks.add(c.peak_id);
        }
      }
      highPeakCount = checkedHighPeaks.size;
    }
  }

  const validCheckinDates = validCheckins.map(c => toLocalDateKey(c.checked_in_at));
  const validDateMap = groupByDate(validCheckins);

  // Workout sessions
  let sessions: SessionRow[] = [];
  let totalSessionsSinceSignup = 0;
  if (!isChild) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single();
    const signupDate = profile?.created_at?.slice(0, 10) || '2020-01-01';
    const { data: sessionData } = await supabase
      .from('workout_sessions')
      .select('date, type, distance, elevation_gain')
      .eq('user_id', userId)
      .gte('date', signupDate);
    sessions = sessionData || [];
    totalSessionsSinceSignup = sessions.length;
  }

  const currentMonth = getCurrentMonthData(sessions);

  return BADGE_DEFINITIONS.filter(b => isChild ? b.category !== 'trening' : true).map(badge => {
    let progress = 0;
    let repeatCount = 0;

    if (badge.subcategory === 'unique_peaks') {
      progress = uniquePeakCount;
    }
    else if (badge.id.startsWith('high_peak_')) {
      progress = highPeakCount;
    }
    else if (badge.id === 'checkins_3_day') {
      repeatCount = countDaysWithCheckins(validDateMap, 3);
      progress = repeatCount > 0 ? 3 : Math.max(...Array.from(validDateMap.values()), 0);
    }
    else if (badge.id === 'checkins_5_day') {
      repeatCount = countDaysWithCheckins(validDateMap, 5);
      progress = repeatCount > 0 ? 5 : Math.max(...Array.from(validDateMap.values()), 0);
    }
    else if (badge.id === 'checkins_7_day') {
      repeatCount = countDaysWithCheckins(validDateMap, 7);
      progress = repeatCount > 0 ? 7 : Math.max(...Array.from(validDateMap.values()), 0);
    }
    else if (badge.id === 'streak_3') {
      repeatCount = countStreakRuns(validCheckinDates, 3);
      progress = repeatCount > 0 ? 3 : maxStreak(validCheckinDates);
    }
    else if (badge.id === 'streak_5') {
      repeatCount = countStreakRuns(validCheckinDates, 5);
      progress = repeatCount > 0 ? 5 : maxStreak(validCheckinDates);
    }
    else if (badge.id === 'streak_10') {
      repeatCount = countStreakRuns(validCheckinDates, 10);
      progress = repeatCount > 0 ? 10 : maxStreak(validCheckinDates);
    }
    else if (['sessions_10', 'sessions_50', 'sessions_100', 'sessions_250', 'sessions_500'].includes(badge.id)) {
      progress = totalSessionsSinceSignup;
    }
    else if (badge.id === 'month_sessions_10') { repeatCount = countMonthsAchieved(sessions, 'sessions', 10); progress = repeatCount > 0 ? 10 : currentMonth.count; }
    else if (badge.id === 'month_sessions_20') { repeatCount = countMonthsAchieved(sessions, 'sessions', 20); progress = repeatCount > 0 ? 20 : currentMonth.count; }
    else if (badge.id === 'month_sessions_30') { repeatCount = countMonthsAchieved(sessions, 'sessions', 30); progress = repeatCount > 0 ? 30 : currentMonth.count; }
    else if (badge.id === 'month_elev_1000') { repeatCount = countMonthsAchieved(sessions, 'elevation', 1000); progress = repeatCount > 0 ? 1000 : currentMonth.elev; }
    else if (badge.id === 'month_elev_3000') { repeatCount = countMonthsAchieved(sessions, 'elevation', 3000); progress = repeatCount > 0 ? 3000 : currentMonth.elev; }
    else if (badge.id === 'month_elev_5000') { repeatCount = countMonthsAchieved(sessions, 'elevation', 5000); progress = repeatCount > 0 ? 5000 : currentMonth.elev; }
    else if (badge.id === 'month_elev_10000') { repeatCount = countMonthsAchieved(sessions, 'elevation', 10000); progress = repeatCount > 0 ? 10000 : currentMonth.elev; }
    else if (badge.id === 'month_same_5') { repeatCount = countMonthsAchieved(sessions, 'sameType', 5); progress = repeatCount > 0 ? 5 : currentMonth.maxSameType; }
    else if (badge.id === 'month_same_10') { repeatCount = countMonthsAchieved(sessions, 'sameType', 10); progress = repeatCount > 0 ? 10 : currentMonth.maxSameType; }
    else if (badge.id === 'month_same_15') { repeatCount = countMonthsAchieved(sessions, 'sameType', 15); progress = repeatCount > 0 ? 15 : currentMonth.maxSameType; }
    else if (badge.id === 'month_dist_50') { repeatCount = countMonthsAchieved(sessions, 'distance', 50); progress = repeatCount > 0 ? 50 : currentMonth.dist; }
    else if (badge.id === 'month_dist_100') { repeatCount = countMonthsAchieved(sessions, 'distance', 100); progress = repeatCount > 0 ? 100 : currentMonth.dist; }
    else if (badge.id === 'month_dist_150') { repeatCount = countMonthsAchieved(sessions, 'distance', 150); progress = repeatCount > 0 ? 150 : currentMonth.dist; }

    const unlocked = badge.repeatable ? repeatCount > 0 : progress >= badge.threshold;

    let unlockedAt: string | null = null;
    if (unlocked && badge.subcategory === 'unique_peaks' && validCheckins.length > 0) {
      const sorted = [...validCheckins].sort((a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime());
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
