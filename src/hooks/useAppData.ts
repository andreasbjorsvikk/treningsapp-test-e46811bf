/**
 * useAppData — Central data hook using React Query for offline-first caching.
 * All query keys are user-scoped. Data persists to IndexedDB via queryPersister.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WorkoutSession, ExtraGoal, PrimaryGoalPeriod, HealthEvent } from '@/types/workout';
import { workoutService, workoutServiceAsync, computeStatsFromSessions } from '@/services/workoutService';
import { goalService, goalServiceAsync } from '@/services/goalService';
import { primaryGoalService, primaryGoalServiceAsync } from '@/services/primaryGoalService';
import { healthEventService, healthEventServiceAsync } from '@/services/healthEventService';
import { enqueue } from '@/services/syncQueue';
import { checkAllPRs } from '@/utils/prDetection';
import { getSessionsInPeriod, computeProgress } from '@/utils/goalUtils';
import { toast } from 'sonner';

export function useAppData() {
  const { user, loading: authLoading } = useAuth();
  const { isOnline: networkOnline } = useNetworkStatus();
  const isOnline = !!user && networkOnline;
  const queryClient = useQueryClient();
  const userId = user?.id;

  // ===== React Query data sources (user-scoped, persisted via IDB) =====

  const sessionsQuery = useQuery({
    queryKey: ['app-data', 'sessions', userId],
    queryFn: () => workoutServiceAsync.getAll(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  const goalsQuery = useQuery({
    queryKey: ['app-data', 'goals', userId],
    queryFn: () => goalServiceAsync.getAll(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  const primaryGoalsQuery = useQuery({
    queryKey: ['app-data', 'primaryGoals', userId],
    queryFn: () => primaryGoalServiceAsync.getAll(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  const healthEventsQuery = useQuery({
    queryKey: ['app-data', 'healthEvents', userId],
    queryFn: () => healthEventServiceAsync.getAll(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    networkMode: 'offlineFirst',
  });

  const sessions = sessionsQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const primaryGoals = primaryGoalsQuery.data ?? [];
  const healthEvents = healthEventsQuery.data ?? [];

  // Loading: auth not ready OR first fetch in progress with no cached data
  const loading = authLoading || (!!userId && sessionsQuery.isPending && sessionsQuery.fetchStatus === 'fetching');

  // ===== Invalidate queries after sync queue flush =====
  useEffect(() => {
    const handler = () => {
      // Remove optimistic offline entries before refetch to prevent duplicates
      if (userId) {
        const sessKey = ['app-data', 'sessions', userId];
        const cached = queryClient.getQueryData<WorkoutSession[]>(sessKey);
        if (cached?.some(s => s.id.startsWith('offline_'))) {
          queryClient.setQueryData(sessKey, cached.filter(s => !s.id.startsWith('offline_')));
        }
      }
      queryClient.invalidateQueries({ queryKey: ['app-data'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    };
    window.addEventListener('sync-queue-flushed', handler);
    return () => window.removeEventListener('sync-queue-flushed', handler);
  }, [queryClient, userId]);

  // ===== Migration from localStorage (runs once per user) =====
  const migrateRef = useRef(false);
  useEffect(() => {
    if (!user || !isOnline || migrateRef.current) return;
    // User-scoped migration key to prevent re-runs
    const MIGRATED_KEY = `treningslogg_migrated_${user.id}`;
    if (localStorage.getItem(MIGRATED_KEY) || localStorage.getItem('treningslogg_migrated')) { migrateRef.current = true; return; }
    migrateRef.current = true;
    // Set flag immediately BEFORE migration to prevent concurrent runs
    localStorage.setItem(MIGRATED_KEY, 'true');

    (async () => {
      try {
        const localSessions = workoutService.getAll();
        const localGoals = goalService.getAll();
        const localPrimaryGoals = primaryGoalService.getAll();
        const localHealthEvents = healthEventService.getAll();

        const mockIds = new Set(['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25']);
        const hasRealLocalData = localSessions.some(s => !mockIds.has(s.id));

        if (hasRealLocalData || localGoals.length > 0 || localPrimaryGoals.length > 0 || localHealthEvents.length > 0) {
          console.log('Migrating localStorage data to database...');
          const realSessions = localSessions.filter(s => !mockIds.has(s.id));
          for (const s of realSessions) {
            const { id, ...data } = s;
            await workoutServiceAsync.add(user.id, data);
          }
          for (const g of localGoals) {
            const { id, createdAt, ...data } = g;
            await goalServiceAsync.add(user.id, data);
          }
          for (const pg of localPrimaryGoals) {
            const { id, createdAt, ...data } = pg;
            await primaryGoalServiceAsync.add(user.id, data);
          }
          for (const he of localHealthEvents) {
            const { id, ...data } = he;
            await healthEventServiceAsync.add(user.id, data);
          }
          console.log('Migration complete!');
        }
        localStorage.setItem(MIGRATED_KEY, 'true');
        queryClient.invalidateQueries({ queryKey: ['app-data'] });
      } catch (err) {
        console.error('Migration failed:', err);
      }
    })();
  }, [user, isOnline, queryClient]);

  // ===== Goal completion detection =====
  const [completedGoal, setCompletedGoal] = useState<ExtraGoal | null>(null);
  const prevGoalStatesRef = useRef<Map<string, boolean>>(new Map());

  const initialCheckDone = useRef(false);
  useEffect(() => {
    if (loading || initialCheckDone.current || goals.length === 0 || sessions.length === 0) return;
    initialCheckDone.current = true;

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
        return;
      }
    }
  }, [loading, goals, sessions]);

  useEffect(() => {
    if (prevGoalStatesRef.current.size === 0) return;
    const prevStates = prevGoalStatesRef.current;
    for (const g of goals.filter(g => !g.archived)) {
      const wasDone = prevStates.get(g.id);
      if (wasDone === false) {
        const periodSessions = getSessionsInPeriod(sessions, g.period, g.activityType, g.customStart, g.customEnd);
        const current = computeProgress(periodSessions, g.metric);
        if (current >= g.target) {
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

  const snapshotGoalStates = useCallback(() => {
    const prevStates = new Map<string, boolean>();
    for (const g of goals.filter(g => !g.archived)) {
      const periodSessions = getSessionsInPeriod(sessions, g.period, g.activityType, g.customStart, g.customEnd);
      const current = computeProgress(periodSessions, g.metric);
      prevStates.set(g.id, current >= g.target);
    }
    prevGoalStatesRef.current = prevStates;
  }, [goals, sessions]);

  // ===== Session mutations =====

  const addSession = useCallback(async (data: Omit<WorkoutSession, 'id'>) => {
    if (!user) return;
    snapshotGoalStates();
    const key = ['app-data', 'sessions', userId];

    let newSession: WorkoutSession;
    if (isOnline) {
      newSession = await workoutServiceAsync.add(user.id, data);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      // Use a deterministic temp id prefixed so we can identify offline-created entries
      const tempId = `offline_${crypto.randomUUID()}`;
      newSession = { ...data, id: tempId } as WorkoutSession;
      queryClient.setQueryData(key, (old: WorkoutSession[] | undefined) =>
        [newSession, ...(old || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
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
        _offline_temp_id: tempId,
      });
    }

    // PR detection
    const allSessions = queryClient.getQueryData<WorkoutSession[]>(key) || [];
    const otherSessions = allSessions.filter(s => s.id !== newSession.id);
    const prAlerts = checkAllPRs(newSession, otherSessions);
    for (const pr of prAlerts) {
      toast.success(`🏆 Ny personlig rekord! ${pr.benchmark}: ${pr.newTime}${pr.improvement ? ` (${pr.improvement})` : ''}`, { duration: 6000 });
    }
  }, [user, isOnline, queryClient, userId, snapshotGoalStates]);

  const updateSession = useCallback(async (id: string, data: Partial<Omit<WorkoutSession, 'id'>>) => {
    if (!user) return;
    const key = ['app-data', 'sessions', userId];
    if (isOnline) {
      await workoutServiceAsync.update(id, data);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      queryClient.setQueryData(key, (old: WorkoutSession[] | undefined) =>
        (old || []).map(s => s.id === id ? { ...s, ...data } : s)
      );
      const dbData: Record<string, unknown> = { id };
      if (data.type !== undefined) dbData.type = data.type;
      if (data.durationMinutes !== undefined) dbData.duration_minutes = data.durationMinutes;
      if (data.distance !== undefined) dbData.distance = data.distance;
      if (data.elevationGain !== undefined) dbData.elevation_gain = data.elevationGain;
      if (data.notes !== undefined) dbData.notes = data.notes;
      if (data.title !== undefined) dbData.title = data.title;
      if (data.date !== undefined) dbData.date = data.date;
      await enqueue('workout_sessions', 'update', dbData);
    }
  }, [user, isOnline, queryClient, userId]);

  const deleteSession = useCallback(async (id: string) => {
    if (!user) return;
    const key = ['app-data', 'sessions', userId];
    if (isOnline) {
      await workoutServiceAsync.delete(id);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      queryClient.setQueryData(key, (old: WorkoutSession[] | undefined) =>
        (old || []).filter(s => s.id !== id)
      );
      await enqueue('workout_sessions', 'delete', { id });
    }
  }, [user, isOnline, queryClient, userId]);

  // ===== Goal mutations =====

  const addGoal = useCallback(async (data: Omit<ExtraGoal, 'id' | 'createdAt'>) => {
    if (!user) return;
    const key = ['app-data', 'goals', userId];
    if (isOnline) {
      await goalServiceAsync.add(user.id, data);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      const tempGoal: ExtraGoal = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      queryClient.setQueryData(key, (old: ExtraGoal[] | undefined) => [tempGoal, ...(old || [])]);
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
    }
  }, [user, isOnline, queryClient, userId]);

  const updateGoal = useCallback(async (id: string, data: Partial<Omit<ExtraGoal, 'id' | 'createdAt'>>) => {
    if (!user) return;
    const key = ['app-data', 'goals', userId];
    if (isOnline) {
      await goalServiceAsync.update(id, data);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      queryClient.setQueryData(key, (old: ExtraGoal[] | undefined) =>
        (old || []).map(g => g.id === id ? { ...g, ...data } : g)
      );
      const dbData: Record<string, unknown> = { id };
      if (data.archived !== undefined) dbData.archived = data.archived;
      if (data.showOnHome !== undefined) dbData.show_on_home = data.showOnHome;
      if (data.target !== undefined) dbData.target = data.target;
      if (data.metric !== undefined) dbData.metric = data.metric;
      if (data.period !== undefined) dbData.period = data.period;
      if (data.repeating !== undefined) dbData.repeating = data.repeating;
      await enqueue('goals', 'update', dbData);
    }
  }, [user, isOnline, queryClient, userId]);

  const deleteGoal = useCallback(async (id: string) => {
    if (!user) return;
    const key = ['app-data', 'goals', userId];
    if (isOnline) {
      await goalServiceAsync.delete(id);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      queryClient.setQueryData(key, (old: ExtraGoal[] | undefined) => (old || []).filter(g => g.id !== id));
      await enqueue('goals', 'delete', { id });
    }
  }, [user, isOnline, queryClient, userId]);

  const reorderGoals = useCallback(async (orderedIds: string[]) => {
    if (!user) return;
    const key = ['app-data', 'goals', userId];
    queryClient.setQueryData(key, (old: ExtraGoal[] | undefined) => {
      if (!old) return old;
      const map = new Map(old.map(g => [g.id, g]));
      const reordered: ExtraGoal[] = [];
      for (const id of orderedIds) { const g = map.get(id); if (g) reordered.push(g); }
      old.forEach(g => { if (!orderedIds.includes(g.id)) reordered.push(g); });
      return reordered;
    });
    if (isOnline) {
      await goalServiceAsync.reorder(user.id, orderedIds);
    }
  }, [user, isOnline, queryClient, userId]);

  // ===== Primary goal mutations =====

  const addPrimaryGoal = useCallback(async (data: { inputPeriod: any; inputTarget: number; validFrom: string }) => {
    if (!user) return;
    const key = ['app-data', 'primaryGoals', userId];
    if (isOnline) {
      await primaryGoalServiceAsync.add(user.id, data);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      const temp: PrimaryGoalPeriod = {
        id: crypto.randomUUID(),
        inputPeriod: data.inputPeriod,
        inputTarget: data.inputTarget,
        validFrom: data.validFrom,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData(key, (old: PrimaryGoalPeriod[] | undefined) =>
        [...(old || []), temp].sort((a, b) => a.validFrom.localeCompare(b.validFrom))
      );
      await enqueue('primary_goal_periods', 'insert', {
        user_id: user.id,
        input_period: data.inputPeriod,
        input_target: data.inputTarget,
        valid_from: data.validFrom,
      });
    }
  }, [user, isOnline, queryClient, userId]);

  const updatePrimaryGoal = useCallback(async (id: string, data: any) => {
    if (!user) return;
    const key = ['app-data', 'primaryGoals', userId];
    if (isOnline) {
      await primaryGoalServiceAsync.update(id, data);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      queryClient.setQueryData(key, (old: PrimaryGoalPeriod[] | undefined) =>
        (old || []).map(p => p.id === id ? { ...p, ...data } : p)
      );
      const dbData: Record<string, unknown> = { id };
      if (data.inputPeriod !== undefined) dbData.input_period = data.inputPeriod;
      if (data.inputTarget !== undefined) dbData.input_target = data.inputTarget;
      if (data.validFrom !== undefined) dbData.valid_from = data.validFrom;
      await enqueue('primary_goal_periods', 'update', dbData);
    }
  }, [user, isOnline, queryClient, userId]);

  const deletePrimaryGoal = useCallback(async (id: string) => {
    if (!user) return;
    const key = ['app-data', 'primaryGoals', userId];
    if (isOnline) {
      await primaryGoalServiceAsync.delete(id);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      queryClient.setQueryData(key, (old: PrimaryGoalPeriod[] | undefined) => (old || []).filter(p => p.id !== id));
      await enqueue('primary_goal_periods', 'delete', { id });
    }
  }, [user, isOnline, queryClient, userId]);

  const clearPrimaryGoals = useCallback(async () => {
    if (!user) return;
    const key = ['app-data', 'primaryGoals', userId];
    queryClient.setQueryData(key, []);
    if (isOnline) {
      await primaryGoalServiceAsync.clear(user.id);
      await queryClient.invalidateQueries({ queryKey: key });
    }
  }, [user, isOnline, queryClient, userId]);

  const setPrimaryGoal = useCallback(async (data: { inputPeriod: any; inputTarget: number; startDate: string }) => {
    await addPrimaryGoal({ inputPeriod: data.inputPeriod, inputTarget: data.inputTarget, validFrom: data.startDate });
  }, [addPrimaryGoal]);

  // ===== Health event mutations =====

  const addHealthEvent = useCallback(async (data: Omit<HealthEvent, 'id'>) => {
    if (!user) return;
    const key = ['app-data', 'healthEvents', userId];
    if (isOnline) {
      await healthEventServiceAsync.add(user.id, data);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      const temp: HealthEvent = { ...data, id: crypto.randomUUID() };
      queryClient.setQueryData(key, (old: HealthEvent[] | undefined) => [temp, ...(old || [])]);
      await enqueue('health_events', 'insert', {
        user_id: user.id,
        type: data.type,
        date_from: data.dateFrom,
        date_to: data.dateTo || null,
        notes: data.notes || null,
      });
    }
  }, [user, isOnline, queryClient, userId]);

  const updateHealthEvent = useCallback(async (id: string, data: Partial<Omit<HealthEvent, 'id'>>) => {
    if (!user) return;
    const key = ['app-data', 'healthEvents', userId];
    if (isOnline) {
      await healthEventServiceAsync.update(id, data);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      queryClient.setQueryData(key, (old: HealthEvent[] | undefined) =>
        (old || []).map(e => e.id === id ? { ...e, ...data } : e)
      );
      const dbData: Record<string, unknown> = { id };
      if (data.type !== undefined) dbData.type = data.type;
      if (data.dateFrom !== undefined) dbData.date_from = data.dateFrom;
      if (data.dateTo !== undefined) dbData.date_to = data.dateTo;
      if (data.notes !== undefined) dbData.notes = data.notes;
      await enqueue('health_events', 'update', dbData);
    }
  }, [user, isOnline, queryClient, userId]);

  const deleteHealthEvent = useCallback(async (id: string) => {
    if (!user) return;
    const key = ['app-data', 'healthEvents', userId];
    if (isOnline) {
      await healthEventServiceAsync.delete(id);
      await queryClient.invalidateQueries({ queryKey: key });
    } else {
      queryClient.setQueryData(key, (old: HealthEvent[] | undefined) => (old || []).filter(e => e.id !== id));
      await enqueue('health_events', 'delete', { id });
    }
  }, [user, isOnline, queryClient, userId]);

  // ===== Computed values =====

  const { weekly: weekStats, monthly: monthStats } = useMemo(
    () => computeStatsFromSessions(sessions), [sessions]
  );

  const currentPrimaryGoal = useMemo(() => {
    if (primaryGoals.length === 0) return null;
    const now = new Date().toISOString().slice(0, 10);
    const sorted = [...primaryGoals].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
    let active: PrimaryGoalPeriod | null = null;
    for (const p of sorted) {
      if (p.validFrom <= now) active = p;
      else break;
    }
    return active;
  }, [primaryGoals]);

  // ===== Archive / dismiss goal =====

  const archiveGoal = useCallback(async (id: string) => {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    if (!goal.repeating) {
      const key = ['app-data', 'goals', userId];
      if (isOnline && user) {
        await goalServiceAsync.update(id, { archived: true, showOnHome: false });
        await queryClient.invalidateQueries({ queryKey: key });
      } else {
        queryClient.setQueryData(key, (old: ExtraGoal[] | undefined) =>
          (old || []).map(g => g.id === id ? { ...g, archived: true, showOnHome: false } : g)
        );
      }
    }
    setCompletedGoal(null);
  }, [goals, isOnline, user, queryClient, userId]);

  const dismissCompletedGoal = useCallback(() => setCompletedGoal(null), []);

  // ===== Reload (invalidate all app-data queries) =====

  const reload = useCallback(async (opts?: { checkGoals?: boolean }) => {
    if (opts?.checkGoals) snapshotGoalStates();
    await queryClient.invalidateQueries({ queryKey: ['app-data'] });
  }, [queryClient, snapshotGoalStates]);

  return {
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
    addSession,
    updateSession,
    deleteSession,
    addGoal,
    updateGoal,
    deleteGoal,
    reorderGoals,
    addPrimaryGoal,
    updatePrimaryGoal,
    deletePrimaryGoal,
    clearPrimaryGoals,
    setPrimaryGoal,
    addHealthEvent,
    updateHealthEvent,
    deleteHealthEvent,
    archiveGoal,
    dismissCompletedGoal,
    reload,
  };
}
