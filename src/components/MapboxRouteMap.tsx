import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Maximize2, ArrowLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import RouteReplay from '@/components/RouteReplay';

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

// Douglas-Peucker simplification for route rendering
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
  // Adaptive epsilon based on point count
  let epsilon = 0.00002;
  let result = dpSimplify(points, epsilon);
  // Increase epsilon until we're under target
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
  const [previewMapReady, setPreviewMapReady] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const previewMapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const previewMapRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const staticUrl = useMemo(() => {
    if (routePoints.length < 2) return null;
    return getGeoJsonUrl(routePoints, lineColor, 600, Math.round(height * 1.5));
  }, [routePoints, lineColor, height]);

  // Initialize a small static preview map as fallback when image fails
  const initPreviewMap = useCallback(async () => {
    if (!previewMapContainerRef.current || previewMapRef.current) return;

    const mapboxgl = (await import('mapbox-gl')).default;
    await import('mapbox-gl/dist/mapbox-gl.css');
    (mapboxgl as any).accessToken = MAPBOX_TOKEN;

    const bounds = getBounds(routePoints);

    const map = new mapboxgl.Map({
      container: previewMapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: bounds.center,
      zoom: 11,
      interactive: false,
      attributionControl: false,
    });

    map.on('style.load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routePoints.map(([lat, lng]) => [lng, lat]),
          },
        },
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': lineColor, 'line-width': 3, 'line-opacity': 0.9 },
      });

      map.fitBounds([bounds.sw, bounds.ne], { padding: 30, duration: 0 });
      setPreviewMapReady(true);
    });

    previewMapRef.current = map;
  }, [routePoints, lineColor]);

  // If static image fails, render a small non-interactive map preview
  useEffect(() => {
    if (imgError && !previewMapRef.current) {
      initPreviewMap();
    }
    return () => {
      if (previewMapRef.current) {
        previewMapRef.current.remove();
        previewMapRef.current = null;
      }
    };
  }, [imgError, initPreviewMap]);

  const initInteractiveMap = useCallback(async () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    console.time('[MapPerf] import mapbox');
    const mapboxgl = (await import('mapbox-gl')).default;
    await import('mapbox-gl/dist/mapbox-gl.css');
    (mapboxgl as any).accessToken = MAPBOX_TOKEN;
    console.timeEnd('[MapPerf] import mapbox');

    // Pre-simplify route BEFORE creating map
    console.time('[MapPerf] simplify route');
    const rawCount = routePoints.length;
    const simplified = simplifyRoute(routePoints, 400);
    console.timeEnd('[MapPerf] simplify route');
    console.log(`[MapPerf] Route: ${rawCount} raw → ${simplified.length} simplified`);

    const bounds = getBounds(simplified);

    console.time('[MapPerf] create map');
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: bounds.center,
      zoom: 12,
      pitch: 60,
      bearing: -20,
      antialias: false,
      fadeDuration: 0,
      trackResize: false,
      refreshExpiredTiles: false,
    });
    console.timeEnd('[MapPerf] create map');

    map.dragRotate.enable();
    map.touchZoomRotate.enable();
    map.touchPitch.enable();

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    mapInstanceRef.current = map;
    // Set ready immediately so user can interact with base map
    setMapReady(true);

    // Phase 2: Add route after style loads — use simplified data
    map.once('style.load', () => {
      console.time('[MapPerf] add route');
      const coords = simplified.map(([lat, lng]) => [lng, lat]);
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
      console.timeEnd('[MapPerf] add route');

      // Phase 3: fitBounds with no animation
      console.time('[MapPerf] fitBounds');
      map.fitBounds(
        [bounds.sw, bounds.ne],
        { padding: 60, pitch: 60, bearing: -20, duration: 0 }
      );
      console.timeEnd('[MapPerf] fitBounds');
    });

    // Phase 4: Defer terrain to idle — use requestIdleCallback if available
    const addTerrain = () => {
      try {
        console.time('[MapPerf] add terrain');
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          });
        }
        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

        if (!map.getLayer('sky')) {
          map.addLayer({
            id: 'sky',
            type: 'sky',
            paint: {
              'sky-type': 'atmosphere',
              'sky-atmosphere-sun': [0.0, 90.0],
              'sky-atmosphere-sun-intensity': 15,
            },
          });
        }
        console.timeEnd('[MapPerf] add terrain');
        // Re-enable resize tracking after everything is loaded
        (map as any)._trackResize = true;
      } catch {}
    };

    map.once('idle', () => {
      // Use requestIdleCallback to avoid blocking interaction
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(addTerrain);
      } else {
        setTimeout(addTerrain, 200);
      }
    });
  }, [routePoints, lineColor]);

  // Init map when fullscreen opens — no delay for instant responsiveness
  useEffect(() => {
    if (fullscreen) {
      initInteractiveMap();
    }
    return () => {
      if (!fullscreen && mapInstanceRef.current) {
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

  const closeFullscreen = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    setMapReady(false);
    setFullscreen(false);
  };

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
        
        {/* Static image (primary) */}
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
        
        {/* Fallback: non-interactive mini map */}
        {imgError && (
          <div
            ref={previewMapContainerRef}
            className="w-full h-full"
          />
        )}
        
        {/* Loading state */}
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

      {/* Fullscreen map portal */}
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
            onClick={closeFullscreen}
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