/**
 * Apple Health Service
 *
 * Manages Apple Health connection state, sync settings, and data import.
 * The actual HealthKit data reading requires native iOS (Capacitor plugin).
 * This service handles:
 * - Connection state in the database
 * - Settings (steps/calories/workouts enabled)
 * - Source priority logic with Strava
 * - Data storage for health metrics
 *
 * TODO (Native): Implement actual HealthKit data reading via Capacitor plugin
 * when building the iOS app. The plugin should call these service methods
 * to store fetched data.
 */

import { supabase } from '@/integrations/supabase/client';

export interface AppleHealthConnection {
  id: string;
  user_id: string;
  connected_at: string;
  disconnected_at: string | null;
  steps_enabled: boolean;
  calories_enabled: boolean;
  workouts_enabled: boolean;
  last_sync_at: string | null;
}

export interface DailyHealthMetric {
  id: string;
  user_id: string;
  date: string;
  steps: number | null;
  active_calories: number | null;
  source: string;
}

export const appleHealthService = {
  /**
   * Get the current Apple Health connection for the user
   */
  async getConnection(): Promise<AppleHealthConnection | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('apple_health_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data as AppleHealthConnection | null;
  },

  /**
   * Connect Apple Health (create connection record)
   * TODO (Native): This should be called after HealthKit authorization is granted
   */
  async connect(): Promise<AppleHealthConnection> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if Strava is connected to determine if workouts should be enabled
    const { data: stravaConn } = await supabase
      .from('strava_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const workoutsEnabled = !stravaConn; // Only enable workouts if Strava is NOT connected

    const { data, error } = await supabase
      .from('apple_health_connections')
      .upsert({
        user_id: user.id,
        connected_at: new Date().toISOString(),
        disconnected_at: null,
        steps_enabled: true,
        calories_enabled: true,
        workouts_enabled: workoutsEnabled,
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data as AppleHealthConnection;
  },

  /**
   * Disconnect Apple Health
   */
  async disconnect(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('apple_health_connections')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Update sync settings
   */
  async updateSettings(settings: {
    steps_enabled?: boolean;
    calories_enabled?: boolean;
    workouts_enabled?: boolean;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('apple_health_connections')
      .update({
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Disable workouts import (called when Strava is connected)
   */
  async disableWorkoutsImport(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const conn = await this.getConnection();
    if (conn && conn.workouts_enabled) {
      await this.updateSettings({ workouts_enabled: false });
    }
  },

  /**
   * Save daily health metrics (steps, calories)
   * TODO (Native): Called by the Capacitor HealthKit plugin after reading data
   */
  async saveDailyMetrics(metrics: {
    date: string;
    steps?: number;
    active_calories?: number;
  }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('daily_health_metrics')
      .upsert({
        user_id: user.id,
        date: metrics.date,
        steps: metrics.steps ?? null,
        active_calories: metrics.active_calories ?? null,
        source: 'apple_health',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date,source' });

    if (error) throw error;
  },

  /**
   * Get daily health metrics for a date range
   */
  async getMetrics(startDate: string, endDate: string): Promise<DailyHealthMetric[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('daily_health_metrics')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;
    return (data || []) as DailyHealthMetric[];
  },

  /**
   * Get today's step count
   */
  async getTodaySteps(): Promise<number | null> {
    const today = new Date().toISOString().split('T')[0];
    const metrics = await this.getMetrics(today, today);
    return metrics.length > 0 ? metrics[0].steps : null;
  },

  /**
   * Check if Strava is connected for source priority
   */
  async isStravaConnected(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('strava_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    return !!data;
  },

  /**
   * Handle Strava connection event:
   * Disable Apple Health workout imports and return info for UI modal
   */
  async onStravaConnected(): Promise<{ appleHealthWasImportingWorkouts: boolean }> {
    const conn = await this.getConnection();
    if (!conn) return { appleHealthWasImportingWorkouts: false };

    const wasImporting = conn.workouts_enabled;
    if (wasImporting) {
      await this.disableWorkoutsImport();
    }
    return { appleHealthWasImportingWorkouts: wasImporting };
  },

  /**
   * Handle Strava disconnection event:
   * Returns whether Apple Health is available to take over workouts
   */
  async onStravaDisconnected(): Promise<{ appleHealthConnected: boolean }> {
    const conn = await this.getConnection();
    return { appleHealthConnected: !!conn && !conn.disconnected_at };
  },

  /**
   * Enable Apple Health workouts import (called when user opts in after Strava disconnect)
   */
  async enableWorkoutsImport(): Promise<void> {
    await this.updateSettings({ workouts_enabled: true });
  },
};
