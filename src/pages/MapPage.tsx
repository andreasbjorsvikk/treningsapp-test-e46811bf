import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { Peak } from '@/data/peaks';
import { getUserCheckins, PeakCheckin } from '@/services/peakCheckinService';
import { fetchPeaks, dbPeakToLegacy, createPeak, updatePeak, deletePeak, DbPeak } from '@/services/peakDbService';
import MapSubTabs, { MapSubTab } from '@/components/map/MapSubTabs';
import MapView from '@/components/map/MapView';
import PeaksList from '@/components/map/PeaksList';
import PeakDetailDrawer from '@/components/map/PeakDetailDrawer';
import AdminPeakForm from '@/components/map/AdminPeakForm';
import AdminSuggestionsDrawer from '@/components/map/AdminSuggestionsDrawer';
import SuggestPeakDrawer from '@/components/map/SuggestPeakDrawer';
import { toast } from 'sonner';

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

  useEffect(() => {
    loadPeaks();
  }, [loadPeaks]);

  useEffect(() => {
    fetchCheckins();
  }, [fetchCheckins]);

  const handleSelectPeak = (peak: Peak) => {
    setSelectedPeak(peak);
  };

  // Admin: map click to add peak
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
    } else if (!adminMode) {
      // Long-press handled in MapView
    }
  };

  // Admin: save new peak
  const handleCreatePeak = async (data: any) => {
    if (!user) return;
    await createPeak({ ...data, created_by: user.id });
    toast.success('Toppen ble opprettet');
    loadPeaks();
  };

  // Admin: save edited peak
  const handleUpdatePeak = async (data: any) => {
    if (!editingPeak) return;
    await updatePeak(editingPeak.id, data);
    toast.success('Toppen ble oppdatert');
    loadPeaks();
  };

  // Admin: delete peak
  const handleDeletePeak = async (peakId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne toppen?')) return;
    await deletePeak(peakId);
    toast.success('Toppen ble slettet');
    loadPeaks();
  };

  // Admin: edit peak from detail
  const handleEditPeak = (peak: Peak) => {
    const dbPeak = dbPeaks.find(p => p.id === peak.id);
    if (dbPeak) {
      setEditingPeak(dbPeak);
      setSelectedPeak(null);
    }
  };

  // Admin: marker dragged to new position
  const handleMarkerDrag = async (peakId: string, lat: number, lng: number) => {
    await updatePeak(peakId, { latitude: lat, longitude: lng });
    toast.success('Posisjon oppdatert');
    loadPeaks();
  };

  // User long-press to suggest
  const handleLongPress = (lat: number, lng: number) => {
    if (!adminMode) {
      setSuggestCoords({ lat, lng });
    }
  };

  const handlePickRouteStart = () => {
    setRouteStartPickForPeak(editingPeak);
    setEditingPeak(null);
    toast.info('Trykk på kartet for å velge startpunkt for ruten.');
  };

  const handleShowRoute = (peak: Peak) => {
    if (peak.route_status === 'approved' && peak.route_geojson) {
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
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-[calc(100vh-3.5rem)] -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Sub-tab bar */}
      <div className="px-4 pt-3 pb-2">
        <MapSubTabs active={subTab} onChange={setSubTab} />
      </div>

      {/* Admin toolbar */}
      {adminMode && subTab === 'kart' && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          <button
            onClick={() => setAddMode(!addMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              addMode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border text-foreground hover:bg-muted'
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
        {subTab === 'kart' ? (
          <MapView
            peaks={peaks}
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
          />
        ) : (
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
      </div>

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
