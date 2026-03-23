import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Peak } from '@/data/peaks';
import { PeakCheckin } from '@/services/peakCheckinService';
import { PeakSuggestion } from '@/services/peakSuggestionService';
import { useTranslation } from '@/i18n/useTranslation';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { decodePolyline } from '@/utils/polyline';
import { addEnhancedTerrain } from '@/utils/mapTerrain';
import { getPeakIcon, getCheckedPeakIcon } from '@/utils/peakIcons';

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
  routeFocus?: { latitude: number; longitude: number; requestId: number } | null;
  suppressInitialGeolocate?: boolean;
  onClearRoute?: () => void;
  onMapReady?: () => void;
  previewWaypoints?: { lat: number; lng: number }[] | null;
  onWaypointClick?: (index: number) => void;
  onWaypointDrag?: (index: number, lat: number, lng: number) => void;
  showHeatmap?: boolean;
  heatmapPeriod?: HeatmapPeriod;
  showAreaStats?: boolean;
  onlyReachedThisYear?: boolean;
  suggestedPeaks?: PeakSuggestion[];
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

const MapView = ({ peaks, checkins, onSelectPeak, adminMode, addMode, onMapClick, onMarkerDrag, onEditPeak, onDeletePeak, onLongPress, routeGeojson, routeFocus, suppressInitialGeolocate, onClearRoute, onMapReady, previewWaypoints, onWaypointClick, onWaypointDrag, showHeatmap, heatmapPeriod, showAreaStats, onlyReachedThisYear, suggestedPeaks }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const waypointMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const routeStartMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const areaMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const { t } = useTranslation();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { isConstrainedDevice, isIOSDevice } = useMemo(() => {
    if (typeof window === 'undefined') {
      return { isConstrainedDevice: false, isIOSDevice: false };
    }

    const nav = navigator as Navigator & { deviceMemory?: number };
    const isIOSLike = /iPad|iPhone|iPod/.test(nav.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isTouchDevice =
      window.matchMedia('(max-width: 768px)').matches ||
      window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const hasLowMemory = (nav.deviceMemory ?? 8) <= 4;
    const constrained = isTouchDevice || hasLowMemory;

    return {
      isConstrainedDevice: constrained || isIOSLike,
      isIOSDevice: isIOSLike,
    };
  }, []);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [is3D, setIs3D] = useState(() => !shouldUseSafeMapMode);
  const [mapStyle, setMapStyle] = useState<'outdoors' | 'satellite' | 'streets' | 'topo'>('outdoors');
  const appliedStyleRef = useRef<string>('outdoors');
  const [showStyleMenu, setShowStyleMenu] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressCoords = useRef<{ lat: number; lng: number } | null>(null);
  const routeSourceId = 'peak-route-source';
  const routeLayerId = 'peak-route-layer';
  const onMapReadyRef = useRef(onMapReady);

  useEffect(() => {
    onMapReadyRef.current = onMapReady;
  }, [onMapReady]);

  useEffect(() => {
    if (shouldUseSafeMapMode) {
      setIs3D(false);
    }
  }, [shouldUseSafeMapMode]);

  const getMapboxColorFromToken = useCallback((tokenName: string, fallback = 'rgb(34, 197, 94)') => {
    if (typeof window === 'undefined') return fallback;

    const tokenValue = getComputedStyle(document.documentElement)
      .getPropertyValue(tokenName)
      .trim();

    if (!tokenValue) return fallback;

    if (/^(#|rgb\(|hsl\()/i.test(tokenValue)) return tokenValue;

    const hslMatch = tokenValue.match(/^(-?\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
    if (!hslMatch) return fallback;

    const h = ((Number(hslMatch[1]) % 360) + 360) % 360;
    const s = Math.min(100, Math.max(0, Number(hslMatch[2]))) / 100;
    const l = Math.min(100, Math.max(0, Number(hslMatch[3]))) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r1 = 0;
    let g1 = 0;
    let b1 = 0;

    if (h < 60) {
      r1 = c; g1 = x; b1 = 0;
    } else if (h < 120) {
      r1 = x; g1 = c; b1 = 0;
    } else if (h < 180) {
      r1 = 0; g1 = c; b1 = x;
    } else if (h < 240) {
      r1 = 0; g1 = x; b1 = c;
    } else if (h < 300) {
      r1 = x; g1 = 0; b1 = c;
    } else {
      r1 = c; g1 = 0; b1 = x;
    }

    const r = Math.round((r1 + m) * 255);
    const g = Math.round((g1 + m) * 255);
    const b = Math.round((b1 + m) * 255);

    return `rgb(${r}, ${g}, ${b})`;
  }, []);

  // Helper: safely run map operations only when style is loaded
  const whenStyleReady = useCallback((m: mapboxgl.Map, fn: () => void) => {
    if (m.isStyleLoaded()) {
      fn();
    } else {
      m.once('style.load', fn);
    }
  }, []);

  const ensureRouteLayer = useCallback((m: mapboxgl.Map) => {
    const routeColor = getMapboxColorFromToken('--success');

    if (!m.getSource(routeSourceId)) {
      m.addSource(routeSourceId, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        } as any,
      });
    }

    if (!m.getLayer(routeLayerId)) {
      m.addLayer({
        id: routeLayerId,
        type: 'line',
        source: routeSourceId,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': routeColor, 'line-width': 6, 'line-opacity': 0.9 },
      });
    } else {
      m.setPaintProperty(routeLayerId, 'line-color', routeColor);
    }
  }, [getMapboxColorFromToken]);

  const checkedPeakIds = new Set(checkins.map(c => c.peak_id));

  const extractRouteCoordinates = useCallback((rawRoute: any): [number, number][] => {
    if (!rawRoute) return [];

    let route = rawRoute;
    if (typeof route === 'string') {
      try {
        route = JSON.parse(route);
      } catch {
        return [];
      }
    }

    const sanitizeCoordinates = (coords: any): [number, number][] => {
      if (!Array.isArray(coords)) return [];

      const normalized = coords
        .filter((coord) => Array.isArray(coord) && coord.length >= 2)
        .map((coord) => [Number(coord[0]), Number(coord[1])] as [number, number])
        .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
        .filter(([lng, lat]) => lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90);

      const deduped: [number, number][] = [];
      normalized.forEach((coord) => {
        const last = deduped[deduped.length - 1];
        if (!last || last[0] !== coord[0] || last[1] !== coord[1]) {
          deduped.push(coord);
        }
      });

      return deduped;
    };

    if (route?.type === 'LineString') return sanitizeCoordinates(route.coordinates);

    if (route?.type === 'Feature' && route?.geometry?.type === 'LineString') {
      return sanitizeCoordinates(route.geometry.coordinates);
    }

    if (route?.type === 'FeatureCollection' && Array.isArray(route.features)) {
      const firstLine = route.features.find((f: any) => f?.geometry?.type === 'LineString');
      return sanitizeCoordinates(firstLine?.geometry?.coordinates);
    }

    if (Array.isArray(route?.coordinates)) return sanitizeCoordinates(route.coordinates);
    if (Array.isArray(route?.geometry?.coordinates)) return sanitizeCoordinates(route.geometry.coordinates);

    return [];
  }, []);

  const routeCoordinates = useMemo(() => extractRouteCoordinates(routeGeojson), [routeGeojson, extractRouteCoordinates]);
  
  // Checkins this year
  const thisYearCheckedIds = new Set(
    checkins
      .filter(c => new Date(c.checked_in_at).getFullYear() === new Date().getFullYear())
      .map(c => c.peak_id)
  );
  const suggestedMarkersRef = useRef<mapboxgl.Marker[]>([]);

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

    let m: mapboxgl.Map;
    try {
      m = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center,
        zoom,
        pitch: shouldUseSafeMapMode ? 0 : isConstrainedDevice ? 44 : 60,
        bearing: shouldUseSafeMapMode ? 0 : isConstrainedDevice ? 0 : -20,
        antialias: false,
        failIfMajorPerformanceCaveat: false,
        maxTileCacheSize: shouldUseSafeMapMode ? 8 : isConstrainedDevice ? 12 : 40,
      });
    } catch (err) {
      console.error('Failed to initialize map:', err);
      return;
    }

    m.addControl(new mapboxgl.NavigationControl(), 'top-right');
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: shouldUseSafeMapMode
        ? { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
        : { enableHighAccuracy: true },
      trackUserLocation: !shouldUseSafeMapMode,
      showUserHeading: !shouldUseSafeMapMode,
    });
    m.addControl(geolocate, 'top-right');

    m.on('moveend', () => {
      const c = m.getCenter();
      localStorage.setItem('map_last_center', JSON.stringify([c.lng, c.lat]));
      localStorage.setItem('map_last_zoom', m.getZoom().toString());
    });
    
    m.on('load', () => {
      if (!hasStoredPos && !suppressInitialGeolocate && !shouldUseSafeMapMode) {
        geolocate.trigger();
      }
    });

    m.on('error', (e) => {
      console.warn('Map error:', e.error?.message || e);
    });

    m.on('style.load', () => {
      if (shouldUseSafeMapMode) {
        try {
          m.setTerrain(null);
        } catch {
          // no-op
        }
      } else {
        addEnhancedTerrain(m, {
          exaggeration: isConstrainedDevice ? 1.08 : 1.4,
          lightweight: isConstrainedDevice,
        });
      }
      setMapLoaded(true);
      onMapReadyRef.current?.();
    });

    map.current = m;
    return () => { m.remove(); map.current = null; };
  }, [isConstrainedDevice, shouldUseSafeMapMode, suppressInitialGeolocate]);

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
    if (shouldUseSafeMapMode) {
      try {
        m.setTerrain(null);
      } catch {
        // no-op
      }

      m.jumpTo({ pitch: 0, bearing: 0 });
      return;
    }

    if (is3D) {
      m.easeTo({ pitch: isConstrainedDevice ? 44 : 60, bearing: isConstrainedDevice ? 0 : -20, duration: 600 });
      whenStyleReady(m, () => {
        if (!m.getTerrain()) {
          if (!m.getSource('mapbox-dem')) {
            m.addSource('mapbox-dem', { type: 'raster-dem', url: 'mapbox://mapbox.mapbox-terrain-dem-v1', tileSize: 512, maxzoom: 14 });
          }
          m.setTerrain({ source: 'mapbox-dem', exaggeration: isConstrainedDevice ? 1.08 : 1.5 });
        }
      });
    } else {
      m.easeTo({ pitch: 0, bearing: 0, duration: 600 });
      m.setTerrain(null);
    }
  }, [is3D, isConstrainedDevice, mapLoaded, shouldUseSafeMapMode, whenStyleReady]);

  // Toggle map style — only when user actually changes it
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    // Skip if style hasn't actually changed
    if (mapStyle === appliedStyleRef.current) return;
    const prevStyle = appliedStyleRef.current;
    appliedStyleRef.current = mapStyle;
    const m = map.current;

    // Remove topo overlay if switching away from topo
    if (prevStyle === 'topo') {
      try {
        if (m.getLayer('kartverket-topo')) m.removeLayer('kartverket-topo');
        if (m.getSource('kartverket-topo')) m.removeSource('kartverket-topo');
      } catch {}
    }

    // Topo: add Kartverket raster tiles as overlay on outdoors base
    if (mapStyle === 'topo') {
      // If current base is not outdoors, switch to it first
      const currentBase = prevStyle === 'outdoors' || prevStyle === 'topo' ? 'outdoors' : prevStyle;
      const needsBaseSwitch = currentBase !== 'outdoors';

      const addTopoOverlay = () => {
        whenStyleReady(m, () => {
          try {
            if (!m.getSource('kartverket-topo')) {
              m.addSource('kartverket-topo', {
                type: 'raster',
                tiles: ['https://cache.kartverket.no/v1/wmts/1.0.0/topo/default/webmercator/{z}/{y}/{x}.png'],
                tileSize: 256,
                attribution: '© Kartverket',
              });
            }
            if (!m.getLayer('kartverket-topo')) {
              // Insert below markers but above terrain
              m.addLayer({
                id: 'kartverket-topo',
                type: 'raster',
                source: 'kartverket-topo',
                paint: { 'raster-opacity': 0.85 },
              });
            }
          } catch (e) {
            console.warn('Failed to add topo layer:', e);
          }
        });
      };

      if (needsBaseSwitch) {
        setMapLoaded(false);
        m.setStyle('mapbox://styles/mapbox/outdoors-v12');
        m.once('style.load', () => {
          if (!shouldUseSafeMapMode) {
            addEnhancedTerrain(m, {
              exaggeration: isConstrainedDevice ? 1.08 : 1.4,
              lightweight: isConstrainedDevice,
            });
          }
          setMapLoaded(true);
          addTopoOverlay();
        });
      } else {
        addTopoOverlay();
      }
      return;
    }
    
    let styleUrl = 'mapbox://styles/mapbox/outdoors-v12';
    if (mapStyle === 'satellite') styleUrl = 'mapbox://styles/mapbox/satellite-streets-v12';
    else if (mapStyle === 'streets') styleUrl = 'mapbox://styles/mapbox/streets-v12';
    
    setMapLoaded(false);
    m.setStyle(styleUrl);
    m.once('style.load', () => {
      if (shouldUseSafeMapMode) {
        try {
          m.setTerrain(null);
        } catch {
          // no-op
        }
      } else {
        addEnhancedTerrain(m, {
          exaggeration: isConstrainedDevice ? 1.08 : 1.4,
          lightweight: isConstrainedDevice,
        });
        if (is3D) m.setTerrain({ source: 'mapbox-dem', exaggeration: isConstrainedDevice ? 1.08 : 1.5 });
      }
      setMapLoaded(true);
    });
  }, [is3D, isConstrainedDevice, mapStyle, mapLoaded, shouldUseSafeMapMode, whenStyleReady]);

  // Route focus (especially important when opening route from Topper tab)
  useEffect(() => {
    if (!map.current || !mapLoaded || !routeFocus) return;
    const m = map.current;

    whenStyleReady(m, () => {
      m.resize();
      m.easeTo({
        center: [routeFocus.longitude, routeFocus.latitude],
        zoom: Math.max(m.getZoom(), 12.5),
        duration: 700,
      });
    });
  }, [routeFocus, mapLoaded, whenStyleReady]);

  // Draw route if provided
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    const fitTimers: number[] = [];
    let idleHandled = false;

    whenStyleReady(m, () => {
      ensureRouteLayer(m);
      const source = m.getSource(routeSourceId) as mapboxgl.GeoJSONSource | undefined;
      if (!source) return;

      if (routeCoordinates.length >= 2) {
        source.setData({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates,
          },
          properties: {},
        } as any);

        const bounds = new mapboxgl.LngLatBounds();
        routeCoordinates.forEach((coord) => bounds.extend(coord));

        if (routeFocus) {
          bounds.extend([routeFocus.longitude, routeFocus.latitude]);
        }

        const fitRoute = () => {
          if (!mapContainer.current || idleHandled) return;
          if (mapContainer.current.offsetWidth === 0 || mapContainer.current.offsetHeight === 0) return;

          m.resize();
          m.fitBounds(bounds, {
            padding: { top: 92, right: 60, bottom: 76, left: 60 },
            duration: 650,
            maxZoom: 15,
          });
        };

        window.requestAnimationFrame(() => fitRoute());
        [220, 700, 1300].forEach((delay) => {
          fitTimers.push(window.setTimeout(() => fitRoute(), delay));
        });

        m.once('idle', () => {
          idleHandled = true;
          m.resize();
          m.fitBounds(bounds, {
            padding: { top: 92, right: 60, bottom: 76, left: 60 },
            duration: 0,
            maxZoom: 15,
          });
        });
      } else {
        source.setData({ type: 'FeatureCollection', features: [] } as any);
      }
    });

    return () => {
      fitTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [routeCoordinates, routeFocus, mapLoaded, whenStyleReady, ensureRouteLayer]);

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
    if (routeCoordinates.length > 0) {
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
          .setLngLat(routeCoordinates[0])
          .addTo(map.current);
      } else {
        routeStartMarkerRef.current.setLngLat(routeCoordinates[0]);
      }
    } else if (routeStartMarkerRef.current) {
      routeStartMarkerRef.current.remove();
      routeStartMarkerRef.current = null;
    }

  }, [previewWaypoints, routeCoordinates, mapLoaded, onWaypointClick]);

  // Add/update markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    peaks.forEach(peak => {
      const isTaken = checkedPeakIds.has(peak.id);
      const isUnpublished = peak.isPublished === false;
      const isYearFiltered = onlyReachedThisYear && !thisYearCheckedIds.has(peak.id);

      const el = document.createElement('div');
      const peakIcon = getPeakIcon(peak.heightMoh, peak.id);
      const markerBackground = isYearFiltered
        ? 'hsl(var(--background) / 0.42)'
        : isTaken
          ? 'hsl(var(--success) / 0.75)'
          : isUnpublished
            ? 'hsl(var(--warning) / 0.26)'
            : 'hsl(0 0% 98% / 0.58)'; // Light color in both modes
      const markerBorder = isYearFiltered
        ? 'hsl(var(--border) / 0.55)'
        : isTaken
          ? 'hsl(var(--success) / 0.72)'
          : isUnpublished
            ? 'hsl(var(--warning) / 0.45)'
            : 'hsl(0 0% 88% / 0.72)'; // Light border in both modes
      const markerShadow = shouldUseSafeMapMode
        ? isTaken && !isYearFiltered
          ? '0 4px 10px hsl(var(--success) / 0.18)'
          : '0 3px 8px hsl(0 0% 0% / 0.12)'
        : isTaken && !isYearFiltered
          ? '0 10px 24px hsl(var(--success) / 0.24), inset 0 1px 0 hsl(0 0% 100% / 0.18)'
          : '0 10px 24px hsl(0 0% 0% / 0.14)';
      const markerFilters = shouldUseSafeMapMode
        ? ''
        : `
         backdrop-filter: ${isTaken && !isYearFiltered ? 'blur(6px) saturate(1.04)' : 'blur(10px) saturate(1.12)'};
         -webkit-backdrop-filter: ${isTaken && !isYearFiltered ? 'blur(6px) saturate(1.04)' : 'blur(10px) saturate(1.12)'};
        `;
      
      el.style.cssText = `
        width: 36px; height: 36px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        background: ${markerBackground};
        border: 1.5px solid ${markerBorder};
        border-radius: 50%;
        box-shadow: ${markerShadow};
        ${markerFilters}
        ${isUnpublished ? 'opacity: 0.8;' : ''}
        ${isYearFiltered ? 'opacity: 0.6;' : ''}
      `;
        const isHighTier = peak.heightMoh >= 650;
        const isTier3 = peak.heightMoh >= 650 && peak.heightMoh < 1000;
        const imgSize = isHighTier ? 28 : 24;
        const nudgeUp = isTier3 ? 'position: relative; top: -1.5px;' : '';
        
        const imgOpacity = (!isTaken || isYearFiltered) ? 'opacity: 0.8;' : '';
        el.innerHTML = `
          <img src="${peakIcon}" alt="" width="${imgSize}" height="${imgSize}" style="object-fit: contain; ${imgOpacity} ${nudgeUp}" draggable="false" />
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
  }, [peaks, checkins, mapLoaded, t, adminMode, onlyReachedThisYear]);

  // === SUGGESTED PEAKS: Show pending suggestions with different icon ===
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    suggestedMarkersRef.current.forEach(m => m.remove());
    suggestedMarkersRef.current = [];

    if (!suggestedPeaks?.length) return;

    suggestedPeaks.forEach(suggestion => {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 32px; height: 32px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        background: hsl(0, 0%, 88%);
        border: 2px dashed hsl(0, 0%, 60%);
        border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        opacity: 0.8;
      `;
      el.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="hsl(0, 0%, 45%)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 2 15H2L8 3z"/></svg>
      `;

      const popup = new mapboxgl.Popup({
        offset: 20,
        closeButton: false,
        maxWidth: '260px',
        className: 'peak-popup',
      });

      popup.setHTML(`
        <div class="peak-popup-inner">
          <div class="peak-popup-header">
            <div class="peak-popup-title">${suggestion.name}</div>
          </div>
          ${suggestion.elevation_moh ? `<div style="text-align: center; font-size: 16px; font-weight: 700; margin: 4px 0;">${suggestion.elevation_moh} moh</div>` : ''}
          <div style="text-align: center; padding: 4px 8px; margin: 4px 0; background: hsl(38, 80%, 92%); border-radius: 8px; font-size: 12px; color: hsl(38, 70%, 30%); font-weight: 500;">
            ⏳ Denne toppen er ikke godkjent enda, men du kan sjekke inn
          </div>
          <button class="peak-popup-btn primary" id="suggestion-btn-${suggestion.id}">Sjekk inn</button>
        </div>
      `);

      popup.on('open', () => {
        setTimeout(() => {
          document.getElementById(`suggestion-btn-${suggestion.id}`)?.addEventListener('click', () => {
            popup.remove();
            // Create a temporary Peak object for check-in
            const tempPeak: Peak = {
              id: suggestion.id,
              name: suggestion.name,
              heightMoh: suggestion.elevation_moh || 0,
              latitude: suggestion.latitude,
              longitude: suggestion.longitude,
              area: '',
              description: '',
              isPublished: false,
            };
            onSelectPeak(tempPeak);
          });
        }, 10);
      });

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([suggestion.longitude, suggestion.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      suggestedMarkersRef.current.push(marker);
    });
  }, [suggestedPeaks, mapLoaded, onSelectPeak]);

  // === HEATMAP: Lines from summary_polyline, thicker/redder where more overlap ===
  useEffect(() => {
    if (!map.current || !mapLoaded || !user) return;
    const m = map.current;
    const sourceId = 'heatmap-source';
    const layerId = 'heatmap-layer';

    if (!showHeatmap) {
      whenStyleReady(m, () => {
        if (m.getLayer(layerId)) m.removeLayer(layerId);
        if (m.getSource(sourceId)) m.removeSource(sourceId);
      });
      return;
    }

    const loadHeatmapData = async () => {
      try {
        let query = supabase
          .from('workout_sessions')
          .select('summary_polyline, date')
          .eq('user_id', user.id)
          .not('summary_polyline', 'is', null);

        if (heatmapPeriod === 'year') {
          const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
          query = query.gte('date', startOfYear);
        }

        let allSessions: any[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
          const { data } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
          if (!data || data.length === 0) break;
          allSessions = allSessions.concat(data);
          if (data.length < pageSize) break;
          page++;
        }

        if (allSessions.length === 0) {
          if (m.getLayer(layerId)) m.removeLayer(layerId);
          if (m.getSource(sourceId)) m.removeSource(sourceId);
          return;
        }

        // Build a grid to count segment frequency
        const segmentCounts = new Map<string, number>();
        const gridSize = 0.0005; // ~50m grid cells
        const gridKey = (lat: number, lng: number) =>
          `${Math.round(lat / gridSize)},${Math.round(lng / gridSize)}`;
        const segKey = (lat1: number, lng1: number, lat2: number, lng2: number) => {
          const k1 = gridKey(lat1, lng1);
          const k2 = gridKey(lat2, lng2);
          return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
        };

        // First pass: count segment frequency
        allSessions.forEach((session: any) => {
          if (!session.summary_polyline) return;
          try {
            const points = decodePolyline(session.summary_polyline);
            for (let i = 0; i < points.length - 1; i++) {
              const key = segKey(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
              segmentCounts.set(key, (segmentCounts.get(key) || 0) + 1);
            }
          } catch {}
        });

        // Find max frequency for normalization
        let maxFreq = 1;
        segmentCounts.forEach(v => { if (v > maxFreq) maxFreq = v; });

        // Build line features with frequency property
        const features: any[] = [];
        allSessions.forEach((session: any) => {
          if (!session.summary_polyline) return;
          try {
            const points = decodePolyline(session.summary_polyline);
            if (points.length < 2) return;
            // Build segments with frequency
            for (let i = 0; i < points.length - 1; i++) {
              const key = segKey(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
              const freq = segmentCounts.get(key) || 1;
              features.push({
                type: 'Feature',
                geometry: {
                  type: 'LineString',
                  coordinates: [
                    [points[i][1], points[i][0]],
                    [points[i + 1][1], points[i + 1][0]],
                  ],
                },
                properties: { freq, normFreq: freq / maxFreq },
              });
            }
          } catch {}
        });

        // Deduplicate: keep only unique grid segments with max frequency
        const dedupMap = new Map<string, any>();
        features.forEach(f => {
          const coords = f.geometry.coordinates;
          const key = segKey(coords[0][1], coords[0][0], coords[1][1], coords[1][0]);
          if (!dedupMap.has(key) || dedupMap.get(key).properties.freq < f.properties.freq) {
            dedupMap.set(key, f);
          }
        });

        const geojson = { type: 'FeatureCollection', features: Array.from(dedupMap.values()) };

        whenStyleReady(m, () => {
          if (m.getSource(sourceId)) {
            (m.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(geojson as any);
          } else {
            m.addSource(sourceId, { type: 'geojson', data: geojson as any });
          }

          if (!m.getLayer(layerId)) {
            m.addLayer({
              id: layerId,
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': [
                  'interpolate', ['linear'], ['get', 'normFreq'],
                  0, 'hsla(0, 80%, 60%, 0.7)',
                  0.15, 'hsla(0, 85%, 55%, 0.85)',
                  0.4, 'hsla(0, 90%, 48%, 0.9)',
                  1, 'hsla(0, 95%, 40%, 1)',
                ],
                'line-width': [
                  'interpolate', ['linear'], ['get', 'normFreq'],
                  0, 4,
                  0.2, 6,
                  0.5, 9,
                  1, 13,
                ],
                'line-opacity': 1,
              },
              layout: {
                'line-cap': 'round',
                'line-join': 'round',
              },
            });
          }
        });
      } catch (e) {
        console.error('Heatmap load error:', e);
      }
    };

    loadHeatmapData();
  }, [showHeatmap, heatmapPeriod, mapLoaded, user]);

  // === AREA STATS: Show municipality boundaries + labels ===
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    // Cleanup
    areaMarkersRef.current.forEach(mk => mk.remove());
    areaMarkersRef.current = [];
    // Remove old boundary layers/sources safely
    whenStyleReady(m, () => {
      const existingSources = Object.keys((m.getStyle()?.sources) || {}).filter(s => s.startsWith('kommune-boundary-'));
      existingSources.forEach(sid => {
        const lid = sid.replace('boundary', 'fill');
        const lidOutline = sid.replace('boundary', 'outline');
        if (m.getLayer(lid)) m.removeLayer(lid);
        if (m.getLayer(lidOutline)) m.removeLayer(lidOutline);
        if (m.getSource(sid)) m.removeSource(sid);
      });
    });

    if (!showAreaStats) return;

    const checkedIds = new Set(checkins.map(c => c.peak_id));

    // For each peak, reverse-geocode to get kommune number, then aggregate
    const fetchBoundaries = async () => {
      // Step 1: Resolve each unique area to a kommuneNr via reverse geocoding
      const areaKommuneMap = new Map<string, { kommuneNr: string; kommuneNavn: string }>();
      const uniqueAreas = new Map<string, Peak>(); // area -> sample peak
      peaks.forEach(peak => {
        const area = peak.area?.trim();
        if (area && !uniqueAreas.has(area)) uniqueAreas.set(area, peak);
      });

      // Fetch kommune info for each unique area in parallel
      await Promise.all(Array.from(uniqueAreas.entries()).map(async ([area, peak]) => {
        try {
          const res = await fetch(
            `https://ws.geonorge.no/kommuneinfo/v1/punkt?nord=${peak.latitude}&ost=${peak.longitude}&koordsys=4326`
          );
          if (!res.ok) return;
          const data = await res.json();
          if (data.kommunenummer) {
            areaKommuneMap.set(area, { kommuneNr: data.kommunenummer, kommuneNavn: data.kommunenavn || area });
          }
        } catch {}
      }));

      // Step 2: Aggregate peaks by kommuneNr
      const kommuneMap = new Map<string, { kommuneNavn: string; peaks: Peak[]; checked: number; total: number }>();
      peaks.forEach(peak => {
        const area = peak.area?.trim();
        if (!area) return;
        const info = areaKommuneMap.get(area);
        if (!info) return;
        const { kommuneNr, kommuneNavn } = info;
        if (!kommuneMap.has(kommuneNr)) kommuneMap.set(kommuneNr, { kommuneNavn, peaks: [], checked: 0, total: 0 });
        const entry = kommuneMap.get(kommuneNr)!;
        entry.peaks.push(peak);
        entry.total++;
        if (checkedIds.has(peak.id)) entry.checked++;
      });

      // Step 3: Fetch boundaries and render
      for (const [kommuneNr, entry] of kommuneMap.entries()) {
        if (!map.current) return;
        try {
          const boundaryRes = await fetch(
            `https://ws.geonorge.no/kommuneinfo/v1/kommuner/${kommuneNr}/omrade`
          );
          if (!boundaryRes.ok) continue;
          const boundaryData = await boundaryRes.json();

          if (!map.current) return;
          const sourceId = `kommune-boundary-${kommuneNr}`;
          const fillLayerId = `kommune-fill-${kommuneNr}`;
          const outlineLayerId = `kommune-outline-${kommuneNr}`;

          const pct = entry.total > 0 ? Math.round((entry.checked / entry.total) * 100) : 0;

          // Use a deterministic color index based on kommuneNr to avoid adjacent areas sharing colors
          // We'll use 5 distinct hues and distribute based on the numeric kommune code
          const kommuneNum = parseInt(kommuneNr, 10) || 0;
          const colorPalette = [
            { fill: 'hsla(152, 65%, 40%, 0.35)', outline: 'hsla(152, 65%, 35%, 0.85)' },  // green
            { fill: 'hsla(210, 70%, 50%, 0.30)', outline: 'hsla(210, 70%, 45%, 0.75)' },  // blue
            { fill: 'hsla(280, 55%, 55%, 0.28)', outline: 'hsla(280, 55%, 50%, 0.65)' },  // purple
            { fill: 'hsla(35, 80%, 50%, 0.30)', outline: 'hsla(35, 80%, 45%, 0.75)' },    // orange
            { fill: 'hsla(340, 60%, 50%, 0.28)', outline: 'hsla(340, 60%, 45%, 0.65)' },  // pink
          ];
          const colorIdx = kommuneNum % colorPalette.length;
          const fillColor = colorPalette[colorIdx].fill;
          const outlineColor = colorPalette[colorIdx].outline;

          whenStyleReady(m, () => {
            if (!m.getSource(sourceId)) {
              m.addSource(sourceId, { type: 'geojson', data: boundaryData.omrade as any });
            }
            if (!m.getLayer(fillLayerId)) {
              m.addLayer({
                id: fillLayerId,
                type: 'fill',
                source: sourceId,
                paint: { 'fill-color': fillColor, 'fill-opacity': 1 },
              });
            }
            if (!m.getLayer(outlineLayerId)) {
              m.addLayer({
                id: outlineLayerId,
                type: 'line',
                source: sourceId,
                paint: { 'line-color': outlineColor, 'line-width': 3 },
              });
            }
          });

          // Add label marker
          const avgLat = entry.peaks.reduce((s, p) => s + p.latitude, 0) / entry.peaks.length;
          const avgLng = entry.peaks.reduce((s, p) => s + p.longitude, 0) / entry.peaks.length;

          const el = document.createElement('div');
          el.className = 'area-stats-label';
          el.style.cssText = 'pointer-events: none; text-align: center; white-space: nowrap; z-index: 5;';
          el.innerHTML = `
            <div style="
              background: hsl(var(--background) / 0.92);
              backdrop-filter: blur(8px);
              border: 1.5px solid hsl(var(--border));
              border-radius: 14px;
              padding: 10px 16px;
              box-shadow: 0 4px 16px rgba(0,0,0,0.18);
              transform-origin: center center;
            ">
              <div style="font-size: 16px; font-weight: 800; color: hsl(var(--foreground)); letter-spacing: -0.02em;">${entry.kommuneNavn}</div>
              <div style="font-size: 14px; color: hsl(var(--muted-foreground)); margin-top: 3px; font-weight: 500;">
                ${entry.checked} / ${entry.total} topper
              </div>
              <div style="font-size: 18px; font-weight: 800; margin-top: 2px; color: ${pct >= 50 ? 'hsl(152, 60%, 42%)' : 'hsl(var(--muted-foreground))'};">
                ${pct}%
              </div>
            </div>
          `;

          const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
            .setLngLat([avgLng, avgLat])
            .addTo(map.current!);
          areaMarkersRef.current.push(marker);
        } catch (e) {
          console.error('Failed to load municipality boundary for', kommuneNr, e);
        }
      }

      // Add zoom-based scaling for area stats labels — scale the INNER div, not the marker element
      const updateScale = () => {
        if (!map.current) return;
        const zoom = map.current.getZoom();
        // Scale from 1.0 at zoom 12+ down to 0.55 at zoom 7
        const scale = Math.max(0.55, Math.min(1, (zoom - 7) / 5));
        areaMarkersRef.current.forEach(mk => {
          const el = mk.getElement();
          const inner = el.querySelector('div > div') as HTMLElement;
          if (inner) {
            inner.style.transform = `scale(${scale})`;
            inner.style.display = zoom < 7 ? 'none' : '';
          }
        });
      };
      map.current.on('zoom', updateScale);
      updateScale();
    };

    fetchBoundaries();
  }, [showAreaStats, peaks, checkins, mapLoaded]);

  return (
    <div className={`relative w-full h-full ${is3D ? 'map-is-3d' : ''}`}>
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        {!shouldUseSafeMapMode && (
          <button
            onClick={() => setIs3D(prev => !prev)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md border border-border bg-background text-foreground hover:bg-muted transition-colors h-[34px]"
          >
            {is3D ? '2D' : '3D'}
          </button>
        )}
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
                onClick={() => { setMapStyle('topo'); setShowStyleMenu(false); }}
                className={`w-full px-3 py-2 text-xs font-medium text-left hover:bg-muted transition-colors flex items-center gap-2 ${mapStyle === 'topo' ? 'bg-muted' : ''}`}
              >
                🥾 Topografisk
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
