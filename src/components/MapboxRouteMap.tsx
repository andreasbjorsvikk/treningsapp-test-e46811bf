import { useState, useMemo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Maximize2, Minimize2 } from 'lucide-react';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [map]);
  return null;
}

interface MapboxRouteMapProps {
  routePoints: [number, number][];
  lineColor: string;
  height: number;
  isDark: boolean;
}

// Encode polyline in Mapbox's format (Google encoded polyline format)
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

function getStaticMapUrl(routePoints: [number, number][], lineColor: string, width: number, height: number, isDark: boolean): string {
  const style = isDark ? 'dark-v11' : 'outdoors-v12';

  // Simplify to avoid URL length issues
  const simplified = simplifyPoints(routePoints, 200);
  const encoded = encodePolylineForMapbox(simplified);

  // Clean color (remove # if present)
  const color = lineColor.replace('#', '');

  // Use path overlay with encoded polyline
  const overlay = `path-3+${color}-0.85(${encodeURIComponent(encoded)})`;

  const retina = window.devicePixelRatio >= 2 ? '@2x' : '';
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/auto/${width}x${height}${retina}?padding=40&access_token=${MAPBOX_TOKEN}`;
}

const MapboxRouteMap = ({ routePoints, lineColor, height, isDark }: MapboxRouteMapProps) => {
  const [interactive, setInteractive] = useState(false);
  const [imgError, setImgError] = useState(false);

  const staticUrl = useMemo(() => {
    if (routePoints.length < 2) return null;
    return getStaticMapUrl(routePoints, lineColor, 600, Math.round(height * 1.5), isDark);
  }, [routePoints, lineColor, height, isDark]);

  const bounds = useMemo((): LatLngBoundsExpression => {
    const lats = routePoints.map(p => p[0]);
    const lngs = routePoints.map(p => p[1]);
    return [
      [Math.min(...lats) - 0.002, Math.min(...lngs) - 0.005],
      [Math.max(...lats) + 0.002, Math.max(...lngs) + 0.005],
    ];
  }, [routePoints]);

  const tileUrl = isDark
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`
    : `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/tiles/{z}/{x}/{y}@2x?access_token=${MAPBOX_TOKEN}`;

  if (routePoints.length < 2) return null;

  // If static image failed, go directly to interactive
  const showInteractive = interactive || imgError;

  return (
    <div className="w-full rounded-t-lg overflow-hidden relative" style={{ height: `${height}px` }}>
      {!showInteractive && staticUrl ? (
        <>
          <img
            src={staticUrl}
            alt="Kartrute"
            className="w-full h-full object-cover"
            loading="lazy"
            onClick={() => setInteractive(true)}
            onError={() => setImgError(true)}
          />
          <button
            onClick={() => setInteractive(true)}
            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 shadow-md hover:bg-background transition-colors z-10"
            title="Utforsk kartet"
          >
            <Maximize2 className="w-4 h-4 text-foreground" />
          </button>
        </>
      ) : (
        <>
          <MapContainer
            bounds={bounds}
            scrollWheelZoom={true}
            dragging={true}
            zoomControl={false}
            attributionControl={false}
            style={{ height: `${height}px`, width: '100%', position: 'absolute', top: 0, left: 0 }}
          >
            <TileLayer url={tileUrl} tileSize={512} zoomOffset={-1} />
            <Polyline
              positions={routePoints}
              pathOptions={{ color: lineColor, weight: 3, opacity: 0.85 }}
            />
            <MapResizer />
          </MapContainer>
          <button
            onClick={() => { setInteractive(false); setImgError(false); }}
            className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 shadow-md hover:bg-background transition-colors z-[1000]"
            title="Tilbake til standard"
          >
            <Minimize2 className="w-4 h-4 text-foreground" />
          </button>
        </>
      )}
    </div>
  );
};

export default MapboxRouteMap;
