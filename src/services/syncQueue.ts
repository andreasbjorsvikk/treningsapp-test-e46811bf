/**
 * Offline sync queue backed by IndexedDB via idb-keyval.
 *
 * Operations are queued when the user is offline and flushed
 * sequentially when connectivity returns.
 *
 * Design:
 * - Each operation has a unique `id` for idempotency
 * - Failed ops stay in the queue with incremented retryCount
 * - Last-write-wins for user-editable data
 * - Server-derived data (badges, standings) is refreshed after sync
 */
import { get, set } from 'idb-keyval';
import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'treningsapp_sync_queue';

export type SyncAction = 'insert' | 'update' | 'delete';

export type SyncTable =
  | 'workout_sessions'
  | 'goals'
  | 'primary_goal_periods'
  | 'health_events'
  | 'peak_checkins';

export interface SyncOperation {
  id: string; // unique per operation (crypto.randomUUID)
  table: SyncTable;
  action: SyncAction;
  /** For insert: full row data. For update: { id, ...partial }. For delete: { id }. */
  payload: Record<string, unknown>;
  createdAt: string; // ISO timestamp
  retryCount: number;
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Queue persistence helpers
// ---------------------------------------------------------------------------

async function loadQueue(): Promise<SyncOperation[]> {
  return (await get<SyncOperation[]>(QUEUE_KEY)) ?? [];
}

async function saveQueue(ops: SyncOperation[]): Promise<void> {
  await set(QUEUE_KEY, ops);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Enqueue a new operation. Duplicate ids are silently ignored. */
export async function enqueue(
  table: SyncTable,
  action: SyncAction,
  payload: Record<string, unknown>,
): Promise<void> {
  const queue = await loadQueue();

  const opId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Idempotency: skip if an identical operation already exists
  const isDuplicate = queue.some(
    (op) =>
      op.table === table &&
      op.action === action &&
      JSON.stringify(op.payload) === JSON.stringify(payload),
  );
  if (isDuplicate) return;

  queue.push({
    id: opId,
    table,
    action,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
    lastError: null,
  });

  await saveQueue(queue);
}

/** Return current queue length (for UI indicators). */
export async function queueLength(): Promise<number> {
  return (await loadQueue()).length;
}

/** Return all pending operations (read-only snapshot). */
export async function peekQueue(): Promise<SyncOperation[]> {
  return [...(await loadQueue())];
}

/** Clear the entire queue (use with care). */
export async function clearQueue(): Promise<void> {
  await saveQueue([]);
}

// ---------------------------------------------------------------------------
// Flush logic
// ---------------------------------------------------------------------------

const MAX_RETRIES = 5;
const BACKOFF_BASE_MS = 1000;

/**
 * Process all queued operations sequentially.
 * Returns the number of successfully processed operations.
 */
export async function flushQueue(): Promise<number> {
  const queue = await loadQueue();
  if (queue.length === 0) return 0;

  let processed = 0;
  const remaining: SyncOperation[] = [];

  for (const op of queue) {
    try {
      await executeOperation(op);
      processed++;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      op.retryCount++;
      op.lastError = errMsg;

      if (op.retryCount < MAX_RETRIES) {
        remaining.push(op);
      } else {
        // Drop after max retries — could be logged / reported
        console.error(`[syncQueue] Dropping operation after ${MAX_RETRIES} retries:`, op);
      }
    }
  }

  await saveQueue(remaining);
  return processed;
}

/**
 * Start a background flush loop that runs whenever the browser goes online.
 * Returns a cleanup function.
 */
export function startAutoFlush(onFlushed?: (count: number) => void): () => void {
  let flushing = false;

  const doFlush = async () => {
    if (flushing) return;
    flushing = true;
    try {
      const count = await flushQueue();
      if (count > 0) onFlushed?.(count);
    } finally {
      flushing = false;
    }
  };

  // Flush on online event
  window.addEventListener('online', doFlush);

  // Also try immediately if already online
  if (navigator.onLine) {
    doFlush();
  }

  return () => {
    window.removeEventListener('online', doFlush);
  };
}

// ---------------------------------------------------------------------------
// Execute a single operation against Supabase
// ---------------------------------------------------------------------------

async function executeOperation(op: SyncOperation): Promise<void> {
  const { table, action, payload } = op;

  switch (action) {
    case 'insert': {
      // Remove the local temp id if present, let DB generate
      const { localTempId, ...data } = payload as Record<string, unknown> & { localTempId?: string };
      const { error } = await supabase.from(table).insert(data as any);
      if (error) throw new Error(error.message);
      break;
    }
    case 'update': {
      const { id, ...data } = payload;
      if (!id) throw new Error('Update operation missing id');
      const { error } = await supabase
        .from(table)
        .update(data as any)
        .eq('id', id as string);
      if (error) throw new Error(error.message);
      break;
    }
    case 'delete': {
      const { id } = payload;
      if (!id) throw new Error('Delete operation missing id');
      const { error } = await supabase.from(table).delete().eq('id', id as string);
      if (error) throw new Error(error.message);
      break;
    }
    default:
      throw new Error(`Unknown sync action: ${action}`);
  }
}
