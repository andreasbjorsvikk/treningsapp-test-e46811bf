import { ExtraGoal } from '@/types/workout';

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
};
