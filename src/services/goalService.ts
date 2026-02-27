import { WorkoutGoal } from '@/types/workout';

const STORAGE_KEY = 'treningslogg_goals';

function loadGoals(): WorkoutGoal[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function saveGoals(goals: WorkoutGoal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
}

let goals: WorkoutGoal[] = loadGoals();

export const goalService = {
  getAll(): WorkoutGoal[] {
    return [...goals];
  },

  add(goal: Omit<WorkoutGoal, 'id' | 'createdAt'>): WorkoutGoal {
    const newGoal: WorkoutGoal = {
      ...goal,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    goals = [newGoal, ...goals];
    saveGoals(goals);
    return newGoal;
  },

  update(id: string, data: Partial<Omit<WorkoutGoal, 'id' | 'createdAt'>>): void {
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
