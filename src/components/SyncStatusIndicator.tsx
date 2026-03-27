import { Cloud, CloudOff } from 'lucide-react';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const SyncStatusIndicator = () => {
  const { hasPending, pendingCount, isFlushing } = useSyncQueue();
  const { isOnline } = useNetworkStatus();

  // Don't show anything if online and nothing pending
  if (isOnline && !hasPending) return null;

  const isOffline = !isOnline;
  const label = isOffline
    ? `Frakoblet – ${pendingCount} ventende endringer`
    : isFlushing
      ? 'Synkroniserer…'
      : `${pendingCount} ventende endringer`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-muted-foreground">
          {isOffline ? (
            <CloudOff className="w-4 h-4" />
          ) : (
            <Cloud className="w-4 h-4" />
          )}
          {pendingCount > 0 && (
            <span className="text-[10px] font-medium tabular-nums">
              {pendingCount}
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default SyncStatusIndicator;
