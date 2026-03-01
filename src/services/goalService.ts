import { ExtraGoal } from '@/types/workout';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEY = 'treningslogg_goals';

function loadGoals(): ExtraGoal[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function saveGoals(goals: ExtraGoal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

let goals: ExtraGoal[] = loadGoals();

export const goalService = {
  getAll(): ExtraGoal[] {
    return [...goals];
  },

  add(goal: Omit<ExtraGoal, 'id' | 'createdAt'>): ExtraGoal {
    const newGoal: ExtraGoal = {
      ...goal,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    goals = [newGoal, ...goals];
    saveGoals(goals);
    return newGoal;
  },

  update(id: string, data: Partial<Omit<ExtraGoal, 'id' | 'createdAt'>>): void {
    const idx = goals.findIndex(g => g.id === id);
    if (idx === -1) return;
    goals[idx] = { ...goals[idx], ...data };
    saveGoals(goals);
  },

  delete(id: string): void {
    goals = goals.filter(g => g.id !== id);
    saveGoals(goals);
  },

  reorder(orderedIds: string[]): void {
    const map = new Map(goals.map(g => [g.id, g]));
    const reordered: ExtraGoal[] = [];
    for (const id of orderedIds) {
      const g = map.get(id);
      if (g) reordered.push(g);
    }
    goals.forEach(g => { if (!orderedIds.includes(g.id)) reordered.push(g); });
    goals = reordered;
    saveGoals(goals);
  },
};

function rowToGoal(row: any): ExtraGoal {
  return {
    id: row.id,
    metric: row.metric,
    period: row.period,
    activityType: row.activity_type,
    target: row.target,
    customStart: row.custom_start || undefined,
    customEnd: row.custom_end || undefined,
    showOnHome: row.show_on_home || false,
    createdAt: row.created_at,
  };
}

export const goalServiceAsync = {
  async getAll(userId: string): Promise<ExtraGoal[]> {
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data || []).map(rowToGoal);
  },

  async add(userId: string, goal: Omit<ExtraGoal, 'id' | 'createdAt'>): Promise<ExtraGoal> {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        user_id: userId,
        metric: goal.metric,
        period: goal.period,
        activity_type: goal.activityType,
        target: goal.target,
        custom_start: goal.customStart || null,
        custom_end: goal.customEnd || null,
        show_on_home: goal.showOnHome || false,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToGoal(data);
  },

  async update(id: string, data: Partial<Omit<ExtraGoal, 'id' | 'createdAt'>>): Promise<void> {
    const updateObj: any = {};
    if (data.metric !== undefined) updateObj.metric = data.metric;
    if (data.period !== undefined) updateObj.period = data.period;
    if (data.activityType !== undefined) updateObj.activity_type = data.activityType;
    if (data.target !== undefined) updateObj.target = data.target;
    if (data.customStart !== undefined) updateObj.custom_start = data.customStart || null;
    if (data.customEnd !== undefined) updateObj.custom_end = data.customEnd || null;
    if (data.showOnHome !== undefined) updateObj.show_on_home = data.showOnHome;
    const { error } = await supabase.from('goals').update(updateObj).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) throw error;
  },

  async reorder(userId: string, orderedIds: string[]): Promise<void> {
    // Update sort_order for each goal
    const updates = orderedIds.map((id, i) =>
      supabase.from('goals').update({ sort_order: i }).eq('id', id)
    );
    await Promise.all(updates);
  },
};
