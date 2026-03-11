import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { WorkoutSession, ExtraGoal, PrimaryGoalPeriod, HealthEvent } from '@/types/workout';
import { workoutService, workoutServiceAsync, computeStatsFromSessions } from '@/services/workoutService';
import { goalService, goalServiceAsync } from '@/services/goalService';
import { primaryGoalService, primaryGoalServiceAsync } from '@/services/primaryGoalService';
import { healthEventService, healthEventServiceAsync } from '@/services/healthEventService';
import { checkAllPRs, PRAlert } from '@/utils/prDetection';
import { getSessionsInPeriod, computeProgress } from '@/utils/goalUtils';
import { toast } from 'sonner';

export function useAppData() {
  const { user, loading: authLoading } = useAuth();
  const isOnline = !!user;

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [goals, setGoals] = useState<ExtraGoal[]>([]);
  const [primaryGoals, setPrimaryGoals] = useState<PrimaryGoalPeriod[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedGoal, setCompletedGoal] = useState<ExtraGoal | null>(null);
  const prevGoalStatesRef = useRef<Map<string, boolean>>(new Map());

  // Migrate localStorage data to database on first login
  const migrateLocalData = useCallback(async (userId: string) => {
    const MIGRATED_KEY = 'treningslogg_migrated';
    if (localStorage.getItem(MIGRATED_KEY)) return;

    const localSessions = workoutService.getAll();
    const localGoals = goalService.getAll();
    const localPrimaryGoals = primaryGoalService.getAll();
    const localHealthEvents = healthEventService.getAll();

    // Check if there's any real local data (not just mock defaults with ids 1-25)
    const hasRealLocalData = localSessions.some(s => !['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25'].includes(s.id));
    
    if (hasRealLocalData || localGoals.length > 0 || localPrimaryGoals.length > 0 || localHealthEvents.length > 0) {
      console.log('Migrating localStorage data to database...');
      try {
        // Migrate sessions (skip mock data)
        const realSessions = localSessions.filter(s => !['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25'].includes(s.id));
        for (const s of realSessions) {
          const { id, ...data } = s;
          await workoutServiceAsync.add(userId, data);
        }
        for (const g of localGoals) {
          const { id, createdAt, ...data } = g;
          await goalServiceAsync.add(userId, data);
        }
        for (const pg of localPrimaryGoals) {
          const { id, createdAt, ...data } = pg;
          await primaryGoalServiceAsync.add(userId, data);
        }
        for (const he of localHealthEvents) {
          const { id, ...data } = he;
          await healthEventServiceAsync.add(userId, data);
        }
        console.log('Migration complete!');
      } catch (err) {
        console.error('Migration failed:', err);
      }
    }

    localStorage.setItem(MIGRATED_KEY, 'true');
  }, []);

  // Load data
  const reload = useCallback(async () => {
    // Don't load anything until auth state is resolved
    if (authLoading) return;
    setLoading(true);
    try {
      if (isOnline && user) {
        // Check if migration needed
        await migrateLocalData(user.id);
        
        const [s, g, pg, he] = await Promise.all([
          workoutServiceAsync.getAll(user.id),
          goalServiceAsync.getAll(user.id),
          primaryGoalServiceAsync.getAll(user.id),
          healthEventServiceAsync.getAll(user.id),
        ]);
        setSessions(s);
        setGoals(g);
        setPrimaryGoals(pg);
        setHealthEvents(he);
      } else {
        setSessions(workoutService.getAll());
        setGoals(goalService.getAll());
        setPrimaryGoals(primaryGoalService.getAll());
        setHealthEvents(healthEventService.getAll());
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      if (!isOnline) {
        setSessions(workoutService.getAll());
        setGoals(goalService.getAll());
        setPrimaryGoals(primaryGoalService.getAll());
        setHealthEvents(healthEventService.getAll());
      }
    }
    setLoading(false);
  }, [isOnline, user, authLoading, migrateLocalData]);

  useEffect(() => { reload(); }, [reload]);

  // ===== Session operations =====
  const addSession = useCallback(async (data: Omit<WorkoutSession, 'id'>) => {
    // Snapshot goal completion states before adding session
    const prevStates = new Map<string, boolean>();
    for (const g of goals.filter(g => !g.archived)) {
      const periodSessions = getSessionsInPeriod(sessions, g.period, g.activityType, g.customStart, g.customEnd);
      const current = computeProgress(periodSessions, g.metric);
      prevStates.set(g.id, current >= g.target);
    }
    prevGoalStatesRef.current = prevStates;

    let newSession: WorkoutSession | undefined;
    if (isOnline && user) {
      newSession = await workoutServiceAsync.add(user.id, data);
    } else {
      newSession = workoutService.add(data);
    }
    await reload();

    // PR detection after reload so sessions list is fresh
    if (newSession) {
      const otherSessions = sessions.filter(s => s.id !== newSession!.id);
      const prAlerts = checkAllPRs(newSession, otherSessions);
      for (const pr of prAlerts) {
        toast.success(`🏆 Ny personlig rekord! ${pr.benchmark}: ${pr.newTime}${pr.improvement ? ` (${pr.improvement})` : ''}`, {
          duration: 6000,
        });
      }
    }
  }, [isOnline, user, reload, sessions, goals]);

  const updateSession = useCallback(async (id: string, data: Partial<Omit<WorkoutSession, 'id'>>) => {
    if (isOnline && user) {
      await workoutServiceAsync.update(id, data);
    } else {
      workoutService.update(id, data);
    }
    await reload();
  }, [isOnline, user, reload]);

  const deleteSession = useCallback(async (id: string) => {
    if (isOnline && user) {
      await workoutServiceAsync.delete(id);
    } else {
      workoutService.delete(id);
    }
    await reload();
  }, [isOnline, user, reload]);

  // ===== Goal operations =====
  const addGoal = useCallback(async (data: Omit<ExtraGoal, 'id' | 'createdAt'>) => {
    if (isOnline && user) {
      await goalServiceAsync.add(user.id, data);
    } else {
      goalService.add(data);
    }
    await reload();
  }, [isOnline, user, reload]);

  const updateGoal = useCallback(async (id: string, data: Partial<Omit<ExtraGoal, 'id' | 'createdAt'>>) => {
    if (isOnline && user) {
      await goalServiceAsync.update(id, data);
    } else {
      goalService.update(id, data);
    }
    await reload();
  }, [isOnline, user, reload]);

  const deleteGoal = useCallback(async (id: string) => {
    if (isOnline && user) {
      await goalServiceAsync.delete(id);
    } else {
      goalService.delete(id);
    }
    await reload();
  }, [isOnline, user, reload]);

  const reorderGoals = useCallback(async (orderedIds: string[]) => {
    if (isOnline && user) {
      await goalServiceAsync.reorder(user.id, orderedIds);
    } else {
      goalService.reorder(orderedIds);
    }
    await reload();
  }, [isOnline, user, reload]);

  // ===== Primary goal operations =====
  const addPrimaryGoal = useCallback(async (data: { inputPeriod: any; inputTarget: number; validFrom: string }) => {
    if (isOnline && user) {
      await primaryGoalServiceAsync.add(user.id, data);
    } else {
      primaryGoalService.add(data);
    }
    await reload();
  }, [isOnline, user, reload]);

  const updatePrimaryGoal = useCallback(async (id: string, data: any) => {
    if (isOnline && user) {
      await primaryGoalServiceAsync.update(id, data);
    } else {
      primaryGoalService.update(id, data);
    }
    await reload();
  }, [isOnline, user, reload]);

  const deletePrimaryGoal = useCallback(async (id: string) => {
    if (isOnline && user) {
      await primaryGoalServiceAsync.delete(id);
    } else {
      primaryGoalService.delete(id);
    }
    await reload();
  }, [isOnline, user, reload]);

  const clearPrimaryGoals = useCallback(async () => {
    if (isOnline && user) {
      await primaryGoalServiceAsync.clear(user.id);
    } else {
      primaryGoalService.clear();
    }
    await reload();
  }, [isOnline, user, reload]);

  const setPrimaryGoal = useCallback(async (data: { inputPeriod: any; inputTarget: number; startDate: string }) => {
    if (isOnline && user) {
      await primaryGoalServiceAsync.add(user.id, { inputPeriod: data.inputPeriod, inputTarget: data.inputTarget, validFrom: data.startDate });
    } else {
      primaryGoalService.set(data);
    }
    await reload();
  }, [isOnline, user, reload]);

  // ===== Health event operations =====
  const addHealthEvent = useCallback(async (data: Omit<HealthEvent, 'id'>) => {
    if (isOnline && user) {
      await healthEventServiceAsync.add(user.id, data);
    } else {
      healthEventService.add(data);
    }
    await reload();
  }, [isOnline, user, reload]);

  const updateHealthEvent = useCallback(async (id: string, data: Partial<Omit<HealthEvent, 'id'>>) => {
    if (isOnline && user) {
      await healthEventServiceAsync.update(id, data);
    } else {
      healthEventService.update(id, data);
    }
    await reload();
  }, [isOnline, user, reload]);

  const deleteHealthEvent = useCallback(async (id: string) => {
    if (isOnline && user) {
      await healthEventServiceAsync.delete(id);
    } else {
      healthEventService.delete(id);
    }
    await reload();
  }, [isOnline, user, reload]);

  // Computed stats
  const { weekly: weekStats, monthly: monthStats } = computeStatsFromSessions(sessions);

  // Get current primary goal  
  const currentPrimaryGoal = primaryGoals.length > 0
    ? (() => {
        const now = new Date().toISOString().slice(0, 10);
        const sorted = [...primaryGoals].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
        let active: PrimaryGoalPeriod | null = null;
        for (const p of sorted) {
          if (p.validFrom <= now) active = p;
          else break;
        }
        return active;
      })()
    : null;

  return {
    // Data
    sessions,
    goals,
    primaryGoals,
    currentPrimaryGoal,
    healthEvents,
    weekStats,
    monthStats,
    loading,
    isOnline,

    // Session ops
    addSession,
    updateSession,
    deleteSession,

    // Goal ops
    addGoal,
    updateGoal,
    deleteGoal,
    reorderGoals,

    // Primary goal ops
    addPrimaryGoal,
    updatePrimaryGoal,
    deletePrimaryGoal,
    clearPrimaryGoals,
    setPrimaryGoal,

    // Health event ops
    addHealthEvent,
    updateHealthEvent,
    deleteHealthEvent,

    // Reload
    reload,
  };
}
