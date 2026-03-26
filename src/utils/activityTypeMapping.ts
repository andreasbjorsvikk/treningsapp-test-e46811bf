/**
 * Activity type mapping layer between Strava, Apple Health, and internal types.
 * Normalizes workout types from different sources into comparable groups
 * for duplicate detection and merge logic.
 */

import { SessionType } from '@/types/workout';

// Canonical activity groups for cross-source matching
type ActivityGroup =
  | 'running'
  | 'cycling'
  | 'hiking'
  | 'swimming'
  | 'strength'
  | 'walking'
  | 'tennis'
  | 'yoga'
  | 'football'
  | 'rowing'
  | 'kayaking'
  | 'stairclimber'
  | 'treadmill'
  | 'other';

// Map internal SessionType → canonical group
const internalToGroup: Record<SessionType, ActivityGroup> = {
  løping: 'running',
  sykling: 'cycling',
  fjelltur: 'hiking',
  svømming: 'swimming',
  styrke: 'strength',
  gå: 'walking',
  tennis: 'tennis',
  yoga: 'yoga',
  fotball: 'football',
  roing: 'rowing',
  kajakk: 'kayaking',
  trappemaskin: 'stairclimber',
  tredemølle: 'treadmill',
  annet: 'other',
};

// Map Strava sport_type / type → canonical group
const stravaToGroup: Record<string, ActivityGroup> = {
  Run: 'running',
  TrailRun: 'running',
  VirtualRun: 'running',
  Ride: 'cycling',
  MountainBikeRide: 'cycling',
  GravelRide: 'cycling',
  VirtualRide: 'cycling',
  EBikeRide: 'cycling',
  Hike: 'hiking',
  Walk: 'walking',
  Swim: 'swimming',
  WeightTraining: 'strength',
  Workout: 'strength',
  Yoga: 'yoga',
  Soccer: 'football',
  Tennis: 'tennis',
  Rowing: 'rowing',
  Kayaking: 'kayaking',
  StairStepper: 'stairclimber',
};

// Map Apple Health HKWorkoutActivityType → canonical group
// These correspond to Apple HealthKit workout activity type identifiers
const appleHealthToGroup: Record<string, ActivityGroup> = {
  HKWorkoutActivityTypeRunning: 'running',
  HKWorkoutActivityTypeTrailRunning: 'running',
  HKWorkoutActivityTypeCycling: 'cycling',
  HKWorkoutActivityTypeHiking: 'hiking',
  HKWorkoutActivityTypeSwimming: 'swimming',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'strength',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'strength',
  HKWorkoutActivityTypeYoga: 'yoga',
  HKWorkoutActivityTypeSoccer: 'football',
  HKWorkoutActivityTypeTennis: 'tennis',
  HKWorkoutActivityTypeRowing: 'rowing',
  HKWorkoutActivityTypePaddleSports: 'kayaking',
  HKWorkoutActivityTypeStairClimbing: 'stairclimber',
  HKWorkoutActivityTypeWalking: 'walking',
};

/**
 * Get the canonical activity group for an internal SessionType
 */
export function getActivityGroup(type: SessionType): ActivityGroup {
  return internalToGroup[type] || 'other';
}

/**
 * Get the canonical activity group for a Strava activity type
 */
export function getStravaActivityGroup(stravaType: string): ActivityGroup {
  return stravaToGroup[stravaType] || 'other';
}

/**
 * Get the canonical activity group for an Apple Health workout type
 */
export function getAppleHealthActivityGroup(ahType: string): ActivityGroup {
  return appleHealthToGroup[ahType] || 'other';
}

/**
 * Check if two activity types (from any source) belong to the same group
 */
export function areActivitiesInSameGroup(
  typeA: string,
  sourceA: 'internal' | 'strava' | 'apple_health',
  typeB: string,
  sourceB: 'internal' | 'strava' | 'apple_health'
): boolean {
  const getGroup = (type: string, source: string): ActivityGroup => {
    if (source === 'internal') return internalToGroup[type as SessionType] || 'other';
    if (source === 'strava') return stravaToGroup[type] || 'other';
    if (source === 'apple_health') return appleHealthToGroup[type] || 'other';
    return 'other';
  };

  const groupA = getGroup(typeA, sourceA);
  const groupB = getGroup(typeB, sourceB);

  // 'other' should not match 'other' to avoid false positives
  if (groupA === 'other' && groupB === 'other') return false;

  return groupA === groupB;
}

/**
 * Map an Apple Health workout type to the closest internal SessionType
 */
export function appleHealthTypeToSessionType(ahType: string): SessionType {
  const group = getAppleHealthActivityGroup(ahType);
  const groupToInternal: Record<ActivityGroup, SessionType> = {
    running: 'løping',
    cycling: 'sykling',
    hiking: 'fjelltur',
    swimming: 'svømming',
    strength: 'styrke',
    walking: 'gå',
    tennis: 'tennis',
    yoga: 'yoga',
    football: 'fotball',
    rowing: 'roing',
    kayaking: 'kajakk',
    stairclimber: 'trappemaskin',
    treadmill: 'tredemølle',
    other: 'annet',
  };
  return groupToInternal[group] || 'annet';
}
