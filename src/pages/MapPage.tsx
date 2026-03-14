import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Peak } from '@/data/peaks';
import { getUserCheckins, PeakCheckin } from '@/services/peakCheckinService';
import { fetchPeaks, dbPeakToLegacy, createPeak, updatePeak, deletePeak, DbPeak } from '@/services/peakDbService';
import { fetchPendingSuggestions, PeakSuggestion } from '@/services/peakSuggestionService';
import MapSubTabs, { MapSubTab } from '@/components/map/MapSubTabs';
import MapView from '@/components/map/MapView';
import PeaksList from '@/components/map/PeaksList';
import PeakDetailDrawer from '@/components/map/PeakDetailDrawer';
import AdminPeakForm from '@/components/map/AdminPeakForm';
import AdminSuggestionsDrawer from '@/components/map/AdminSuggestionsDrawer';
import SuggestPeakDrawer from '@/components/map/SuggestPeakDrawer';
import MapSettingsSheet from '@/components/map/MapSettingsSheet';
import PeakFeed from '@/components/map/PeakFeed';
import GlobalLeaderboard from '@/components/map/GlobalLeaderboard';
import AdminDashboard from '@/components/map/AdminDashboard';
import MapTutorial from '@/components/map/MapTutorial';
import ARView from '@/components/map/ARView';
import { Settings2 } from 'lucide-react';
import { toast } from 'sonner';

type PeakFilter = 'all' | 'taken' | 'not_taken';
type HeatmapPeriod = 'year' | 'total';

