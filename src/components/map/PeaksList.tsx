import { Peak } from '@/data/peaks';
import { PeakCheckin, getDistanceMeters } from '@/services/peakCheckinService';
import { Mountain, Check, Pencil, Trash2, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useState, useMemo, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

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
  const [filter, setFilter] = useState<Filter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [minElevation, setMinElevation] = useState(0);
  const [municipalitySearch, setMunicipalitySearch] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, []);

  const checkedPeakIds = new Set(checkins.map(c => c.peak_id));

  // Get unique municipalities
  const municipalities = useMemo(() => {
    const areas = new Set(peaks.map(p => p.area).filter(Boolean));
    return Array.from(areas).sort();
  }, [peaks]);

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

    if (minElevation > 0) {
      result = result.filter(p => p.heightMoh >= minElevation);
    }

    if (selectedMunicipality) {
      result = result.filter(p => p.area === selectedMunicipality);
    }

    // Sort by distance (nearest first)
    result.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [peaksWithDistance, filter, searchQuery, minElevation, selectedMunicipality, checkedPeakIds]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m unna`;
    return `${(meters / 1000).toFixed(1).replace('.', ',')} km unna`;
  };

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'Alle' },
    { id: 'taken', label: 'Tatt' },
    { id: 'not_taken', label: 'Ikke tatt' },
  ];

  const hasActiveFilters = minElevation > 0 || selectedMunicipality !== null;

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Søk etter topp..."
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
          <SheetContent side="bottom" className="max-h-[70vh]">
            <SheetHeader>
              <SheetTitle>Filtrer topper</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 pt-4">
              {/* Elevation filter */}
              <div className="space-y-3">
                <Label>Minimum høyde: {minElevation > 0 ? `${minElevation} moh` : 'Ingen'}</Label>
                <Slider
                  value={[minElevation]}
                  onValueChange={([v]) => setMinElevation(v)}
                  min={0}
                  max={2500}
                  step={50}
                />
              </div>

              {/* Municipality filter */}
              <div className="space-y-3">
                <Label>Kommune</Label>
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
                        placeholder="Søk kommune..."
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

              {/* Clear button */}
              {hasActiveFilters && (
                <button
                  onClick={() => { setMinElevation(0); setSelectedMunicipality(null); }}
                  className="text-sm text-destructive font-medium"
                >
                  Nullstill filtre
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
        <span className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} topper</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Ingen topper å vise.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(peak => {
            const isTaken = checkedPeakIds.has(peak.id);
            const isUnpublished = peak.isPublished === false;
            return (
              <div
                key={peak.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <button
                  onClick={() => onSelectPeak(peak)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isTaken ? 'bg-success/15 text-success' : isUnpublished ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Mountain className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm truncate">{peak.name}</span>
                      {isTaken && (
                        <Badge variant="secondary" className="text-[10px] bg-success/15 text-success border-0 gap-0.5 shrink-0">
                          <Check className="w-3 h-3" />
                          Tatt
                        </Badge>
                      )}
                      {isUnpublished && (
                        <Badge variant="secondary" className="text-[10px] bg-warning/15 text-[hsl(var(--warning))] border-0 shrink-0">
                          Upublisert
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
