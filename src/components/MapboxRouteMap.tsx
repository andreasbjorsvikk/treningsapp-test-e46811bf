import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

interface MapboxRouteMapProps {
  routePoints: [number, number][];
  lineColor: string;
  height: number;
  isDark: boolean;
}

function encodePolylineForMapbox(points: [number, number][]): string {
  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;
  for (const [lat, lng] of points) {
    const dLat = Math.round((lat - prevLat) * 1e5);
    const dLng = Math.round((lng - prevLng) * 1e5);
    prevLat = lat;
    prevLng = lng;
    encoded += encodeValue(dLat) + encodeValue(dLng);
  }
  return encoded;
}

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let encoded = '';
  while (v >= 0x20) {
    encoded += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  encoded += String.fromCharCode(v + 63);
  return encoded;
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

function getStaticMapUrl(routePoints: [number, number][], lineColor: string, width: number, height: number): string {
  const style = 'outdoors-v12';
  const simplified = simplifyPoints(routePoints, 120);
  const encoded = encodePolylineForMapbox(simplified);
  const color = lineColor.replace('#', '');
  const overlay = `path-4+${color}-0.95(${encodeURIComponent(encoded)})`;
  const retina = window.devicePixelRatio >= 2 ? '@2x' : '';
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/auto/${width}x${height}${retina}?padding=40&access_token=${MAPBOX_TOKEN}`;
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

const MapboxRouteMap = ({ routePoints, lineColor, height, isDark }: MapboxRouteMapProps) => {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [expandedHeight, setExpandedHeight] = useState(400);

  const staticUrl = useMemo(() => {
    if (routePoints.length < 2) return null;
    return getStaticMapUrl(routePoints, lineColor, 600, Math.round(height * 1.5));
  }, [routePoints, lineColor, height]);

  // Lock parent scroll on touch
  useEffect(() => {
    const target = mapContainerRef.current || wrapperRef.current;
    if (!target) return;

    const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
      while (el) {
        if (el.scrollHeight > el.clientHeight && getComputedStyle(el).overflowY !== 'visible') return el;
        el = el.parentElement;
      }
      return null;
    };

    let scrollParent: HTMLElement | null = null;
    let savedOverflow = '';

    const onTouchStart = () => {
      scrollParent = findScrollParent(target.parentElement);
      if (scrollParent) {
        savedOverflow = scrollParent.style.overflowY;
        scrollParent.style.overflowY = 'hidden';
      }
    };
    const onTouchEnd = () => {
      if (scrollParent) {
        scrollParent.style.overflowY = savedOverflow;
        scrollParent = null;
      }
    };

    target.addEventListener('touchstart', onTouchStart, { passive: true });
    target.addEventListener('touchend', onTouchEnd, { passive: true });
    target.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      target.removeEventListener('touchstart', onTouchStart);
      target.removeEventListener('touchend', onTouchEnd);
      target.removeEventListener('touchcancel', onTouchEnd);
      onTouchEnd();
    };
  }, [expanded]);

  // Calculate expanded height
  useEffect(() => {
    if (expanded && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setExpandedHeight(Math.max(rect.bottom, height));
    }
  }, [expanded, height]);

  const initInteractiveMap = useCallback(async () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const mapboxgl = (await import('mapbox-gl')).default;
    await import('mapbox-gl/dist/mapbox-gl.css');

    (mapboxgl as any).accessToken = MAPBOX_TOKEN;

    const bounds = getBounds(routePoints);

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: bounds.center,
      zoom: 12,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('style.load', () => {
      // Enable 3D terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Add sky layer for atmosphere
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });

      // Add route line
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
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': lineColor,
          'line-width': 4,
          'line-opacity': 0.95,
        },
      });

      // Fit bounds with padding
      map.fitBounds(
        [bounds.sw, bounds.ne],
        { padding: 60, pitch: 60, bearing: -20, duration: 1000 }
      );
    });

    mapInstanceRef.current = map;
  }, [routePoints, lineColor]);

  useEffect(() => {
    if (expanded && !imgError) {
      initInteractiveMap();
    }
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [expanded, initInteractiveMap]);

  useEffect(() => {
    if (imgError) {
      initInteractiveMap();
    }
  }, [imgError, initInteractiveMap]);

  useEffect(() => {
    if (expanded && mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.resize(), 50);
      setTimeout(() => mapInstanceRef.current?.resize(), 300);
    }
  }, [expanded, expandedHeight]);

  if (routePoints.length < 2) return null;

  const showInteractive = expanded || imgError;
  const currentHeight = showInteractive ? expandedHeight : height;

  return (
    <div
      ref={wrapperRef}
      className="w-full rounded-t-lg overflow-hidden relative"
      style={{ height: `${currentHeight}px`, transition: 'height 0.3s ease' }}
    >
      {!showInteractive && staticUrl ? (
        <>
          {isDark && (
            <div className="absolute inset-0 bg-black/30 z-[1] pointer-events-none rounded-t-lg" />
          )}
          <img
            src={staticUrl}
            alt="Kartrute"
            className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="lazy"
            onClick={() => setExpanded(true)}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
          />
          {!imgLoaded && (
            <div className="absolute inset-0 bg-secondary/50 animate-pulse" />
          )}
          <button
            onClick={() => setExpanded(true)}
            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 shadow-md hover:bg-background transition-colors z-10"
            title="Utforsk kartet"
          >
            <Maximize2 className="w-4 h-4 text-foreground" />
          </button>
        </>
      ) : (
        <>
          <div
            ref={mapContainerRef}
            style={{ height: `${currentHeight}px`, width: '100%' }}
          />
          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
              }
              setExpanded(false);
              setImgError(false);
              setImgLoaded(false);
            }}
            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 shadow-md hover:bg-background transition-colors z-[1000]"
            title="Minimer"
          >
            <Minimize2 className="w-4 h-4 text-foreground" />
          </button>
        </>
      )}
    </div>
  );
};

export default MapboxRouteMap;
