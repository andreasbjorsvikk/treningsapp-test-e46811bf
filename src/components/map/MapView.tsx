import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Peak } from '@/data/peaks';
import { PeakCheckin } from '@/services/peakCheckinService';
import { useTranslation } from '@/i18n/useTranslation';
import { useSettings } from '@/contexts/SettingsContext';
import { toast } from 'sonner';

interface MapViewProps {
  peaks: Peak[];
  checkins: PeakCheckin[];
  onSelectPeak: (peak: Peak) => void;
  adminMode?: boolean;
  addMode?: boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerDrag?: (peakId: string, lat: number, lng: number) => void;
  onEditPeak?: (peak: Peak) => void;
  onDeletePeak?: (peakId: string) => void;
  onLongPress?: (lat: number, lng: number) => void;
  routeGeojson?: any;
  onClearRoute?: () => void;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

const MapView = ({ peaks, checkins, onSelectPeak, adminMode, addMode, onMapClick, onMarkerDrag, onEditPeak, onDeletePeak, onLongPress, routeGeojson, onClearRoute }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(true);
  const [mapStyle, setMapStyle] = useState<'outdoors' | 'satellite' | 'streets'>('outdoors');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressCoords = useRef<{ lat: number; lng: number } | null>(null);

  const checkedPeakIds = new Set(checkins.map(c => c.peak_id));

  // Map initialization
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const lastCenterStr = localStorage.getItem('map_last_center');
    const lastZoomStr = localStorage.getItem('map_last_zoom');
    
    let center: [number, number] = [5.7, 59.9];
    let zoom = 11;
    let hasStoredPos = false;

    if (lastCenterStr && lastZoomStr) {
      try {
        center = JSON.parse(lastCenterStr);
        zoom = parseFloat(lastZoomStr);
        hasStoredPos = true;
      } catch (e) {}
    } else if (peaks.length > 0) {
      center = [peaks[0].longitude, peaks[0].latitude];
    }

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center,
      zoom,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    m.addControl(new mapboxgl.NavigationControl(), 'top-right');
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    });
    m.addControl(geolocate, 'top-right');

    m.on('moveend', () => {
      const c = m.getCenter();
      localStorage.setItem('map_last_center', JSON.stringify([c.lng, c.lat]));
      localStorage.setItem('map_last_zoom', m.getZoom().toString());
    });
    
    m.on('load', () => {
      if (!hasStoredPos) {
        geolocate.trigger();
      }
    });

    m.on('style.load', () => {
      m.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      m.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });
      setMapLoaded(true);
    });

    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, []);

  // Admin: click to add peak
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    const handler = (e: mapboxgl.MapMouseEvent) => {
      if (addMode && onMapClick) {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      }
    };
    m.on('click', handler);
    return () => { m.off('click', handler); };
  }, [addMode, onMapClick, mapLoaded]);

  // User: long press to suggest
  useEffect(() => {
    if (!map.current || !mapLoaded || adminMode) return;
    const m = map.current;
    const el = m.getCanvas();

    const onDown = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const point = m.unproject([e.touches[0].clientX - el.getBoundingClientRect().left, e.touches[0].clientY - el.getBoundingClientRect().top]);
      longPressCoords.current = { lat: point.lat, lng: point.lng };
      longPressTimer.current = setTimeout(() => {
        if (longPressCoords.current && onLongPress) {
          onLongPress(longPressCoords.current.lat, longPressCoords.current.lng);
        }
      }, 600);
    };
    const onMove = () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    };
    const onUp = () => {
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    };

    // Also support right-click on desktop
    const onContextMenu = (e: mapboxgl.MapMouseEvent) => {
      e.originalEvent.preventDefault();
      if (onLongPress) onLongPress(e.lngLat.lat, e.lngLat.lng);
    };

    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onUp, { passive: true });
    m.on('contextmenu', onContextMenu);

    return () => {
      el.removeEventListener('touchstart', onDown);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onUp);
      m.off('contextmenu', onContextMenu);
    };
  }, [mapLoaded, adminMode, onLongPress]);

  // Cursor style
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    map.current.getCanvas().style.cursor = addMode ? 'crosshair' : '';
  }, [addMode, mapLoaded]);

  // Toggle 2D/3D
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    if (is3D) {
      m.easeTo({ pitch: 60, bearing: -20, duration: 600 });
      if (!m.getTerrain()) {
        if (!m.getSource('mapbox-dem')) {
          m.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
        }
        m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      }
    } else {
      m.easeTo({ pitch: 0, bearing: 0, duration: 600 });
      m.setTerrain(null);
    }
  }, [is3D, mapLoaded]);

  // Toggle map style
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    
    let styleUrl = 'mapbox://styles/mapbox/outdoors-v12';
    if (mapStyle === 'satellite') styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12';
    else if (mapStyle === 'streets') styleUrl = 'mapbox://styles/mapbox/streets-v12';
    
    m.setStyle(styleUrl);
    m.once('style.load', () => {
      if (!m.getSource('mapbox-dem')) {
        m.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
      }
      if (is3D) m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      if (!m.getLayer('sky')) {
        m.addLayer({ id: 'sky', type: 'sky', paint: { 'sky-type': 'atmosphere', 'sky-atmosphere-sun': [0.0, 90.0], 'sky-atmosphere-sun-intensity': 15 } });
      }
      setMapLoaded(prev => !prev);
      setTimeout(() => setMapLoaded(true), 50);
    });
  }, [mapStyle]);

  // Draw route if provided
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    const sourceId = 'peak-route-source';
    const layerId = 'peak-route-layer';

    if (routeGeojson) {
      if (!m.getSource(sourceId)) {
        m.addSource(sourceId, {
          type: 'geojson',
          data: routeGeojson,
        });
        m.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#10b981', // Tailwind success color
            'line-width': 6,
            'line-opacity': 0.8,
          },
        });
      } else {
        (m.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(routeGeojson);
      }

      // Zoom to route
      const bounds = new mapboxgl.LngLatBounds();
      if (routeGeojson.coordinates) {
        routeGeojson.coordinates.forEach((coord: [number, number]) => {
          bounds.extend(coord);
        });
        m.fitBounds(bounds, { padding: 50, duration: 1000 });
      }
    } else {
      if (m.getLayer(layerId)) m.removeLayer(layerId);
      if (m.getSource(sourceId)) m.removeSource(sourceId);
    }
  }, [routeGeojson, mapLoaded]);

  // Add/update markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    peaks.forEach(peak => {
      const isTaken = checkedPeakIds.has(peak.id);
      const isUnpublished = peak.isPublished === false;

      const el = document.createElement('div');
      el.style.cssText = `
        width: 36px; height: 36px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        background: ${isTaken ? 'hsl(152, 60%, 42%)' : isUnpublished ? 'hsl(38, 85%, 50%)' : 'hsl(0, 0%, 100%)'};
        border: 2px solid ${isTaken ? 'hsl(152, 60%, 35%)' : isUnpublished ? 'hsl(38, 85%, 40%)' : 'hsl(220, 13%, 80%)'};
        border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ${isUnpublished ? 'opacity: 0.7;' : ''}
      `;
      el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isTaken ? 'white' : isUnpublished ? 'white' : 'hsl(220, 10%, 46%)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 2 15H2L8 3z"/></svg>`;

      let buttonsHtml = `<button class="peak-popup-btn primary" id="peak-btn-${peak.id}">${t('map.viewPeak')}</button>`;
      
      if (adminMode) {
        buttonsHtml = `
          <div class="peak-popup-actions">
            <button class="peak-popup-btn secondary" id="peak-btn-${peak.id}">Vis</button>
            <button class="peak-popup-btn edit" id="peak-edit-${peak.id}">Redigér</button>
            <button class="peak-popup-btn delete" id="peak-del-${peak.id}">Slett</button>
          </div>
        `;
      }

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        maxWidth: '280px',
        className: 'peak-popup',
      });
      
      const statusHtml = isTaken 
        ? `<span class="text-base font-bold tracking-tight text-emerald-600 drop-shadow-sm flex items-center gap-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Besøkt</span>`
        : `<span class="text-xl font-black tracking-tight text-foreground drop-shadow-sm" style="background: linear-gradient(135deg, hsl(var(--foreground)), hsl(var(--muted-foreground))); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${peak.heightMoh} <span class="text-xs font-bold" style="color: hsl(var(--muted-foreground)); -webkit-text-fill-color: initial;">moh</span></span>`;

      popup.setHTML(`
        <div class="peak-popup-inner">
          <div class="peak-popup-header">
            <div class="peak-popup-title">${peak.name}${isUnpublished ? '<br><span class="peak-popup-unpublished">(upublisert)</span>' : ''}</div>
          </div>
          <div class="peak-popup-area" style="margin-bottom: 4px;">${peak.area}</div>
          <div class="flex flex-col items-center justify-center py-1 border-y border-border/50 bg-muted/20 rounded-lg" style="margin: 4px 0;">
            ${statusHtml}
          </div>
          ${buttonsHtml}
        </div>
      `);

      popup.on('open', () => {
        setTimeout(() => {
          document.getElementById(`peak-btn-${peak.id}`)?.addEventListener('click', () => {
            popup.remove();
            onSelectPeak(peak);
          });
          if (adminMode) {
            document.getElementById(`peak-edit-${peak.id}`)?.addEventListener('click', () => {
              popup.remove();
              onEditPeak?.(peak);
            });
            document.getElementById(`peak-del-${peak.id}`)?.addEventListener('click', () => {
              popup.remove();
              onDeletePeak?.(peak.id);
            });
          }
        }, 10);
      });

      const draggable = false; // Start som false, krever long press i admin
      const marker = new mapboxgl.Marker({ element: el, anchor: 'center', draggable })
        .setLngLat([peak.longitude, peak.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      if (adminMode && onMarkerDrag) {
        let isUnlocked = false;
        let unlockTimer: ReturnType<typeof setTimeout>;

        const handleStart = () => {
          if (isUnlocked) return;
          unlockTimer = setTimeout(() => {
            isUnlocked = true;
            marker.setDraggable(true);
            el.style.transform = 'scale(1.25)';
            el.style.boxShadow = '0 0 0 4px rgba(56, 189, 248, 0.5)';
            toast.info('Markør ulåst for flytting. Dra for å plassere.', { duration: 3000 });
          }, 600);
        };

        const handleCancel = () => {
          clearTimeout(unlockTimer);
        };

        el.addEventListener('mousedown', handleStart);
        el.addEventListener('touchstart', handleStart, { passive: true });
        el.addEventListener('mouseup', handleCancel);
        el.addEventListener('mouseleave', handleCancel);
        el.addEventListener('touchend', handleCancel);
        el.addEventListener('touchmove', handleCancel);

        marker.on('dragend', () => {
          isUnlocked = false;
          marker.setDraggable(false);
          el.style.transform = '';
          el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
          const lngLat = marker.getLngLat();
          onMarkerDrag(peak.id, lngLat.lat, lngLat.lng);
        });
      }

      markersRef.current.push(marker);
    });
  }, [peaks, checkins, mapLoaded, t, adminMode]);

  return (
    <div className={`relative w-full h-full ${is3D ? 'map-is-3d' : ''}`}>
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <button
          onClick={() => setIs3D(prev => !prev)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md border border-border bg-background text-foreground hover:bg-muted transition-colors h-[34px]"
        >
          {is3D ? '2D' : '3D'}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowStyleMenu(prev => !prev)}
            className="p-2 rounded-lg shadow-md border border-border bg-background text-foreground hover:bg-muted transition-colors h-[34px] w-[34px] flex items-center justify-center"
            title="Endre karttype"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
          </button>
          {showStyleMenu && (
            <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden min-w-[140px]">
              <button
                onClick={() => { setMapStyle('streets'); setShowStyleMenu(false); }}
                className={`w-full px-3 py-2 text-xs font-medium text-left hover:bg-muted transition-colors flex items-center gap-2 ${mapStyle === 'streets' ? 'bg-muted' : ''}`}
              >
                🗺️ Standard
              </button>
              <button
                onClick={() => { setMapStyle('outdoors'); setShowStyleMenu(false); }}
                className={`w-full px-3 py-2 text-xs font-medium text-left hover:bg-muted transition-colors flex items-center gap-2 ${mapStyle === 'outdoors' ? 'bg-muted' : ''}`}
              >
                ⛰️ Terreng
              </button>
              <button
                onClick={() => { setMapStyle('satellite'); setShowStyleMenu(false); }}
                className={`w-full px-3 py-2 text-xs font-medium text-left hover:bg-muted transition-colors flex items-center gap-2 ${mapStyle === 'satellite' ? 'bg-muted' : ''}`}
              >
                🛰️ Satellitt
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapView;
