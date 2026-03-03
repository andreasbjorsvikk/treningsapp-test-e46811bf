import { WorkoutSession } from '@/types/workout';

// Running distance benchmarks for PR detection
const RUNNING_BENCHMARKS = [
  { label: '1 km', distance: 1 },
  { label: '3 km', distance: 3 },
  { label: '5 km', distance: 5 },
  { label: '10 km', distance: 10 },
  { label: 'Halvmaraton', distance: 21.1 },
  { label: 'Maraton', distance: 42.2 },
];

const CYCLING_BENCHMARKS = [
  { label: '10 km', distance: 10 },
  { label: '25 km', distance: 25 },
  { label: '50 km', distance: 50 },
  { label: '100 km', distance: 100 },
];

export interface PRAlert {
  type: 'running' | 'cycling';
  benchmark: string;
  newTime: string;
  oldTime: string | null;
  improvement: string | null;
  sessionId: string;
}

function formatPRTime(totalMinutes: number): string {
  const totalSeconds = Math.round(totalMinutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function getEstimatedTime(session: WorkoutSession, benchmarkKm: number): number | null {
  if (!session.distance || session.distance < benchmarkKm || session.distance <= 0) return null;
  const paceMinPerKm = session.durationMinutes / session.distance;
  return paceMinPerKm * benchmarkKm;
}

/**
 * Check if a new/updated session creates any new personal records.
 * Compares against all OTHER sessions (excluding the new one).
 */
export function detectNewPRs(
  newSession: WorkoutSession,
  allOtherSessions: WorkoutSession[]
): PRAlert[] {
  const alerts: PRAlert[] = [];

  const benchmarks =
    newSession.type === 'løping' ? RUNNING_BENCHMARKS :
    newSession.type === 'sykling' ? CYCLING_BENCHMARKS :
    null;

  if (!benchmarks || !newSession.distance || newSession.distance <= 0) return alerts;

  for (const bm of benchmarks) {
    const newTime = getEstimatedTime(newSession, bm.distance);
    if (newTime == null) continue;

    // Find previous best from other sessions of same type
    let previousBest: number | null = null;
    for (const s of allOtherSessions) {
      if (s.type !== newSession.type) continue;
      const t = getEstimatedTime(s, bm.distance);
      if (t != null && (previousBest == null || t < previousBest)) {
        previousBest = t;
      }
    }

    const isNewPR = previousBest == null || newTime < previousBest;
    if (!isNewPR) continue;

    let improvement: string | null = null;
    if (previousBest != null) {
      const diffSec = Math.round((previousBest - newTime) * 60);
      if (diffSec < 60) {
        improvement = `${diffSec}s raskere`;
      } else {
        const m = Math.floor(diffSec / 60);
        const s = diffSec % 60;
        improvement = s > 0 ? `${m}m ${s}s raskere` : `${m}m raskere`;
      }
    }

    alerts.push({
      type: newSession.type === 'løping' ? 'running' : 'cycling',
      benchmark: bm.label,
      newTime: formatPRTime(newTime),
      oldTime: previousBest != null ? formatPRTime(previousBest) : null,
      improvement,
      sessionId: newSession.id,
    });
  }

  return alerts;
}

// Check longest distance PRs
export function detectDistancePR(
  newSession: WorkoutSession,
  allOtherSessions: WorkoutSession[]
): PRAlert | null {
  if (!newSession.distance || newSession.distance <= 0) return null;
  if (!['løping', 'sykling'].includes(newSession.type)) return null;

  const sameType = allOtherSessions.filter(s => s.type === newSession.type);
  const previousMax = sameType.reduce((max, s) => Math.max(max, s.distance || 0), 0);

  if (newSession.distance > previousMax && previousMax > 0) {
    return {
      type: newSession.type === 'løping' ? 'running' : 'cycling',
      benchmark: 'Lengste distanse',
      newTime: `${newSession.distance.toFixed(1)} km`,
      oldTime: `${previousMax.toFixed(1)} km`,
      improvement: `+${(newSession.distance - previousMax).toFixed(1)} km`,
      sessionId: newSession.id,
    };
  }
  return null;
}

// Check longest duration PR
export function detectDurationPR(
  newSession: WorkoutSession,
  allOtherSessions: WorkoutSession[]
): PRAlert | null {
  const sameType = allOtherSessions.filter(s => s.type === newSession.type);
  const previousMax = sameType.reduce((max, s) => Math.max(max, s.durationMinutes), 0);

  if (newSession.durationMinutes > previousMax && previousMax > 0) {
    const formatDur = (min: number) => {
      const h = Math.floor(min / 60);
      const m = Math.round(min % 60);
      return h > 0 ? `${h}t ${m}m` : `${m}m`;
    };
    return {
      type: newSession.type === 'løping' ? 'running' : 'cycling',
      benchmark: 'Lengste økt',
      newTime: formatDur(newSession.durationMinutes),
      oldTime: formatDur(previousMax),
      improvement: `+${formatDur(newSession.durationMinutes - previousMax)}`,
      sessionId: newSession.id,
    };
  }
  return null;
}

/**
 * Run all PR detection checks and return any new records found.
 */
export function checkAllPRs(
  newSession: WorkoutSession,
  allOtherSessions: WorkoutSession[]
): PRAlert[] {
  const alerts: PRAlert[] = [];
  
  // Time PRs for benchmarks
  alerts.push(...detectNewPRs(newSession, allOtherSessions));
  
  // Distance PR
  const distPR = detectDistancePR(newSession, allOtherSessions);
  if (distPR) alerts.push(distPR);

  return alerts;
}
