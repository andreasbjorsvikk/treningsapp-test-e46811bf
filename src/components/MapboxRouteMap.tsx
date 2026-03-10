import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Maximize2, ArrowLeft, MapPin } from 'lucide-react';
import { createPortal } from 'react-dom';
import RouteReplay from '@/components/RouteReplay';
import { addEnhancedTerrain } from '@/utils/mapTerrain';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

interface MapboxRouteMapProps {
  routePoints: [number, number][];
  lineColor: string;
  height: number;
  isDark: boolean;
  totalDistance?: number;
  totalElevation?: number;
  averageHeartrate?: number | null;
  maxHeartrate?: number | null;
}

function simplifyPoints(points: [number, number][], maxPoints: number): [number, number][] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  const result: [number, number][] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(points[Math.round(i * step)]);
  }
  return result;
}

function dpSimplify(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length < 3) return points;
  let maxDist = 0, maxIdx = 0;
  const [startLat, startLng] = points[0];
  const [endLat, endLng] = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = Math.abs(
      (endLng - startLng) * (startLat - points[i][0]) -
      (startLng - points[i][1]) * (endLat - startLat)
    ) / Math.sqrt((endLng - startLng) ** 2 + (endLat - startLat) ** 2);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = dpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = dpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[points.length - 1]];
}

function simplifyRoute(points: [number, number][], target: number = 400): [number, number][] {
  if (points.length <= target) return points;
  let epsilon = 0.00002;
  let result = dpSimplify(points, epsilon);
  while (result.length > target && epsilon < 0.01) {
    epsilon *= 2;
    result = dpSimplify(points, epsilon);
  }
  return result;
}

function getBounds(routePoints: [number, number][]): { sw: [number, number]; ne: [number, number]; center: [number, number] } {
  const lats = routePoints.map(p => p[0]);
  const lngs = routePoints.map(p => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    sw: [minLng - 0.005, minLat - 0.002],
    ne: [maxLng + 0.005, maxLat + 0.002],
    center: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
  };
}

