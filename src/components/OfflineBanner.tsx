import { WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSyncQueue } from '@/hooks/useSyncQueue';
import { useTranslation } from '@/i18n/useTranslation';

const OfflineBanner = () => {
  const { isOnline } = useNetworkStatus();
  const { hasPending, pendingCount, isFlushing } = useSyncQueue();
  const { t } = useTranslation();

  if (isOnline && !hasPending && !isFlushing) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] pointer-events-none flex justify-center pt-[env(safe-area-inset-top)]">
      <div className="pointer-events-auto mt-2 px-4 py-1.5 rounded-full text-xs font-medium shadow-lg border border-border backdrop-blur-md flex items-center gap-2 bg-background/90">
        {!isOnline ? (
          <>
            <WifiOff className="w-3.5 h-3.5 text-destructive" />
            <span className="text-foreground">Frakoblet</span>
            {hasPending && (
              <span className="text-muted-foreground">· {pendingCount} ventende</span>
            )}
          </>
        ) : isFlushing ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-foreground">Synkroniserer…</span>
          </>
        ) : hasPending ? (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-foreground">{pendingCount} ventende endringer</span>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default OfflineBanner;
