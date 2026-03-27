import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WorkoutSession, ExtraGoal, PrimaryGoalPeriod, HealthEvent } from '@/types/workout';
import { workoutService, workoutServiceAsync, computeStatsFromSessions } from '@/services/workoutService';
import { goalService, goalServiceAsync } from '@/services/goalService';
import { primaryGoalService, primaryGoalServiceAsync } from '@/services/primaryGoalService';
import { healthEventService, healthEventServiceAsync } from '@/services/healthEventService';
import { enqueue } from '@/services/syncQueue';
import { checkAllPRs, PRAlert } from '@/utils/prDetection';
import { getSessionsInPeriod, computeProgress } from '@/utils/goalUtils';
import { toast } from 'sonner';

export function useAppData() {
  const { user, loading: authLoading } = useAuth();
  const { isOnline: networkOnline } = useNetworkStatus();
  const isOnline = !!user && networkOnline;

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [goals, setGoals] = useState<ExtraGoal[]>([]);
  const [primaryGoals, setPrimaryGoals] = useState<PrimaryGoalPeriod[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [completedGoal, setCompletedGoal] = useState<ExtraGoal | null>(null);
  const prevGoalStatesRef = useRef<Map<string, boolean>>(new Map());
  // Refs to access current state inside reload without adding to deps
  const goalsRef = useRef<ExtraGoal[]>([]);
  const sessionsRef = useRef<WorkoutSession[]>([]);
  goalsRef.current = goals;
  sessionsRef.current = sessions;

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
  const reload = useCallback(async (opts?: { checkGoals?: boolean }) => {
    // Don't load anything until auth state is resolved
    if (authLoading) return;

    // Snapshot goal states before reload if requested (use refs to avoid dep cycle)
    if (opts?.checkGoals && goalsRef.current.length > 0) {
      const prevStates = new Map<string, boolean>();
      for (const g of goalsRef.current.filter(g => !g.archived)) {
        const periodSessions = getSessionsInPeriod(sessionsRef.current, g.period, g.activityType, g.customStart, g.customEnd);
        const current = computeProgress(periodSessions, g.metric);
        prevStates.set(g.id, current >= g.target);
      }
      prevGoalStatesRef.current = prevStates;
    }

    setLoading(true);
    try {
      if (user && networkOnline) {
        // Online + logged in: fetch from database
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
        // Persist to localStorage as offline cache
        try {
          localStorage.setItem('treningslogg_sessions', JSON.stringify(s));
          localStorage.setItem('treningslogg_goals', JSON.stringify(g));
          localStorage.setItem('treningslogg_primary_goals', JSON.stringify(pg));
          localStorage.setItem('treningslogg_health_events', JSON.stringify(he));
        } catch { /* quota exceeded — non-critical */ }
      } else {
        // Offline or not logged in: use localStorage cache
        setSessions(workoutService.getAll());
        setGoals(goalService.getAll());
        setPrimaryGoals(primaryGoalService.getAll());
        setHealthEvents(healthEventService.getAll());
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      // Fallback to localStorage on network error
      setSessions(workoutService.getAll());
      setGoals(goalService.getAll());
      setPrimaryGoals(primaryGoalService.getAll());
      setHealthEvents(healthEventService.getAll());
    }
    setLoading(false);
  }, [user, networkOnline, authLoading, migrateLocalData]);

  useEffect(() => { reload(); }, [reload]);

  // Check for uncelebrated goal completions on login/load
  const initialCheckDone = useRef(false);
  useEffect(() => {
    if (loading || initialCheckDone.current || goals.length === 0 || sessions.length === 0) return;
    initialCheckDone.current = true;
    
    // Use sessionStorage to prevent re-showing on same browser session
    const sessionShownKey = 'treningslogg_goal_shown_this_session';
    const alreadyShownThisSession = new Set<string>(JSON.parse(sessionStorage.getItem(sessionShownKey) || '[]'));
    
    const celebratedKey = 'treningslogg_celebrated_goals';
    const celebrated = new Set<string>(JSON.parse(localStorage.getItem(celebratedKey) || '[]'));
    
    for (const g of goals.filter(g => !g.archived)) {
      if (celebrated.has(g.id)) continue;
      if (alreadyShownThisSession.has(g.id)) continue;
      const periodSessions = getSessionsInPeriod(sessions, g.period, g.activityType, g.customStart, g.customEnd);
      const current = computeProgress(periodSessions, g.metric);
      if (current >= g.target) {
        setCompletedGoal(g);
        celebrated.add(g.id);
        localStorage.setItem(celebratedKey, JSON.stringify([...celebrated]));
        alreadyShownThisSession.add(g.id);
        sessionStorage.setItem(sessionShownKey, JSON.stringify([...alreadyShownThisSession]));
        return; // Show one at a time
      }
    }
  }, [loading, goals, sessions]);

  // Detect goal completions after sessions change (from addSession or reload with checkGoals)
  useEffect(() => {
    if (prevGoalStatesRef.current.size === 0) return;
    const prevStates = prevGoalStatesRef.current;
    for (const g of goals.filter(g => !g.archived)) {
      const wasDone = prevStates.get(g.id);
      if (wasDone === false) {
        const periodSessions = getSessionsInPeriod(sessions, g.period, g.activityType, g.customStart, g.customEnd);
        const current = computeProgress(periodSessions, g.metric);
        if (current >= g.target) {
          // Mark as celebrated
          const celebratedKey = 'treningslogg_celebrated_goals';
          const celebrated = new Set<string>(JSON.parse(localStorage.getItem(celebratedKey) || '[]'));
          celebrated.add(g.id);
          localStorage.setItem(celebratedKey, JSON.stringify([...celebrated]));
          
          setCompletedGoal(g);
          prevGoalStatesRef.current = new Map();
          return;
        }
      }
    }
    prevGoalStatesRef.current = new Map();
  }, [sessions, goals]);

  const addSession = useCallback(async (data: Omit<WorkoutSession, 'id'>) => {
    // Snapshot goal completion states before adding session (use refs)
    const prevStates = new Map<string, boolean>();
    for (const g of goalsRef.current.filter(g => !g.archived)) {
      const periodSessions = getSessionsInPeriod(sessionsRef.current, g.period, g.activityType, g.customStart, g.customEnd);
      const current = computeProgress(periodSessions, g.metric);
      prevStates.set(g.id, current >= g.target);
    }
    prevGoalStatesRef.current = prevStates;

    let newSession: WorkoutSession | undefined;
    if (isOnline && user) {
      newSession = await workoutServiceAsync.add(user.id, data);
    } else if (user && !networkOnline) {
      // Logged in but offline: save locally + queue for sync
      newSession = workoutService.add(data);
      await enqueue('workout_sessions', 'insert', {
        user_id: user.id,
        type: data.type,
        date: data.date,
        duration_minutes: data.durationMinutes,
        distance: data.distance || null,
        elevation_gain: data.elevationGain || null,
        notes: data.notes || null,
        title: data.title || null,
        source_primary: (data as any).sourcePrimary || 'manual',
      });
    } else {
      newSession = workoutService.add(data);
    }
    await reload();

    // PR detection after reload so sessions list is fresh
    if (newSession) {
      const otherSessions = sessionsRef.current.filter(s => s.id !== newSession!.id);
      const prAlerts = checkAllPRs(newSession, otherSessions);
      for (const pr of prAlerts) {
        toast.success(`🏆 Ny personlig rekord! ${pr.benchmark}: ${pr.newTime}${pr.improvement ? ` (${pr.improvement})` : ''}`, {
          duration: 6000,
        });
      }
    }
  }, [isOnline, user, networkOnline, reload]);

  const updateSession = useCallback(async (id: string, data: Partial<Omit<WorkoutSession, 'id'>>) => {
    if (isOnline && user) {
      await workoutServiceAsync.update(id, data);
    } else if (user && !networkOnline) {
      workoutService.update(id, data);
      const dbData: Record<string, unknown> = { id };
      if (data.type !== undefined) dbData.type = data.type;
      if (data.durationMinutes !== undefined) dbData.duration_minutes = data.durationMinutes;
      if (data.distance !== undefined) dbData.distance = data.distance;
      if (data.elevationGain !== undefined) dbData.elevation_gain = data.elevationGain;
      if (data.notes !== undefined) dbData.notes = data.notes;
      if (data.title !== undefined) dbData.title = data.title;
      if (data.date !== undefined) dbData.date = data.date;
      await enqueue('workout_sessions', 'update', dbData);
    } else {
      workoutService.update(id, data);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  const deleteSession = useCallback(async (id: string) => {
    if (isOnline && user) {
      await workoutServiceAsync.delete(id);
    } else if (user && !networkOnline) {
      workoutService.delete(id);
      await enqueue('workout_sessions', 'delete', { id });
    } else {
      workoutService.delete(id);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  // ===== Goal operations =====
  const addGoal = useCallback(async (data: Omit<ExtraGoal, 'id' | 'createdAt'>) => {
    if (isOnline && user) {
      await goalServiceAsync.add(user.id, data);
    } else if (user && !networkOnline) {
      goalService.add(data);
      await enqueue('goals', 'insert', {
        user_id: user.id,
        metric: data.metric,
        period: data.period,
        target: data.target,
        activity_type: data.activityType || 'all',
        show_on_home: data.showOnHome || false,
        repeating: data.repeating || false,
        custom_start: data.customStart || null,
        custom_end: data.customEnd || null,
      });
    } else {
      goalService.add(data);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  const updateGoal = useCallback(async (id: string, data: Partial<Omit<ExtraGoal, 'id' | 'createdAt'>>) => {
    if (isOnline && user) {
      await goalServiceAsync.update(id, data);
    } else if (user && !networkOnline) {
      goalService.update(id, data);
      const dbData: Record<string, unknown> = { id };
      if (data.archived !== undefined) dbData.archived = data.archived;
      if (data.showOnHome !== undefined) dbData.show_on_home = data.showOnHome;
      if (data.target !== undefined) dbData.target = data.target;
      if (data.metric !== undefined) dbData.metric = data.metric;
      if (data.period !== undefined) dbData.period = data.period;
      if (data.repeating !== undefined) dbData.repeating = data.repeating;
      await enqueue('goals', 'update', dbData);
    } else {
      goalService.update(id, data);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  const deleteGoal = useCallback(async (id: string) => {
    if (isOnline && user) {
      await goalServiceAsync.delete(id);
    } else if (user && !networkOnline) {
      goalService.delete(id);
      await enqueue('goals', 'delete', { id });
    } else {
      goalService.delete(id);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  const reorderGoals = useCallback(async (orderedIds: string[]) => {
    if (isOnline && user) {
      await goalServiceAsync.reorder(user.id, orderedIds);
    } else {
      goalService.reorder(orderedIds);
      // Note: reorder offline doesn't queue individual updates — will re-sync order on reconnect
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  // ===== Primary goal operations =====
  const addPrimaryGoal = useCallback(async (data: { inputPeriod: any; inputTarget: number; validFrom: string }) => {
    if (isOnline && user) {
      await primaryGoalServiceAsync.add(user.id, data);
    } else if (user && !networkOnline) {
      primaryGoalService.add(data);
      await enqueue('primary_goal_periods', 'insert', {
        user_id: user.id,
        input_period: data.inputPeriod,
        input_target: data.inputTarget,
        valid_from: data.validFrom,
      });
    } else {
      primaryGoalService.add(data);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  const updatePrimaryGoal = useCallback(async (id: string, data: any) => {
    if (isOnline && user) {
      await primaryGoalServiceAsync.update(id, data);
    } else if (user && !networkOnline) {
      primaryGoalService.update(id, data);
      const dbData: Record<string, unknown> = { id };
      if (data.inputPeriod !== undefined) dbData.input_period = data.inputPeriod;
      if (data.inputTarget !== undefined) dbData.input_target = data.inputTarget;
      if (data.validFrom !== undefined) dbData.valid_from = data.validFrom;
      await enqueue('primary_goal_periods', 'update', dbData);
    } else {
      primaryGoalService.update(id, data);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  const deletePrimaryGoal = useCallback(async (id: string) => {
    if (isOnline && user) {
      await primaryGoalServiceAsync.delete(id);
    } else if (user && !networkOnline) {
      primaryGoalService.delete(id);
      await enqueue('primary_goal_periods', 'delete', { id });
    } else {
      primaryGoalService.delete(id);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

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
    } else if (user && !networkOnline) {
      primaryGoalService.set(data);
      await enqueue('primary_goal_periods', 'insert', {
        user_id: user.id,
        input_period: data.inputPeriod,
        input_target: data.inputTarget,
        valid_from: data.startDate,
      });
    } else {
      primaryGoalService.set(data);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  // ===== Health event operations =====
  const addHealthEvent = useCallback(async (data: Omit<HealthEvent, 'id'>) => {
    if (isOnline && user) {
      await healthEventServiceAsync.add(user.id, data);
    } else if (user && !networkOnline) {
      healthEventService.add(data);
      await enqueue('health_events', 'insert', {
        user_id: user.id,
        type: data.type,
        date_from: data.dateFrom,
        date_to: data.dateTo || null,
        notes: data.notes || null,
      });
    } else {
      healthEventService.add(data);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  const updateHealthEvent = useCallback(async (id: string, data: Partial<Omit<HealthEvent, 'id'>>) => {
    if (isOnline && user) {
      await healthEventServiceAsync.update(id, data);
    } else if (user && !networkOnline) {
      healthEventService.update(id, data);
      const dbData: Record<string, unknown> = { id };
      if (data.type !== undefined) dbData.type = data.type;
      if (data.dateFrom !== undefined) dbData.date_from = data.dateFrom;
      if (data.dateTo !== undefined) dbData.date_to = data.dateTo;
      if (data.notes !== undefined) dbData.notes = data.notes;
      await enqueue('health_events', 'update', dbData);
    } else {
      healthEventService.update(id, data);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

  const deleteHealthEvent = useCallback(async (id: string) => {
    if (isOnline && user) {
      await healthEventServiceAsync.delete(id);
    } else if (user && !networkOnline) {
      healthEventService.delete(id);
      await enqueue('health_events', 'delete', { id });
    } else {
      healthEventService.delete(id);
    }
    await reload();
  }, [isOnline, user, networkOnline, reload]);

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

  // Archive goal (handles repeating goals)
  const archiveGoal = useCallback(async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    
    if (goal.repeating) {
      // For repeating goals, keep it active but note the period was completed
      // The goal continues for the next period automatically
      // We just dismiss the overlay
    } else {
      // Non-repeating: archive it
      if (isOnline && user) {
        await goalServiceAsync.update(id, { archived: true, showOnHome: false });
      } else {
        goalService.update(id, { archived: true, showOnHome: false });
      }
      await reload();
    }
    setCompletedGoal(null);
  }, [goals, isOnline, user, reload]);

  const dismissCompletedGoal = useCallback(() => {
    setCompletedGoal(null);
  }, []);

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
    completedGoal,

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

    // Goal completion
    archiveGoal,
    dismissCompletedGoal,

    // Reload
    reload,
  };
}
