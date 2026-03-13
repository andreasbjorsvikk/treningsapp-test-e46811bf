import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';

type PeakFilter = 'all' | 'taken' | 'not_taken';
type HeatmapPeriod = 'year' | 'total';

interface MapSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  peakFilter: PeakFilter;
  onPeakFilterChange: (f: PeakFilter) => void;
  showAreaStats: boolean;
  onShowAreaStatsChange: (v: boolean) => void;
  showHeatmap: boolean;
  onShowHeatmapChange: (v: boolean) => void;
  heatmapPeriod: HeatmapPeriod;
  onHeatmapPeriodChange: (p: HeatmapPeriod) => void;
  onlyReachedThisYear: boolean;
  onOnlyReachedThisYearChange: (v: boolean) => void;
}

const peakFilters: { id: PeakFilter; label: string }[] = [
  { id: 'all', label: 'Alle' },
  { id: 'taken', label: 'Nådd' },
  { id: 'not_taken', label: 'Ikke nådd' },
];

const heatmapPeriods: { id: HeatmapPeriod; label: string }[] = [
  { id: 'year', label: 'I år' },
  { id: 'total', label: 'Totalt' },
];

const MapSettingsSheet = ({
  open, onOpenChange,
  peakFilter, onPeakFilterChange,
  showAreaStats, onShowAreaStatsChange,
  showHeatmap, onShowHeatmapChange,
  heatmapPeriod, onHeatmapPeriodChange,
  onlyReachedThisYear, onOnlyReachedThisYearChange,
}: MapSettingsSheetProps) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[75vh] rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-left">Kartinnstillinger</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 pt-2 pb-4">
          {/* Peak visibility filter */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Vis topper</Label>
            <div className="flex gap-2">
              {peakFilters.map(f => (
                <button
                  key={f.id}
                  onClick={() => onPeakFilterChange(f.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    peakFilter === f.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Only reached this year toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Vis kun topper nådd i år</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Andre topper vises som grå markører</p>
            </div>
            <Switch checked={onlyReachedThisYear} onCheckedChange={onOnlyReachedThisYearChange} />
          </div>

          {/* Area stats toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">Vis område-statistikk</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Kommuner med topper og din progresjon</p>
            </div>
            <Switch checked={showAreaStats} onCheckedChange={onShowAreaStatsChange} />
          </div>

          {/* Heatmap toggle */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">Vis heatmap av mine turer</Label>
                <p className="text-xs text-muted-foreground mt-0.5">GPS-løyper fra dine økter</p>
              </div>
              <Switch checked={showHeatmap} onCheckedChange={onShowHeatmapChange} />
            </div>
            {showHeatmap && (
              <div className="flex gap-2">
                {heatmapPeriods.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onHeatmapPeriodChange(p.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      heatmapPeriod === p.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MapSettingsSheet;
