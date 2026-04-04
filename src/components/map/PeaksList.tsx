import { Peak } from '@/data/peaks';
import { PeakCheckin, getDistanceMeters } from '@/services/peakCheckinService';
import { hapticsService } from '@/services/hapticsService';
import { Pencil, Trash2, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState, useMemo, useEffect, useRef } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { getPeakIcon } from '@/utils/peakIcons';
import { sortCountiesByProximity, findUserCounty } from '@/utils/norwegianCounties';
import { useTranslation } from '@/i18n/useTranslation';

type Filter = 'all' | 'not_taken' | 'taken';

interface PeaksListProps {
  peaks: Peak[];
  checkins: PeakCheckin[];
  onSelectPeak: (peak: Peak) => void;
  adminMode?: boolean;
  onEditPeak?: (peak: Peak) => void;
  onDeletePeak?: (peakId: string) => void;
}

const PeaksList = ({ peaks, checkins, onSelectPeak, adminMode, onEditPeak, onDeletePeak }: PeaksListProps) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [elevationRange, setElevationRange] = useState<[number, number]>([0, 2500]);
  const [municipalitySearch, setMunicipalitySearch] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const countyScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        // Auto-select user's county only if peaks have county data
        const userCounty = findUserCounty(loc.lat, loc.lng);
        if (userCounty) {
          const hasPeaksInCounty = peaks.some(p => p.county === userCounty);
          if (hasPeaksInCounty) setSelectedCounty(userCounty);
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, []);

  const checkedPeakIds = new Set(checkins.map(c => c.peak_id));

  // Get unique counties from peaks
  const counties = useMemo(() => {
    const countySet = new Set(peaks.map(p => p.county).filter(Boolean));
    const countyList = Array.from(countySet) as string[];
    if (userLocation) {
      return sortCountiesByProximity(countyList, userLocation.lat, userLocation.lng);
    }
    return countyList.sort();
  }, [peaks, userLocation]);

  // Get municipalities for selected county
  const municipalities = useMemo(() => {
    const filtered = selectedCounty
      ? peaks.filter(p => p.county === selectedCounty)
      : peaks;
    const areas = new Set(filtered.map(p => p.municipality).filter(Boolean));
    return Array.from(areas).sort() as string[];
  }, [peaks, selectedCounty]);

  const filteredMunicipalities = useMemo(() => {
    if (!municipalitySearch.trim()) return municipalities.slice(0, 10);
    return municipalities.filter(m => m.toLowerCase().includes(municipalitySearch.toLowerCase()));
  }, [municipalities, municipalitySearch]);

  const peaksWithDistance = useMemo(() => {
    return peaks.map(p => ({
      ...p,
      distance: userLocation
        ? getDistanceMeters(userLocation.lat, userLocation.lng, p.latitude, p.longitude)
        : null,
    }));
  }, [peaks, userLocation]);

  const hasActiveElevation = elevationRange[0] > 0 || elevationRange[1] < 2500;

  const filtered = useMemo(() => {
    let result = peaksWithDistance.filter(p => {
      if (filter === 'taken') return checkedPeakIds.has(p.id);
      if (filter === 'not_taken') return !checkedPeakIds.has(p.id);
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }

    if (hasActiveElevation) {
      result = result.filter(p => p.heightMoh >= elevationRange[0] && p.heightMoh <= elevationRange[1]);
    }

    if (selectedCounty) {
      result = result.filter(p => p.county === selectedCounty);
    }

    if (selectedMunicipality) {
      result = result.filter(p => p.municipality === selectedMunicipality);
    }

    result.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [peaksWithDistance, filter, searchQuery, elevationRange, selectedCounty, selectedMunicipality, checkedPeakIds, hasActiveElevation]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: t('mapSettings.all') },
    { id: 'taken', label: t('mapSettings.reached') },
    { id: 'not_taken', label: t('mapSettings.notReached') },
  ];

  const hasActiveFilters = hasActiveElevation || selectedMunicipality !== null || selectedCounty !== null;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('peaksList.searchPlaceholder')}
            className="pl-9 h-9"
          />
        </div>
        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <button className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 shrink-0 ${
              hasActiveFilters
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-foreground hover:bg-muted'
            }`}>
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-xs font-medium">Filter</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{t('peaksList.filterTitle')}</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 pt-4">
              {/* Elevation range slider */}
              <div className="space-y-3">
                <Label>
                  {t('peaksList.elevation')}: {elevationRange[0] > 0 || elevationRange[1] < 2500
                    ? `${elevationRange[0]}–${elevationRange[1]} moh`
                    : t('peaksList.noLimit')}
                </Label>
                <Slider
                  value={elevationRange}
                  onValueChange={(v) => setElevationRange(v as [number, number])}
                  min={0}
                  max={2500}
                  step={50}
                  minStepsBetweenThumbs={1}
                />
              </div>

              {/* County selector - horizontal scroll */}
              <div className="space-y-3">
                <Label>{t('peaksList.county')}</Label>
                <div ref={countyScrollRef} className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                  {counties.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setSelectedCounty(selectedCounty === c ? null : c);
                        setSelectedMunicipality(null);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                        selectedCounty === c
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Municipality filter (shown when county is selected) */}
              {selectedCounty && (
                <div className="space-y-3">
                  <Label>{t('peaksList.municipality')}</Label>
                  {selectedMunicipality ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-sm py-1 px-3 gap-1">
                        {selectedMunicipality}
                        <button onClick={() => setSelectedMunicipality(null)}>
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={municipalitySearch}
                          onChange={(e) => setMunicipalitySearch(e.target.value)}
                          placeholder={t('peaksList.searchMunicipality')}
                          className="pl-9"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {filteredMunicipalities.map(m => (
                          <button
                            key={m}
                            onClick={() => { setSelectedMunicipality(m); setMunicipalitySearch(''); }}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {hasActiveFilters && (
                <button
                  onClick={() => { setElevationRange([0, 2500]); setSelectedMunicipality(null); setSelectedCounty(null); }}
                  className="text-sm text-destructive font-medium"
                >
                  {t('peaksList.resetFilters')}
                </button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="text-xs text-muted-foreground self-center ml-auto">
          {filtered.length} {t('peaksList.peaks')}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">{t('peaksList.noPeaks')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(peak => {
            const isTaken = checkedPeakIds.has(peak.id);
            const isUnpublished = peak.isPublished === false;
            const iconSrc = getPeakIcon(peak.heightMoh, peak.id);
            return (
              <div
                key={peak.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <button
                  onClick={() => onSelectPeak(peak)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    isTaken ? 'bg-success/30 ring-2 ring-success/40' : isUnpublished ? 'bg-warning/15' : 'bg-muted'
                  }`}>
                    <img
                      src={iconSrc}
                      alt=""
                      className="w-6 h-6"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm truncate">{peak.name}</span>
                      {isUnpublished && (
                        <Badge variant="secondary" className="text-[10px] bg-warning/15 text-[hsl(var(--warning))] border-0 shrink-0">
                          {t('peaksList.unpublished')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{peak.heightMoh} moh</span>
                      {peak.area && <><span>·</span><span>{peak.area}</span></>}
                      {peak.distance !== null && (
                        <><span>·</span><span>{formatDistance(peak.distance)}</span></>
                      )}
                    </div>
                  </div>
                </button>
                {adminMode && (
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => onEditPeak?.(peak)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => onDeletePeak?.(peak.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PeaksList;
