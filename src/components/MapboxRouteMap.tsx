import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Maximize2, ArrowLeft } from 'lucide-react';
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

/**
 * Tile cache warmer — creates a hidden map to pre-download tiles.
 * Destroyed after tiles are cached. The fullscreen map benefits from browser cache.
 */
function useTileCacheWarmer(routePoints: [number, number][], simplifiedRoute: [number, number][]) {
  const warmerRef = useRef<any>(null);
  const warmerContainerRef = useRef<HTMLDivElement | null>(null);
  const warmedRef = useRef(false);

  useEffect(() => {
    if (warmedRef.current || routePoints.length < 2) return;
    warmedRef.current = true;

    // Create off-screen container
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(container);
    warmerContainerRef.current = container;

    const boundsPoints = simplifiedRoute.length > 0 ? simplifiedRoute : routePoints;
    const bounds = getBounds(boundsPoints);

    import('mapbox-gl').then(m => {
      const mapboxgl = m.default;
      (mapboxgl as any).accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: bounds.center,
        zoom: 12,
        pitch: 60,
        bearing: -20,
        antialias: false,
        fadeDuration: 0,
        attributionControl: false,
        interactive: false, // No interaction needed — just cache tiles
      });

      warmerRef.current = map;

      map.once('style.load', () => {
        map.fitBounds([bounds.sw, bounds.ne], { padding: 60, pitch: 60, bearing: -20, duration: 0 });
      });

      // Destroy warmer after tiles are loaded — they stay in browser cache
      map.once('idle', () => {
        setTimeout(() => {
          map.remove();
          warmerRef.current = null;
          if (warmerContainerRef.current) {
            document.body.removeChild(warmerContainerRef.current);
            warmerContainerRef.current = null;
          }
        }, 500);
      });
    });

    return () => {
      if (warmerRef.current) {
        warmerRef.current.remove();
        warmerRef.current = null;
      }
      if (warmerContainerRef.current) {
        try { document.body.removeChild(warmerContainerRef.current); } catch {}
        warmerContainerRef.current = null;
      }
    };
  }, [routePoints, simplifiedRoute]);
}

const MapboxRouteMap = ({ routePoints, lineColor, height, isDark, onFullscreenChange, totalDistance, totalElevation, averageHeartrate, maxHeartrate }: MapboxRouteMapProps & { onFullscreenChange?: (fs: boolean) => void }) => {
  const [fullscreen, setFullscreenState] = useState(false);
  const setFullscreen = (fs: boolean) => {
    setFullscreenState(fs);
    onFullscreenChange?.(fs);
  };
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const previewMapContainerRef = useRef<HTMLDivElement>(null);
  const previewMapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const staticUrl = useMemo(() => {
    if (routePoints.length < 2) return null;
    return getGeoJsonUrl(routePoints, lineColor, 600, Math.round(height * 1.5));
  }, [routePoints, lineColor, height]);

  const simplifiedRoute = useMemo(() => {
    if (routePoints.length < 2) return [];
    return simplifyRoute(routePoints, 300);
  }, [routePoints]);

  // Pre-warm the tile cache in the background
  useTileCacheWarmer(routePoints, simplifiedRoute);

  // Create a FRESH interactive map when fullscreen opens — no DOM reparenting
  const initInteractiveMap = useCallback(async () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const mapboxgl = (await import('mapbox-gl')).default;
    await import('mapbox-gl/dist/mapbox-gl.css');
    (mapboxgl as any).accessToken = MAPBOX_TOKEN;

    const boundsPoints = simplifiedRoute.length > 0 ? simplifiedRoute : routePoints;
    const bounds = getBounds(boundsPoints);
    const coords = simplifiedRoute.map(([lat, lng]) => [lng, lat]);

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: bounds.center,
      zoom: 12,
      pitch: 60,
      bearing: -20,
      antialias: false,
      fadeDuration: 0,
    });

    // Enable all interactions immediately
    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    map.touchPitch.enable();
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    mapInstanceRef.current = map;
    setMapReady(true);

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

      map.fitBounds([bounds.sw, bounds.ne], { padding: 60, pitch: 60, bearing: -20, duration: 0 });
    });

    // Add terrain after first interaction or after 3s fallback
    let terrainAdded = false;
    const addTerrain = () => {
      if (terrainAdded || !mapInstanceRef.current) return;
      terrainAdded = true;
      setTimeout(() => {
        if (mapInstanceRef.current) {
          addEnhancedTerrain(mapInstanceRef.current, { exaggeration: 1.4 });
        }
      }, 100);
    };

    map.once('movestart', addTerrain);
    map.once('zoomstart', addTerrain);
    const fallback = setTimeout(addTerrain, 3000);

    // Store cleanup ref
    (map as any).__terrainCleanup = () => {
      clearTimeout(fallback);
      map.off('movestart', addTerrain);
      map.off('zoomstart', addTerrain);
    };
  }, [routePoints, simplifiedRoute, lineColor]);

  // Init/destroy map with fullscreen state
  useEffect(() => {
    if (fullscreen) {
      initInteractiveMap();
    }
    return () => {
      if (!fullscreen && mapInstanceRef.current) {
        (mapInstanceRef.current as any).__terrainCleanup?.();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, [fullscreen, initInteractiveMap]);

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
          <div className="w-full h-full bg-muted/50 flex items-center justify-center text-muted-foreground">
            <Maximize2 className="w-6 h-6 opacity-50" />
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

      {/* Fullscreen map — fresh instance in portal, no DOM reparenting */}
      {fullscreen && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-background flex flex-col"
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 left-4 z-[10000] flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full py-2 px-3 shadow-lg hover:bg-background transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
            <span className="text-sm font-medium text-foreground">Tilbake</span>
          </button>
          <div
            ref={mapContainerRef}
            className="flex-1 w-full"
          />
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
