import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Peak } from '@/data/peaks';
import { PeakCheckin } from '@/services/peakCheckinService';
import { useTranslation } from '@/i18n/useTranslation';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { decodePolyline } from '@/utils/polyline';

type HeatmapPeriod = 'year' | 'total';

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
  previewWaypoints?: { lat: number; lng: number }[] | null;
  onWaypointClick?: (index: number) => void;
  onWaypointDrag?: (index: number, lat: number, lng: number) => void;
  showHeatmap?: boolean;
  heatmapPeriod?: HeatmapPeriod;
  showAreaStats?: boolean;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

const MapView = ({ peaks, checkins, onSelectPeak, adminMode, addMode, onMapClick, onMarkerDrag, onEditPeak, onDeletePeak, onLongPress, routeGeojson, onClearRoute, previewWaypoints, onWaypointClick, onWaypointDrag, showHeatmap, heatmapPeriod, showAreaStats }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const waypointMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const routeStartMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const areaMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
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
      if (m.getZoom() >= 12.5) {
        mapContainer.current?.classList.add('show-peak-labels');
      }
    });

    m.on('zoom', () => {
      const currentZoom = m.getZoom();
      if (currentZoom >= 12.5) {
        mapContainer.current?.classList.add('show-peak-labels');
      } else {
        mapContainer.current?.classList.remove('show-peak-labels');
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

  // Admin: click to add peak or waypoint
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    const handler = (e: mapboxgl.MapMouseEvent) => {
      if (onMapClick) {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      }
    };
    m.on('click', handler);
    return () => { m.off('click', handler); };
  }, [onMapClick, mapLoaded]);

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

  // Handle preview waypoints
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing waypoint markers
    waypointMarkersRef.current.forEach(m => m.remove());
    waypointMarkersRef.current = [];

    if (previewWaypoints && previewWaypoints.length > 0) {
      previewWaypoints.forEach((wp, index) => {
        const el = document.createElement('div');
        el.className = 'route-waypoint-marker';
        el.style.cssText = `
          width: 16px; height: 16px; cursor: pointer;
          background: hsl(220, 90%, 56%);
          border: 2px solid white;
          border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        `;
        el.title = 'Trykk for å fjerne waypoint. Dra for å flytte.';
        
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          if (onWaypointClick) onWaypointClick(index);
        });

        const marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([wp.lng, wp.lat])
          .addTo(map.current!);
          
        marker.on('dragend', () => {
          const lngLat = marker.getLngLat();
          if (onWaypointDrag) onWaypointDrag(index, lngLat.lat, lngLat.lng);
        });
          
        waypointMarkersRef.current.push(marker);
      });
    }

    // Handle route start marker (if we have a route, put a green dot at the start)
    if (routeGeojson && routeGeojson.coordinates && routeGeojson.coordinates.length > 0) {
      if (!routeStartMarkerRef.current) {
        const el = document.createElement('div');
        el.className = 'route-start-marker';
        el.style.cssText = `
          width: 20px; height: 20px;
          background: hsl(152, 60%, 42%);
          border: 3px solid white;
          border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        `;
        routeStartMarkerRef.current = new mapboxgl.Marker({ element: el })
          .setLngLat(routeGeojson.coordinates[0])
          .addTo(map.current);
      } else {
        routeStartMarkerRef.current.setLngLat(routeGeojson.coordinates[0]);
      }
    } else if (routeStartMarkerRef.current) {
      routeStartMarkerRef.current.remove();
      routeStartMarkerRef.current = null;
    }

  }, [previewWaypoints, routeGeojson, mapLoaded, onWaypointClick]);

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
      el.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isTaken ? 'white' : isUnpublished ? 'white' : 'hsl(220, 10%, 46%)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 2 15H2L8 3z"/></svg>
        <div class="peak-marker-label" style="
          position: absolute; 
          top: 38px; 
          left: 50%; 
          transform: translateX(-50%); 
          white-space: nowrap; 
          font-size: 11px; 
          font-weight: 600; 
          color: hsl(var(--foreground)); 
          text-shadow: -1px -1px 0 hsl(var(--background)), 1px -1px 0 hsl(var(--background)), -1px 1px 0 hsl(var(--background)), 1px 1px 0 hsl(var(--background)), 0 2px 4px rgba(0,0,0,0.5);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.3s ease;
        ">${peak.name}</div>
      `;

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
        ? `<span class="flex items-center gap-1.5" style="color: hsl(152, 60%, 42%); font-size: 18px; font-weight: 800;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>${peak.heightMoh} moh</span>`
        : `<span style="font-size: 18px; font-weight: 800; color: hsl(var(--foreground));">${peak.heightMoh} moh</span>`;

      popup.setHTML(`
        <div class="peak-popup-inner">
          <div class="peak-popup-header">
            <div class="peak-popup-title">${peak.name}${isUnpublished ? '<br><span class="peak-popup-unpublished">(upublisert)</span>' : ''}</div>
          </div>
          <div class="peak-popup-area" style="margin-bottom: 2px;">${peak.area}</div>
          <div style="text-align: center; padding: 2px 0; margin-bottom: 4px;">
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

  // === HEATMAP: Load user workout streams and display as heatmap ===
  useEffect(() => {
    if (!map.current || !mapLoaded || !user) return;
    const m = map.current;
    const sourceId = 'heatmap-source';
    const layerId = 'heatmap-layer';

    if (!showHeatmap) {
      if (m.getLayer(layerId)) m.removeLayer(layerId);
      if (m.getSource(sourceId)) m.removeSource(sourceId);
      return;
    }

    const loadHeatmapData = async () => {
      try {
        let query = supabase
          .from('workout_streams')
          .select('latlng_data, created_at')
          .eq('user_id', user.id)
          .not('latlng_data', 'is', null);

        if (heatmapPeriod === 'year') {
          const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
          query = query.gte('created_at', startOfYear);
        }

        const { data: streams } = await query;
        if (!streams || streams.length === 0) {
          if (m.getLayer(layerId)) m.removeLayer(layerId);
          if (m.getSource(sourceId)) m.removeSource(sourceId);
          return;
        }

        const features: any[] = [];
        streams.forEach((stream: any) => {
          const latlngs = stream.latlng_data as number[][];
          if (!Array.isArray(latlngs)) return;
          latlngs.forEach((point: number[]) => {
            if (Array.isArray(point) && point.length >= 2) {
              features.push({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [point[1], point[0]] },
                properties: {},
              });
            }
          });
        });

        const maxPoints = 50000;
        let sampledFeatures = features;
        if (features.length > maxPoints) {
          const step = Math.ceil(features.length / maxPoints);
          sampledFeatures = features.filter((_, i) => i % step === 0);
        }

        const geojson = { type: 'FeatureCollection', features: sampledFeatures };

        if (m.getSource(sourceId)) {
          (m.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson as any);
        } else {
          m.addSource(sourceId, { type: 'geojson', data: geojson as any });
        }

        if (!m.getLayer(layerId)) {
          m.addLayer({
            id: layerId,
            type: 'heatmap',
            source: sourceId,
            paint: {
              'heatmap-weight': 1,
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 15, 3],
              'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(33,102,172,0)',
                0.2, 'hsl(210, 80%, 60%)',
                0.4, 'hsl(180, 70%, 50%)',
                0.6, 'hsl(130, 70%, 50%)',
                0.8, 'hsl(50, 90%, 55%)',
                1, 'hsl(0, 80%, 55%)',
              ],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 13, 12, 16, 20],
              'heatmap-opacity': 0.7,
            },
          });
        }
      } catch (e) {
        console.error('Heatmap load error:', e);
      }
    };

    loadHeatmapData();
  }, [showHeatmap, heatmapPeriod, mapLoaded, user]);

  // === AREA STATS: Show municipality labels with peak stats ===
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    areaMarkersRef.current.forEach(m => m.remove());
    areaMarkersRef.current = [];

    if (!showAreaStats) return;

    const checkedIds = new Set(checkins.map(c => c.peak_id));
    const areaMap = new Map<string, { peaks: Peak[]; checked: number; total: number }>();

    peaks.forEach(peak => {
      const area = peak.area?.trim();
      if (!area) return;
      if (!areaMap.has(area)) areaMap.set(area, { peaks: [], checked: 0, total: 0 });
      const entry = areaMap.get(area)!;
      entry.peaks.push(peak);
      entry.total++;
      if (checkedIds.has(peak.id)) entry.checked++;
    });

    areaMap.forEach((entry, areaName) => {
      if (!map.current) return;
      const avgLat = entry.peaks.reduce((s, p) => s + p.latitude, 0) / entry.peaks.length;
      const avgLng = entry.peaks.reduce((s, p) => s + p.longitude, 0) / entry.peaks.length;
      const pct = entry.total > 0 ? Math.round((entry.checked / entry.total) * 100) : 0;

      const el = document.createElement('div');
      el.style.cssText = 'pointer-events: none; text-align: center; white-space: nowrap;';
      el.innerHTML = `
        <div style="
          background: hsl(var(--background) / 0.9);
          backdrop-filter: blur(6px);
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          padding: 6px 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        ">
          <div style="font-size: 12px; font-weight: 700; color: hsl(var(--foreground));">${areaName}</div>
          <div style="font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 1px;">
            ${entry.checked} / ${entry.total} topper · <span style="font-weight: 600; color: ${pct >= 50 ? 'hsl(152, 60%, 42%)' : 'hsl(var(--muted-foreground))'};">${pct}%</span>
          </div>
        </div>
      `;

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([avgLng, avgLat])
        .addTo(map.current!);

      areaMarkersRef.current.push(marker);
    });
  }, [showAreaStats, peaks, checkins, mapLoaded]);

  return (
    <div className={`relative w-full h-full ${is3D ? 'map-is-3d' : ''}`}>
      <style>{`
        .show-peak-labels .peak-marker-label {
          opacity: 1 !important;
        }
      `}</style>
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
