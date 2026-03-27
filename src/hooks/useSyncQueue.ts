/**
 * useSyncQueue — React hook for monitoring and interacting with the offline sync queue.
 * Starts auto-flush on mount and exposes queue state.
 */
import { useState, useEffect, useCallback } from 'react';
import { queueLength, flushQueue, startAutoFlush, peekQueue, type SyncOperation } from '@/services/syncQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function useSyncQueue() {
  const { isOnline } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [isFlushing, setIsFlushing] = useState(false);

  // Poll queue length periodically and after flushes
  const refreshCount = useCallback(async () => {
    setPendingCount(await queueLength());
  }, []);

  // Start auto-flush listener
  useEffect(() => {
    const cleanup = startAutoFlush(async (count) => {
      console.log(`[syncQueue] Flushed ${count} operations`);
      await refreshCount();
    });

    // Initial count
    refreshCount();

    return cleanup;
  }, [refreshCount]);

  // Flush when coming back online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      setIsFlushing(true);
      flushQueue().then(async () => {
        await refreshCount();
        setIsFlushing(false);
      });
    }
  }, [isOnline, pendingCount, refreshCount]);

  // Manual flush
  const flush = useCallback(async () => {
    setIsFlushing(true);
    try {
      await flushQueue();
      await refreshCount();
    } finally {
      setIsFlushing(false);
    }
  }, [refreshCount]);

  return {
    pendingCount,
    isFlushing,
    hasPending: pendingCount > 0,
    flush,
    refreshCount,
  };
}
