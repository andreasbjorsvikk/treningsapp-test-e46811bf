import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/i18n/useTranslation';

type PeakFilter = 'all' | 'taken' | 'not_taken';
type HeatmapPeriod = 'year' | 'total';
type MapStyleOption = 'outdoors' | 'satellite' | 'streets' | 'topo';
type AreaStatsMode = 'off' | 'kommune' | 'fylke';

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
  defaultMapStyle?: MapStyleOption;
  onDefaultMapStyleChange?: (s: MapStyleOption) => void;
  areaStatsMode?: AreaStatsMode;
  onAreaStatsModeChange?: (m: AreaStatsMode) => void;
}

const MapSettingsSheet = ({
  open, onOpenChange,
  peakFilter, onPeakFilterChange,
  showAreaStats, onShowAreaStatsChange,
  showHeatmap, onShowHeatmapChange,
  heatmapPeriod, onHeatmapPeriodChange,
  onlyReachedThisYear, onOnlyReachedThisYearChange,
  defaultMapStyle, onDefaultMapStyleChange,
  areaStatsMode = 'off', onAreaStatsModeChange,
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

  const mapStyles: { id: MapStyleOption; label: string }[] = [
    { id: 'outdoors', label: t('mapSettings.styleTerrain') },
    { id: 'topo', label: t('mapSettings.styleTopo') },
    { id: 'satellite', label: t('mapSettings.styleSatellite') },
    { id: 'streets', label: t('mapSettings.styleStreets') },
  ];

  const areaStatsModes: { id: AreaStatsMode; label: string }[] = [
    { id: 'off', label: t('mapSettings.off') },
    { id: 'kommune', label: t('mapSettings.municipalities') },
    { id: 'fylke', label: t('mapSettings.counties') },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-left">{t('mapSettings.title')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 pt-2 pb-4">
          {/* Default map style */}
          {onDefaultMapStyleChange && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t('mapSettings.defaultStyle')}</Label>
              <div className="flex gap-2">
                {mapStyles.map(s => (
                  <button key={s.id} onClick={() => onDefaultMapStyleChange(s.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      defaultMapStyle === s.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}>{s.label}</button>
                ))}
              </div>
            </div>
          )}

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

          {/* Area stats mode */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-semibold">{t('mapSettings.areaStats')}</Label>
              <p className="text-xs text-muted-foreground mt-0.5">{t('mapSettings.areaStatsDesc')}</p>
            </div>
            {onAreaStatsModeChange ? (
              <div className="flex gap-2">
                {areaStatsModes.map(m => (
                  <button key={m.id} onClick={() => {
                    onAreaStatsModeChange(m.id);
                    onShowAreaStatsChange(m.id !== 'off');
                  }}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                      areaStatsMode === m.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}>{m.label}</button>
                ))}
              </div>
            ) : (
              <Switch checked={showAreaStats} onCheckedChange={onShowAreaStatsChange} />
            )}
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