function getGeoJsonUrl(routePoints: [number, number][], lineColor: string, width: number, height: number): string {
  const style = 'outdoors-v12';
  const simplified = simplifyPoints(routePoints, 80);
  const coordinates = simplified.map(([lat, lng]) => [lng, lat]);
  const color = lineColor.startsWith('#') ? lineColor : `#${lineColor}`;
  const geojson = {
    type: 'Feature',
    properties: { stroke: color, 'stroke-width': 4, 'stroke-opacity': 0.95 },
    geometry: { type: 'LineString', coordinates },
  };
  const overlay = `geojson(${encodeURIComponent(JSON.stringify(geojson))})`;
  const retina = window.devicePixelRatio >= 2 ? '@2x' : '';
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/auto/${width}x${height}${retina}?padding=40&access_token=${MAPBOX_TOKEN}`;
}

export const useMapFullscreen = () => {
  const [fullscreen, setFullscreen] = useState(false);
  return { isMapFullscreen: fullscreen, setMapFullscreen: setFullscreen };
};

const MapboxRouteMap = ({ routePoints, lineColor, height, isDark, onFullscreenChange, totalDistance, totalElevation, averageHeartrate, maxHeartrate }: MapboxRouteMapProps & { onFullscreenChange?: (fs: boolean) => void }) => {
  const [fullscreen, setFullscreenState] = useState(false);
  const setFullscreen = (fs: boolean) => {
    setFullscreenState(fs);
    onFullscreenChange?.(fs);
  };
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapInitStarted = useRef(false);
  const terrainAdded = useRef(false);
  const boundsRef = useRef<{ sw: [number, number]; ne: [number, number] } | null>(null);

  // Create a persistent DOM node for the map that never gets unmounted by React
  const persistentMapDiv = useRef<HTMLDivElement | null>(null);
  if (!persistentMapDiv.current) {
    persistentMapDiv.current = document.createElement('div');
    persistentMapDiv.current.style.width = '100%';
    persistentMapDiv.current.style.height = '100%';
  }

  // Wrapper ref — we'll append the persistent div here
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Move the persistent map div into the current wrapper whenever it changes
  useEffect(() => {
    const div = persistentMapDiv.current;
    if (!div || !wrapperRef.current) return;
    wrapperRef.current.appendChild(div);
    return () => {
      // Don't remove from DOM entirely — just detach
      if (div.parentNode) div.parentNode.removeChild(div);
    };
  }, [fullscreen]); // Re-run when wrapper changes (hidden vs fullscreen)

  const staticUrl = useMemo(() => {
    if (routePoints.length < 2) return null;
    return getGeoJsonUrl(routePoints, lineColor, 600, Math.round(height * 1.5));
  }, [routePoints, lineColor, height]);

  const simplifiedRoute = useMemo(() => {
    if (routePoints.length < 2) return [];
    return simplifyRoute(routePoints, 300);
  }, [routePoints]);

  // Pre-initialize map on mount (hidden) to cache tiles
  const initMap = useCallback(async () => {
    if (mapInitStarted.current || !persistentMapDiv.current || routePoints.length < 2) return;
    mapInitStarted.current = true;

    const mapboxgl = (await import('mapbox-gl')).default;
    await import('mapbox-gl/dist/mapbox-gl.css');
    (mapboxgl as any).accessToken = MAPBOX_TOKEN;

    const boundsPoints = simplifiedRoute.length > 0 ? simplifiedRoute : routePoints;
    const bounds = getBounds(boundsPoints);
    boundsRef.current = { sw: bounds.sw, ne: bounds.ne };
    const coords = simplifiedRoute.map(([lat, lng]) => [lng, lat]);

    const map = new mapboxgl.Map({
      container: persistentMapDiv.current!,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: bounds.center,
      zoom: 12,
      pitch: 60,
      bearing: -20,
      antialias: false,
      fadeDuration: 0,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    map.once('style.load', () => {
      if (!mapInstanceRef.current) return;

      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: coords },
        },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': lineColor, 'line-width': 4, 'line-opacity': 0.95 },
      });

      setMapReady(true);
    });

    map.once('idle', () => {
      setTimeout(() => {
        if (!mapInstanceRef.current || terrainAdded.current) return;
        terrainAdded.current = true;
        addEnhancedTerrain(map, { exaggeration: 1.4 });
      }, 300);
    });
  }, [simplifiedRoute, routePoints, lineColor]);

  // Start pre-loading immediately
  useEffect(() => {
    if (routePoints.length >= 2) {
      initMap();
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        mapInitStarted.current = false;
        terrainAdded.current = false;
      }
    };
  }, [initMap]);

  // When entering fullscreen: resize + fitBounds
  useEffect(() => {
    if (!fullscreen || !mapInstanceRef.current) return;

    const map = mapInstanceRef.current;

    import('mapbox-gl').then(m => {
      if (!mapInstanceRef.current) return;
      map.dragRotate.enable();
      map.touchZoomRotate.enable();
      map.touchPitch.enable();
      const hasNav = map._controls?.some((c: any) => c instanceof m.default.NavigationControl);
      if (!hasNav) {
        map.addControl(new m.default.NavigationControl({ visualizePitch: true }), 'top-right');
      }
    });

    // After the persistent div is moved into the fullscreen wrapper, resize + fitBounds
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!mapInstanceRef.current) return;
        map.resize();
        if (boundsRef.current) {
          map.fitBounds(
            [boundsRef.current.sw, boundsRef.current.ne],
            { padding: 60, pitch: 60, bearing: -20, duration: 0 }
          );
        }
      });
    });
  }, [fullscreen]);

  // Lock body scroll in fullscreen
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [fullscreen]);

  if (routePoints.length < 2) return null;

  return (
    <>
      {/* Static preview thumbnail */}
      <div
        className="w-full rounded-t-lg overflow-hidden relative cursor-pointer"
        style={{ height: `${height}px` }}
        onClick={() => setFullscreen(true)}
      >
        {isDark && (
          <div className="absolute inset-0 bg-black/30 z-[1] pointer-events-none rounded-t-lg" />
        )}

        {staticUrl && !imgError && (
          <img
            src={staticUrl}
            alt="Kartrute"
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
        )}

        {imgError && (
          <div className="w-full h-full bg-secondary/30 flex items-center justify-center">
            <MapPin className="w-8 h-8 text-muted-foreground/50" />
          </div>
        )}

        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 bg-secondary/50 animate-pulse" />
        )}

        <button
          className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 shadow-md hover:bg-background transition-colors z-10"
          title="Utforsk kartet"
        >
          <Maximize2 className="w-4 h-4 text-foreground" />
        </button>
      </div>

      {/* Hidden wrapper for tile pre-loading — portal to body */}
      {!fullscreen && createPortal(
        <div
          ref={wrapperRef}
          style={{
            position: 'fixed',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            opacity: 0,
            pointerEvents: 'none',
            left: '-9999px',
            top: '-9999px',
          }}
        />,
        document.body
      )}

      {/* Fullscreen map — portal to body */}
      {fullscreen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-background flex flex-col"
          onTouchStart={e => e.stopPropagation()}
          onTouchMove={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
          onPointerDown={e => e.stopPropagation()}
          onPointerMove={e => e.stopPropagation()}
          onPointerUp={e => e.stopPropagation()}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 left-4 z-[10000] flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full py-2 px-3 shadow-lg hover:bg-background transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Tilbake</span>
          </button>
          {/* The persistent map div gets moved here via DOM manipulation */}
          <div ref={wrapperRef} className="flex-1 w-full" />
          {mapReady && mapInstanceRef.current && (
            <RouteReplay
              map={mapInstanceRef.current}
              routePoints={routePoints}
              lineColor={lineColor}
              totalDistance={totalDistance}
              totalElevation={totalElevation}
              averageHeartrate={averageHeartrate}
              maxHeartrate={maxHeartrate}
            />
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export default MapboxRouteMap;
