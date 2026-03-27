import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

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

const MapSettingsSheet = ({
  open, onOpenChange,
  peakFilter, onPeakFilterChange,
  showAreaStats, onShowAreaStatsChange,
  showHeatmap, onShowHeatmapChange,
  heatmapPeriod, onHeatmapPeriodChange,
  onlyReachedThisYear, onOnlyReachedThisYearChange,
}: MapSettingsSheetProps) => {
  const { t } = useTranslation();

  const peakFilters: { id: PeakFilter; label: string }[] = [
    { id: 'all', label: t('mapSettings.all') },
    { id: 'taken', label: t('mapSettings.reached') },
    { id: 'not_taken', label: t('mapSettings.notReached') },
  ];

  const heatmapPeriods: { id: HeatmapPeriod; label: string }[] = [
    { id: 'year', label: t('mapSettings.thisYear') },
    { id: 'total', label: t('mapSettings.total') },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[75vh] rounded-t-2xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-left">{t('mapSettings.title')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 pt-2 pb-4">
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('mapSettings.showPeaks')}</Label>
            <div className="flex gap-2">
              {peakFilters.map(f => (
                <button key={f.id} onClick={() => onPeakFilterChange(f.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                    peakFilter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}>{f.label}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">{t('mapSettings.onlyThisYear')}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t('mapSettings.onlyThisYearDesc')}</p>
            </div>
            <Switch checked={onlyReachedThisYear} onCheckedChange={onOnlyReachedThisYearChange} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-semibold">{t('mapSettings.areaStats')}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t('mapSettings.areaStatsDesc')}</p>
            </div>
            <Switch checked={showAreaStats} onCheckedChange={onShowAreaStatsChange} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold">{t('mapSettings.heatmap')}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t('mapSettings.heatmapDesc')}</p>
              </div>
              <Switch checked={showHeatmap} onCheckedChange={onShowHeatmapChange} />
            </div>
            {showHeatmap && (
              <div className="flex gap-2">
                {heatmapPeriods.map(p => (
                  <button key={p.id} onClick={() => onHeatmapPeriodChange(p.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      heatmapPeriod === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}>{p.label}</button>
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
