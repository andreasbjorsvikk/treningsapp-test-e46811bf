import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useOfflineMaps, RegionWithStatus } from '@/hooks/useOfflineMaps';
import { Download, Trash2, CheckCircle2, Loader2, HardDrive } from 'lucide-react';
import { isNativePlatform } from '@/utils/capacitor';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { hapticsService } from '@/services/hapticsService';

interface OfflineMapSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OfflineMapSheet = ({ open, onOpenChange }: OfflineMapSheetProps) => {
  const { regions, totalDownloadedMB, download, remove, loading } = useOfflineMaps();
  const isNative = isNativePlatform();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              Offline kart
            </span>
            {totalDownloadedMB > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                {totalDownloadedMB} MB lagret
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {!isNative && (
          <div className="bg-muted/50 rounded-lg px-3 py-2 mb-3 text-xs text-muted-foreground">
            Nedlasting av kartdata er kun tilgjengelig i mobilappen. Her kan du se hvilke regioner som er tilgjengelige.
          </div>
        )}

        <div className="overflow-y-auto max-h-[60vh] -mx-1 px-1 space-y-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            regions.map(region => (
              <RegionRow
                key={region.id}
                region={region}
                onDownload={() => {
                  hapticsService.impact('medium');
                  download(region);
                }}
                onRemove={() => {
                  hapticsService.impact('medium');
                  remove(region.id);
                }}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

function RegionRow({
  region,
  onDownload,
  onRemove,
}: {
  region: RegionWithStatus;
  onDownload: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {region.isDownloaded && (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
          )}
          <span className="font-medium text-sm truncate">{region.name}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {region.isDownloaded && region.downloadedAt
            ? `Lastet ned ${format(new Date(region.downloadedAt), 'd. MMM yyyy', { locale: nb })}`
            : `~${region.estimatedSizeMB} MB`}
        </div>
      </div>

      <div className="shrink-0">
        {region.isDownloading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : region.isDownloaded ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="text-primary hover:text-primary hover:bg-primary/10 h-8 px-2"
          >
            <Download className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default OfflineMapSheet;
