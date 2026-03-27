/**
 * React Query persister using IndexedDB via idb-keyval.
 * Caches query data for offline-first experience.
 */
import { get, set, del } from 'idb-keyval';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

const IDB_KEY = 'treningsapp_query_cache';

export function createIDBPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      await set(IDB_KEY, client);
    },
    restoreClient: async () => {
      return (await get<PersistedClient>(IDB_KEY)) ?? undefined;
    },
    removeClient: async () => {
      await del(IDB_KEY);
    },
  };
}
