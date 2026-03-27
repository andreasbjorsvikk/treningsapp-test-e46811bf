import { Cloud, CloudOff, AlertTriangle } from 'lucide-react';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const SyncStatusIndicator = () => {
  const { hasPending, pendingCount, isFlushing } = useSyncQueue();
  const { isOnline } = useNetworkStatus();

  // Don't show anything if online and nothing pending
  if (isOnline && !hasPending) return null;

  const isOffline = !isOnline;

  // Offline with pending changes — most urgent
  if (isOffline && hasPending) {
    return (
      <div className="flex items-center gap-1.5 bg-destructive/15 text-destructive px-2.5 py-1 rounded-full animate-in fade-in">
        <CloudOff className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold tabular-nums">
          {pendingCount} ventende
        </span>
      </div>
    );
  }

  // Offline without pending changes
  if (isOffline) {
    return (
      <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full animate-in fade-in">
        <CloudOff className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] font-medium text-muted-foreground">
          Frakoblet
        </span>
      </div>
    );
  }

  // Online but flushing / has pending
  return (
    <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full animate-in fade-in">
      <Cloud className={`w-3.5 h-3.5 ${isFlushing ? 'animate-pulse' : ''}`} />
      <span className="text-[11px] font-semibold tabular-nums">
        {isFlushing ? 'Synkroniserer…' : `${pendingCount} ventende`}
      </span>
    </div>
  );
};

export default SyncStatusIndicator;
