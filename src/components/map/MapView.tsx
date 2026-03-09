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
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

const MapView = ({ peaks, checkins, onSelectPeak, adminMode, addMode, onMapClick, onMarkerDrag, onEditPeak, onDeletePeak, onLongPress }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(true);
  const [mapStyle, setMapStyle] = useState<'outdoors' | 'satellite' | 'streets'>('outdoors');
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressCoords = useRef<{ lat: number; lng: number } | null>(null);

  const checkedPeakIds = new Set(checkins.map(c => c.peak_id));

  // Map initialization
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center: [number, number] = peaks.length > 0
      ? [peaks[0].longitude, peaks[0].latitude]
      : [5.7, 59.9];

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center,
      zoom: 11,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    m.addControl(new mapboxgl.NavigationControl(), 'top-right');
    m.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

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

      const statusText = isTaken ? '✓ Besøkt' : `${peak.heightMoh} moh`;

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
      
      popup.setHTML(`
        <div class="peak-popup-inner">
          <div class="peak-popup-header">
            <div class="peak-popup-title">${peak.name}${isUnpublished ? '<br><span class="peak-popup-unpublished">(upublisert)</span>' : ''}</div>
          </div>
          <div class="peak-popup-area">${peak.area}</div>
          <div class="peak-popup-info">
            <span class="peak-popup-status ${isTaken ? 'taken' : 'untaken'}">${statusText}</span>
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
      <button
        onClick={() => setIs3D(prev => !prev)}
        className="absolute top-2 left-2 z-10 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md border border-border bg-background text-foreground"
      >
        {is3D ? '2D' : '3D'}
      </button>
      <select
        value={mapStyle}
        onChange={(e) => setMapStyle(e.target.value as 'outdoors' | 'satellite' | 'streets')}
        className="absolute top-12 left-2 z-10 px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md border border-border bg-background text-foreground appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 4-4H2z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center' }}
      >
        <option value="streets">🗺️ Standard</option>
        <option value="outdoors">⛰️ Terreng</option>
        <option value="satellite">🛰️ Satelitt</option>
      </select>
    </div>
  );
};

export default MapView;
