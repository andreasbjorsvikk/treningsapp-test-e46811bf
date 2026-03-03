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
  // Always use outdoors style
  const style = 'outdoors-v12';
  const simplified = simplifyPoints(routePoints, 120);
  const encoded = encodePolylineForMapbox(simplified);
  const color = lineColor.replace('#', '');
  const overlay = `path-4+${color}-0.95(${encodeURIComponent(encoded)})`;
  const retina = window.devicePixelRatio >= 2 ? '@2x' : '';
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/auto/${width}x${height}${retina}?padding=40&access_token=${MAPBOX_TOKEN}`;
}

const MapboxRouteMap = ({ routePoints, lineColor, height, isDark }: MapboxRouteMapProps) => {
  const [expanded, setExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Lock parent/drawer scroll when touching the map area (both static and expanded)
  useEffect(() => {
    const mapEl = mapContainerRef.current;
    const wrapperEl = wrapperRef.current;
    const target = mapEl || wrapperEl;
    if (!target) return;

    // Find the scrollable drawer parent
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [expandedHeight, setExpandedHeight] = useState(400);

  const staticUrl = useMemo(() => {
    if (routePoints.length < 2) return null;
    return getStaticMapUrl(routePoints, lineColor, 600, Math.round(height * 1.5));
  }, [routePoints, lineColor, height]);

  // Calculate available height above for expansion
  useEffect(() => {
    if (expanded && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      // Fill from top of drawer content to current bottom of map
      const availableHeight = rect.bottom;
      setExpandedHeight(Math.max(availableHeight, height));
    }
  }, [expanded, height]);

  const initInteractiveMap = useCallback(async () => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const L = (await import('leaflet')).default;
    await import('leaflet/dist/leaflet.css');

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const lats = routePoints.map(p => p[0]);
    const lngs = routePoints.map(p => p[1]);
    const bounds: L.LatLngBoundsExpression = [
      [Math.min(...lats) - 0.002, Math.min(...lngs) - 0.005],
      [Math.max(...lats) + 0.002, Math.max(...lngs) + 0.005],
    ];

    // Always outdoors style
    const tileUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;

    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: true,
      dragging: true,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(tileUrl, { tileSize: 512, zoomOffset: -1 }).addTo(map);
    L.polyline(routePoints, { color: lineColor, weight: 4, opacity: 0.95 }).addTo(map);

    map.fitBounds(bounds);
    mapInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 50);
    setTimeout(() => map.invalidateSize(), 200);
    setTimeout(() => map.invalidateSize(), 500);
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

  // Resize map when expanded height changes
  useEffect(() => {
    if (expanded && mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50);
      setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300);
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
          {/* Dark mode overlay */}
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
          {/* Dark mode overlay on interactive map */}
          {isDark && (
            <div className="absolute inset-0 bg-black/20 z-[999] pointer-events-none" />
          )}
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
