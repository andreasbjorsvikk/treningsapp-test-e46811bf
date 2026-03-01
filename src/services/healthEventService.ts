import { HealthEvent } from '@/types/workout';

const STORAGE_KEY = 'treningslogg_health_events';

function load(): HealthEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return [];
}

function save(events: HealthEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

let events: HealthEvent[] = load();

export const healthEventService = {
  getAll(): HealthEvent[] {
    return [...events].sort((a, b) => new Date(b.dateFrom).getTime() - new Date(a.dateFrom).getTime());
  },

  add(event: Omit<HealthEvent, 'id'>): HealthEvent {
    const newEvent: HealthEvent = { ...event, id: crypto.randomUUID() };
    events = [newEvent, ...events];
    save(events);
    return newEvent;
  },

  update(id: string, data: Partial<Omit<HealthEvent, 'id'>>): void {
    const idx = events.findIndex(e => e.id === id);
    if (idx !== -1) {
      events[idx] = { ...events[idx], ...data };
      save(events);
    }
  },

  delete(id: string): void {
    events = events.filter(e => e.id !== id);
    save(events);
  },

  /** Get events active on a specific date (YYYY-MM-DD) */
  getForDate(dateKey: string): HealthEvent[] {
    return events.filter(e => {
      const from = e.dateFrom.slice(0, 10);
      const to = e.dateTo?.slice(0, 10) || from;
      return dateKey >= from && dateKey <= to;
    });
  },
};