const MapPage = () => {
  const { user } = useAuth();
  const { adminMode } = useAdmin();
  const [subTab, setSubTab] = useState<MapSubTab>('kart');
  const [checkins, setCheckins] = useState<PeakCheckin[]>([]);
  const [selectedPeak, setSelectedPeak] = useState<Peak | null>(null);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [dbPeaks, setDbPeaks] = useState<DbPeak[]>([]);

  // Admin state
  const [addMode, setAddMode] = useState(false);
  const [addCoords, setAddCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [editingPeak, setEditingPeak] = useState<DbPeak | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [routeStartPickForPeak, setRouteStartPickForPeak] = useState<DbPeak | null>(null);
  const [routeStartCoords, setRouteStartCoords] = useState<{lat: number, lng: number} | null>(null);
  const [mapClickEvent, setMapClickEvent] = useState<{lat: number, lng: number, timestamp: number} | null>(null);
  const [waypointClickEvent, setWaypointClickEvent] = useState<{index: number, timestamp: number} | null>(null);
  const [waypointDragEvent, setWaypointDragEvent] = useState<{index: number, lat: number, lng: number, timestamp: number} | null>(null);

  // User suggestion state
  const [suggestCoords, setSuggestCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Active route
  const [activeRouteGeojson, setActiveRouteGeojson] = useState<any>(null);
  const [activeRoutePeakId, setActiveRoutePeakId] = useState<string | null>(null);
  const [previewWaypoints, setPreviewWaypoints] = useState<{lat: number, lng: number}[]>([]);

  // Map settings
  const [showSettings, setShowSettings] = useState(false);
  const [peakFilter, setPeakFilter] = useState<PeakFilter>('all');
  const [showAreaStats, setShowAreaStats] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapPeriod, setHeatmapPeriod] = useState<HeatmapPeriod>('year');
  const [onlyReachedThisYear, setOnlyReachedThisYear] = useState(false);

  // Suggested peaks (pending, visible to all)
  const [suggestedPeaks, setSuggestedPeaks] = useState<PeakSuggestion[]>([]);

  // Track if route was shown from topper tab for back navigation
  const [routeFromTopperPeak, setRouteFromTopperPeak] = useState<Peak | null>(null);

  const checkedPeakIds = useMemo(() => new Set(checkins.map(c => c.peak_id)), [checkins]);

  // Filter peaks for map display
  const filteredPeaks = useMemo(() => {
    if (peakFilter === 'all') return peaks;
    if (peakFilter === 'taken') return peaks.filter(p => checkedPeakIds.has(p.id));
    return peaks.filter(p => !checkedPeakIds.has(p.id));
  }, [peaks, peakFilter, checkedPeakIds]);

  const loadPeaks = useCallback(async () => {
    try {
      const data = await fetchPeaks();
      setDbPeaks(data);
      setPeaks(data.map(dbPeakToLegacy));
    } catch {
      // silent
    }
  }, []);

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUserCheckins(user.id);
      setCheckins(data);
    } catch {
      // silent
    }
  }, [user]);

  useEffect(() => { loadPeaks(); }, [loadPeaks]);
  useEffect(() => { fetchCheckins(); }, [fetchCheckins]);

  // Load pending suggestions for all users
  useEffect(() => {
    if (!user) return;
    fetchPendingSuggestions().then(setSuggestedPeaks).catch(() => {});
  }, [user]);

  const [peakOpenedFromTopper, setPeakOpenedFromTopper] = useState(false);

  const handleSelectPeak = (peak: Peak) => {
    setPeakOpenedFromTopper(subTab === 'topper');
    setSelectedPeak(peak);
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (adminMode && addMode) {
      setAddCoords({ lat, lng });
      setAddMode(false);
    } else if (adminMode && routeStartPickForPeak) {
      setRouteStartCoords({ lat, lng });
      setEditingPeak(routeStartPickForPeak);
      setRouteStartPickForPeak(null);
    } else if (adminMode && editingPeak) {
      setMapClickEvent({ lat, lng, timestamp: Date.now() });
    }
  };

  const handleCreatePeak = async (data: any) => {
    if (!user) return;
    await createPeak({ ...data, created_by: user.id });
    toast.success('Toppen ble opprettet');
    loadPeaks();
  };

  const handleUpdatePeak = async (data: any) => {
    if (!editingPeak) return;
    await updatePeak(editingPeak.id, data);
    toast.success('Toppen ble oppdatert');
    loadPeaks();
  };

  const handleDeletePeak = async (peakId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne toppen?')) return;
    await deletePeak(peakId);
    toast.success('Toppen ble slettet');
    loadPeaks();
  };

  const handleEditPeak = (peak: Peak) => {
    const dbPeak = dbPeaks.find(p => p.id === peak.id);
    if (dbPeak) {
      setEditingPeak(dbPeak);
      setSelectedPeak(null);
    }
  };

  const handleMarkerDrag = async (peakId: string, lat: number, lng: number) => {
    await updatePeak(peakId, { latitude: lat, longitude: lng });
    toast.success('Posisjon oppdatert');
    loadPeaks();
  };

  const handleLongPress = (lat: number, lng: number) => {
    if (!adminMode) setSuggestCoords({ lat, lng });
  };

  const handlePickRouteStart = () => {
    setRouteStartPickForPeak(editingPeak);
    setEditingPeak(null);
    toast.info('Trykk på kartet for å velge startpunkt for ruten.');
  };

  const handleShowRoute = (peak: Peak, fromTopper?: boolean) => {
    if (peak.route_status === 'approved' && peak.route_geojson) {
      if (fromTopper) setRouteFromTopperPeak(peak);
      else setRouteFromTopperPeak(null);
      setSubTab('kart');
      setActiveRouteGeojson(peak.route_geojson);
      setActiveRoutePeakId(peak.id);
      setTimeout(() => {
        const evt = new CustomEvent('zoom-to-route', { detail: peak.route_geojson });
        window.dispatchEvent(evt);
      }, 300);
    }
  };

  const handleHideRoute = () => {
    setActiveRouteGeojson(null);
    setActiveRoutePeakId(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)]">
      {/* Sub-tab bar */}
      <div className="px-4 pt-3 pb-2">
        <MapSubTabs active={subTab} onChange={setSubTab} showAdmin={adminMode} />
      </div>

      {/* Admin toolbar */}
      {adminMode && subTab === 'kart' && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          <button
            onClick={() => setAddMode(!addMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              addMode ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground hover:bg-muted'
            }`}
          >
            {addMode ? '✕ Avbryt' : '+ Legg til topp'}
          </button>
          <button
            onClick={() => setShowSuggestions(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-background text-foreground hover:bg-muted transition-colors"
          >
            📋 Forslag
          </button>
        </div>
      )}
      {adminMode && addMode && subTab === 'kart' && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            Trykk på kartet for å velge posisjon for ny topp.
          </p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0">
        {subTab === 'kart' && (
          <div className="relative w-full h-full">
            <MapView
              peaks={filteredPeaks}
              checkins={checkins}
              onSelectPeak={handleSelectPeak}
              adminMode={adminMode}
              addMode={addMode || !!routeStartPickForPeak}
              onMapClick={handleMapClick}
              onMarkerDrag={handleMarkerDrag}
              onEditPeak={handleEditPeak}
              onDeletePeak={handleDeletePeak}
              onLongPress={handleLongPress}
              routeGeojson={activeRouteGeojson}
              onClearRoute={() => setActiveRouteGeojson(null)}
              previewWaypoints={previewWaypoints}
              onWaypointClick={(index) => setWaypointClickEvent({ index, timestamp: Date.now() })}
              onWaypointDrag={(index, lat, lng) => setWaypointDragEvent({ index, lat, lng, timestamp: Date.now() })}
              showHeatmap={showHeatmap}
              heatmapPeriod={heatmapPeriod}
              showAreaStats={showAreaStats}
              onlyReachedThisYear={onlyReachedThisYear}
              suggestedPeaks={suggestedPeaks}
            />
            {activeRouteGeojson && (
              <button
                onClick={() => {
                  if (routeFromTopperPeak) {
                    handleHideRoute();
                    setSubTab('topper');
                    setSelectedPeak(routeFromTopperPeak);
                    setRouteFromTopperPeak(null);
                  } else {
                    handleHideRoute();
                  }
                }}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full text-xs font-semibold shadow-lg border border-border bg-background/95 backdrop-blur-sm text-foreground hover:bg-muted transition-colors flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {routeFromTopperPeak ? (
                    <><polyline points="15 18 9 12 15 6"/></>
                  ) : (
                    <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  )}
                </svg>
                {routeFromTopperPeak ? 'Tilbake' : 'Skjul rute'}
              </button>
            )}
            {/* Settings button bottom-left */}
            <button
              onClick={() => setShowSettings(true)}
              className="absolute bottom-4 left-4 z-20 p-3 rounded-full shadow-lg border border-border bg-background/95 backdrop-blur-sm text-foreground hover:bg-muted transition-colors"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <MapTutorial />
          </div>
        )}

        {subTab === 'topper' && (
          <div className="h-full overflow-y-auto">
            <PeaksList
              peaks={peaks}
              checkins={checkins}
              onSelectPeak={handleSelectPeak}
              adminMode={adminMode}
              onEditPeak={handleEditPeak}
              onDeletePeak={handleDeletePeak}
            />
          </div>
        )}

        {subTab === 'feed' && (
          <div className="h-full overflow-y-auto">
            <PeakFeed />
          </div>
        )}

        {subTab === 'lederliste' && (
          <div className="h-full overflow-y-auto">
            <GlobalLeaderboard />
          </div>
        )}

        {subTab === 'ar' && (
          <div className="h-full">
            <ARView
              peaks={peaks}
              checkins={checkins}
              onSelectPeak={handleSelectPeak}
            />
          </div>
        )}

        {subTab === 'admin' && adminMode && (
          <div className="h-full overflow-y-auto">
            <AdminDashboard />
          </div>
        )}
      </div>

      {/* Map settings sheet */}
      <MapSettingsSheet
        open={showSettings}
        onOpenChange={setShowSettings}
        peakFilter={peakFilter}
        onPeakFilterChange={setPeakFilter}
        showAreaStats={showAreaStats}
        onShowAreaStatsChange={setShowAreaStats}
        showHeatmap={showHeatmap}
        onShowHeatmapChange={setShowHeatmap}
        heatmapPeriod={heatmapPeriod}
        onHeatmapPeriodChange={setHeatmapPeriod}
        onlyReachedThisYear={onlyReachedThisYear}
        onOnlyReachedThisYearChange={setOnlyReachedThisYear}
      />

      {/* Peak detail drawer */}
      <PeakDetailDrawer
        peak={selectedPeak}
        open={!!selectedPeak}
        onClose={() => setSelectedPeak(null)}
        checkins={checkins}
        onCheckinSuccess={fetchCheckins}
        adminMode={adminMode}
        onEdit={handleEditPeak}
        onDelete={handleDeletePeak}
        onShowRoute={handleShowRoute}
        onHideRoute={handleHideRoute}
        isRouteShown={!!activeRoutePeakId && activeRoutePeakId === selectedPeak?.id}
      />

      {/* Admin: Add new peak form */}
      {addCoords && (
        <AdminPeakForm
          open={!!addCoords}
          onClose={() => setAddCoords(null)}
          onSave={handleCreatePeak}
          initial={{ latitude: addCoords.lat, longitude: addCoords.lng }}
          title="Legg til ny topp"
        />
      )}

      {/* Admin: Edit peak form */}
      {editingPeak && (
        <AdminPeakForm
          open={!!editingPeak}
          onClose={() => { setEditingPeak(null); setRouteStartCoords(null); setActiveRouteGeojson(null); }}
          onSave={handleUpdatePeak}
          initial={editingPeak}
          title="Rediger topp"
          peakId={editingPeak.id}
          onPickRouteStart={handlePickRouteStart}
          routeStartCoordsProp={routeStartCoords}
          onPreviewRoute={(geojson) => setActiveRouteGeojson(geojson)}
          mapClickEvent={mapClickEvent}
          waypointClickEvent={waypointClickEvent}
          waypointDragEvent={waypointDragEvent}
          onWaypointsChange={setPreviewWaypoints}
        />
      )}

      {/* Admin: Suggestions drawer */}
      <AdminSuggestionsDrawer
        open={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        onApproved={loadPeaks}
      />

      {/* User: Suggest peak */}
      {suggestCoords && (
        <SuggestPeakDrawer
          open={!!suggestCoords}
          onClose={() => setSuggestCoords(null)}
          latitude={suggestCoords.lat}
          longitude={suggestCoords.lng}
        />
      )}
    </div>
  );
};

export default MapPage;
