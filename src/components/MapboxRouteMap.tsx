import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Maximize2, ArrowLeft } from 'lucide-react';
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

export function getBounds(routePoints: [number, number][]): { sw: [number, number]; ne: [number, number]; center: [number, number] } {
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

export { simplifyRoute, MAPBOX_TOKEN };

/**
 * Thumbnail-only component. Fullscreen map is rendered by WorkoutDetailDrawer
 * OUTSIDE the vaul Drawer to avoid event capture issues.
 */
const MapboxRouteMap = ({ routePoints, lineColor, height, isDark, onFullscreenChange }: MapboxRouteMapProps & { onFullscreenChange?: (fs: boolean) => void }) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const previewMapContainerRef = useRef<HTMLDivElement>(null);
  const previewMapRef = useRef<any>(null);

  const staticUrl = useMemo(() => {
    if (routePoints.length < 2) return null;
    return getGeoJsonUrl(routePoints, lineColor, 600, Math.round(height * 1.5));
  }, [routePoints, lineColor, height]);

  const simplifiedRoute = useMemo(() => {
    if (routePoints.length < 2) return [];
    return simplifyRoute(routePoints, 300);
  }, [routePoints]);

  // Initialize a non-interactive preview map when static image fails
  const initPreviewMap = useCallback(async () => {
    if (!previewMapContainerRef.current || previewMapRef.current) return;
    const mapboxgl = (await import('mapbox-gl')).default;
    await import('mapbox-gl/dist/mapbox-gl.css');
    (mapboxgl as any).accessToken = MAPBOX_TOKEN;
    const bounds = getBounds(simplifiedRoute.length > 0 ? simplifiedRoute : routePoints);
    const coords = (simplifiedRoute.length > 0 ? simplifiedRoute : routePoints).map(([lat, lng]) => [lng, lat]);
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
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } },
      });
      map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': lineColor, 'line-width': 3, 'line-opacity': 0.9 },
      });
      map.fitBounds([bounds.sw, bounds.ne], { padding: 30, duration: 0 });
    });
    previewMapRef.current = map;
  }, [routePoints, simplifiedRoute, lineColor]);

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

  if (routePoints.length < 2) return null;

  return (
    <div
      className="w-full rounded-t-lg overflow-hidden relative cursor-pointer"
      style={{ height: `${height}px` }}
      onClick={() => onFullscreenChange?.(true)}
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
        <div
          ref={previewMapContainerRef}
          className="w-full h-full"
        />
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
  );
};

export default MapboxRouteMap;
