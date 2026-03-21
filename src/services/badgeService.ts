import { supabase } from '@/integrations/supabase/client';

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
  sortOrder: number;
}

export interface UserBadge {
  badge: BadgeDefinition;
  unlocked: boolean;
  unlockedAt: string | null;
  progress: number;
}

// All badge definitions
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Topper badges
  { id: 'peaks_10', category: 'topper', nameKey: 'badge.peaks10', descriptionKey: 'badge.peaks10Desc', requirementKey: 'badge.peaks10Req', threshold: 10, rarity: 'common', emoji: '⛰️', sortOrder: 1 },
  { id: 'peaks_20', category: 'topper', nameKey: 'badge.peaks20', descriptionKey: 'badge.peaks20Desc', requirementKey: 'badge.peaks20Req', threshold: 20, rarity: 'uncommon', emoji: '🏔️', sortOrder: 2 },
  { id: 'peaks_50', category: 'topper', nameKey: 'badge.peaks50', descriptionKey: 'badge.peaks50Desc', requirementKey: 'badge.peaks50Req', threshold: 50, rarity: 'rare', emoji: '🗻', sortOrder: 3 },
  { id: 'peaks_100', category: 'topper', nameKey: 'badge.peaks100', descriptionKey: 'badge.peaks100Desc', requirementKey: 'badge.peaks100Req', threshold: 100, rarity: 'epic', emoji: '🏆', sortOrder: 4 },
  { id: 'peaks_200', category: 'topper', nameKey: 'badge.peaks200', descriptionKey: 'badge.peaks200Desc', requirementKey: 'badge.peaks200Req', threshold: 200, rarity: 'legendary', emoji: '👑', sortOrder: 5 },

  // Fjellmerker badges (unique peaks)
  { id: 'unique_peaks_5', category: 'fjellmerker', nameKey: 'badge.uniquePeaks5', descriptionKey: 'badge.uniquePeaks5Desc', requirementKey: 'badge.uniquePeaks5Req', threshold: 5, rarity: 'common', emoji: '🥾', sortOrder: 1 },
  { id: 'unique_peaks_15', category: 'fjellmerker', nameKey: 'badge.uniquePeaks15', descriptionKey: 'badge.uniquePeaks15Desc', requirementKey: 'badge.uniquePeaks15Req', threshold: 15, rarity: 'uncommon', emoji: '🧭', sortOrder: 2 },
  { id: 'unique_peaks_30', category: 'fjellmerker', nameKey: 'badge.uniquePeaks30', descriptionKey: 'badge.uniquePeaks30Desc', requirementKey: 'badge.uniquePeaks30Req', threshold: 30, rarity: 'rare', emoji: '🌄', sortOrder: 3 },
  { id: 'unique_peaks_50', category: 'fjellmerker', nameKey: 'badge.uniquePeaks50', descriptionKey: 'badge.uniquePeaks50Desc', requirementKey: 'badge.uniquePeaks50Req', threshold: 50, rarity: 'epic', emoji: '🦅', sortOrder: 4 },

  // Trening badges (total sessions)
  { id: 'sessions_25', category: 'trening', nameKey: 'badge.sessions25', descriptionKey: 'badge.sessions25Desc', requirementKey: 'badge.sessions25Req', threshold: 25, rarity: 'common', emoji: '💪', sortOrder: 1 },
  { id: 'sessions_50', category: 'trening', nameKey: 'badge.sessions50', descriptionKey: 'badge.sessions50Desc', requirementKey: 'badge.sessions50Req', threshold: 50, rarity: 'uncommon', emoji: '🔥', sortOrder: 2 },
  { id: 'sessions_100', category: 'trening', nameKey: 'badge.sessions100', descriptionKey: 'badge.sessions100Desc', requirementKey: 'badge.sessions100Req', threshold: 100, rarity: 'rare', emoji: '⚡', sortOrder: 3 },
  { id: 'sessions_250', category: 'trening', nameKey: 'badge.sessions250', descriptionKey: 'badge.sessions250Desc', requirementKey: 'badge.sessions250Req', threshold: 250, rarity: 'epic', emoji: '🏅', sortOrder: 4 },
  { id: 'sessions_500', category: 'trening', nameKey: 'badge.sessions500', descriptionKey: 'badge.sessions500Desc', requirementKey: 'badge.sessions500Req', threshold: 500, rarity: 'legendary', emoji: '🎖️', sortOrder: 5 },
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

// Compute badges for a user or child given their data
export async function computeUserBadges(userId: string, isChild = false): Promise<UserBadge[]> {
  // Get peak checkins
  const { data: checkins } = await supabase
    .from('peak_checkins')
    .select('peak_id, checked_in_at')
    .eq('user_id', userId);

  const totalCheckins = checkins?.length || 0;
  const uniquePeaks = new Set(checkins?.map(c => c.peak_id) || []).size;

  // Get workout sessions (only for non-child profiles)
  let totalSessions = 0;
  if (!isChild) {
    const { count } = await supabase
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    totalSessions = count || 0;
  }

  return BADGE_DEFINITIONS.filter(b => isChild ? b.category !== 'trening' : true).map(badge => {
    let progress = 0;
    if (badge.category === 'topper') progress = totalCheckins;
    else if (badge.category === 'fjellmerker') progress = uniquePeaks;
    else if (badge.category === 'trening') progress = totalSessions;

    const unlocked = progress >= badge.threshold;

    // Find earliest date when threshold was met for unlock date
    let unlockedAt: string | null = null;
    if (unlocked && badge.category === 'topper' && checkins) {
      const sorted = [...checkins].sort((a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime());
      if (sorted.length >= badge.threshold) {
        unlockedAt = sorted[badge.threshold - 1].checked_in_at;
      }
    } else if (unlocked && badge.category === 'fjellmerker' && checkins) {
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

    return { badge, unlocked, unlockedAt, progress };
  });
}

// Check for newly unlocked badges after an action
export function findNewlyUnlocked(prevBadges: UserBadge[], newBadges: UserBadge[]): UserBadge[] {
  const prevUnlocked = new Set(prevBadges.filter(b => b.unlocked).map(b => b.badge.id));
  return newBadges.filter(b => b.unlocked && !prevUnlocked.has(b.badge.id));
}
