import { HealthEvent } from '@/types/workout';
import { supabase } from '@/integrations/supabase/client';

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

// ========== Local service ==========
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

  getForDate(dateKey: string): HealthEvent[] {
    return events.filter(e => {
      const from = e.dateFrom.slice(0, 10);
      const to = e.dateTo?.slice(0, 10) || from;
      return dateKey >= from && dateKey <= to;
    });
  },
};

// ========== Supabase async service ==========
function rowToEvent(row: any): HealthEvent {
  return {
    id: row.id,
    type: row.type,
    dateFrom: row.date_from,
    dateTo: row.date_to || undefined,
    notes: row.notes || undefined,
  };
}

export const healthEventServiceAsync = {
  async getAll(userId: string): Promise<HealthEvent[]> {
    const { data, error } = await supabase
      .from('health_events')
      .select('*')
      .eq('user_id', userId)
      .order('date_from', { ascending: false });
    if (error) throw error;
    return (data || []).map(rowToEvent);
  },

  async add(userId: string, event: Omit<HealthEvent, 'id'>): Promise<HealthEvent> {
    const { data, error } = await supabase
      .from('health_events')
      .insert({
        user_id: userId,
        type: event.type,
        date_from: event.dateFrom,
        date_to: event.dateTo || null,
        notes: event.notes || null,
      })
      .select()
      .single();
    if (error) throw error;
    return rowToEvent(data);
  },

  async update(id: string, data: Partial<Omit<HealthEvent, 'id'>>): Promise<void> {
    const updateObj: any = {};
    if (data.type !== undefined) updateObj.type = data.type;
    if (data.dateFrom !== undefined) updateObj.date_from = data.dateFrom;
    if (data.dateTo !== undefined) updateObj.date_to = data.dateTo || null;
    if (data.notes !== undefined) updateObj.notes = data.notes || null;
    const { error } = await supabase.from('health_events').update(updateObj).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('health_events').delete().eq('id', id);
    if (error) throw error;
  },
};
