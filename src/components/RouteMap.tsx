import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import { LatLngBoundsExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue in bundlers
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    // Multiple invalidateSize calls to handle drawer animation
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 200);
    const t3 = setTimeout(() => map.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [map]);
  return null;
}

interface RouteMapProps {
  routePoints: [number, number][];
  lineColor: string;
  tileUrl: string;
  height: number;
}

const RouteMap = ({ routePoints, lineColor, tileUrl, height }: RouteMapProps) => {
  const bounds = useMemo((): LatLngBoundsExpression => {
    const lats = routePoints.map(p => p[0]);
    const lngs = routePoints.map(p => p[1]);
    return [
      [Math.min(...lats) - 0.002, Math.min(...lngs) - 0.005],
      [Math.max(...lats) + 0.002, Math.max(...lngs) + 0.005],
    ];
  }, [routePoints]);

  return (
    <div className="w-full relative" style={{ height: `${height}px` }}>
      <MapContainer
        bounds={bounds}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={false}
        attributionControl={false}
        style={{ height: `${height}px`, width: '100%', position: 'absolute', top: 0, left: 0 }}
      >
        <TileLayer url={tileUrl} />
        <Polyline
          positions={routePoints}
          pathOptions={{ color: lineColor, weight: 3, opacity: 0.85 }}
        />
        <MapResizer />
      </MapContainer>
    </div>
  );
};

export default RouteMap;
