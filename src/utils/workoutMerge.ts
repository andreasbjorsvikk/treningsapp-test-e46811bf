/**
 * Workout duplicate detection and merge engine.
 * Used when transitioning between Apple Health and Strava as workout sources.
 *
 * A workout is considered a duplicate/match if ALL of these are true:
 * 1. Start times are within ±15 minutes
 * 2. Activity types belong to the same canonical group
 * 3. At least 2 of 3 metrics (distance, elevation, duration) are within 20%
 */

import { areActivitiesInSameGroup } from '@/utils/activityTypeMapping';

export interface WorkoutCandidate {
  id: string;
  date: string; // ISO timestamp
  type: string;
  source: 'internal' | 'strava' | 'apple_health';
  durationMinutes: number;
  distance?: number | null;
  elevationGain?: number | null;
  stravaActivityId?: number | null;
  appleHealthWorkoutId?: string | null;
}

const TIME_TOLERANCE_MS = 15 * 60 * 1000; // 15 minutes
const METRIC_TOLERANCE = 0.20; // 20%

/**
 * Check if two numeric values are within the tolerance percentage of each other.
 * If both values are null/undefined/zero, they are NOT considered a match
 * (we need actual data to compare).
 */
function isWithinTolerance(a: number | null | undefined, b: number | null | undefined): boolean | null {
  const va = a ?? 0;
  const vb = b ?? 0;

  // Both zero or missing — inconclusive, don't count as matching
  if (va === 0 && vb === 0) return null;
  // One is zero, other isn't — not a match
  if (va === 0 || vb === 0) return false;

  const diff = Math.abs(va - vb);
  const avg = (va + vb) / 2;
  return (diff / avg) <= METRIC_TOLERANCE;
}

/**
 * Find matching workout from existing workouts for a new incoming workout.
 * Returns the matching workout or null.
 */
export function findMatchingWorkout(
  incoming: WorkoutCandidate,
  existing: WorkoutCandidate[]
): WorkoutCandidate | null {
  const incomingTime = new Date(incoming.date).getTime();

  for (const candidate of existing) {
    // 1. Check time proximity
    const candidateTime = new Date(candidate.date).getTime();
    if (Math.abs(incomingTime - candidateTime) > TIME_TOLERANCE_MS) continue;

    // 2. Check activity type compatibility
    if (!areActivitiesInSameGroup(incoming.type, incoming.source, candidate.type, candidate.source)) {
      continue;
    }

    // 3. Check at least 2 of 3 metrics within tolerance
    const checks = [
      isWithinTolerance(incoming.durationMinutes, candidate.durationMinutes),
      isWithinTolerance(incoming.distance, candidate.distance),
      isWithinTolerance(incoming.elevationGain, candidate.elevationGain),
    ];

    // Count conclusive matches
    const matchCount = checks.filter(c => c === true).length;
    const conclusiveCount = checks.filter(c => c !== null).length;

    // Need at least 2 matching metrics out of conclusive comparisons
    // If only 1 metric is conclusive and it matches, also accept (edge case: indoor workouts with only duration)
    if (matchCount >= 2 || (conclusiveCount === 1 && matchCount === 1)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Determine merge action for a list of incoming workouts against existing ones.
 */
export interface MergeResult {
  action: 'skip' | 'merge' | 'create';
  incoming: WorkoutCandidate;
  matchedWith?: WorkoutCandidate;
}

export function computeMergeActions(
  incomingWorkouts: WorkoutCandidate[],
  existingWorkouts: WorkoutCandidate[]
): MergeResult[] {
  return incomingWorkouts.map(incoming => {
    const match = findMatchingWorkout(incoming, existingWorkouts);

    if (match) {
      // If already linked to the same source ID, skip entirely
      if (
        (incoming.source === 'strava' && match.stravaActivityId === incoming.stravaActivityId) ||
        (incoming.source === 'apple_health' && match.appleHealthWorkoutId === incoming.appleHealthWorkoutId)
      ) {
        return { action: 'skip' as const, incoming, matchedWith: match };
      }

      // Otherwise merge: link the existing workout to the new source
      return { action: 'merge' as const, incoming, matchedWith: match };
    }

    return { action: 'create' as const, incoming };
  });
}
