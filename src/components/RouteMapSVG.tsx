import { useMemo } from 'react';

interface RouteMapSVGProps {
  routePoints: [number, number][];
  lineColor: string;
  height: number;
  isDark: boolean;
}

const RouteMapSVG = ({ routePoints, lineColor, height, isDark }: RouteMapSVGProps) => {
  const svgData = useMemo(() => {
    if (routePoints.length < 2) return null;

    const lats = routePoints.map(p => p[0]);
    const lngs = routePoints.map(p => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);

    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    const midLat = (minLat + maxLat) / 2;
    const lngScale = Math.cos((midLat * Math.PI) / 180);

    const W = 400;
    const H = height;
    const pad = 0.12;

    const dataW = lngRange * lngScale;
    const dataH = latRange;
    const scaleX = (W * (1 - 2 * pad)) / dataW;
    const scaleY = (H * (1 - 2 * pad)) / dataH;
    const scale = Math.min(scaleX, scaleY);

    const cx = W / 2;
    const cy = H / 2;
    const dataCx = (minLng + maxLng) / 2;
    const dataCy = (minLat + maxLat) / 2;

    const pts = routePoints.map(([lat, lng]) => {
      const x = cx + (lng - dataCx) * lngScale * scale;
      const y = cy - (lat - dataCy) * scale;
      return [x, y] as [number, number];
    });

    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

    return { d, pts, viewBox: `0 0 ${W} ${H}` };
  }, [routePoints, height]);

  if (!svgData) return null;

  const { d, pts, viewBox } = svgData;
  const start = pts[0];
  const end = pts[pts.length - 1];
  const bg = isDark ? 'hsl(220, 15%, 10%)' : 'hsl(210, 20%, 95%)';
  const gridColor = isDark ? 'hsl(220, 10%, 14%)' : 'hsl(210, 15%, 90%)';
  const shadowColor = isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.08)';
  const markerStroke = isDark ? 'hsl(220, 15%, 10%)' : 'white';

  return (
    <div className="w-full rounded-t-lg overflow-hidden" style={{ height: `${height}px` }}>
      <svg viewBox={viewBox} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <rect width="100%" height="100%" fill={bg} />
        <defs>
          <pattern id="routeGrid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke={gridColor} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#routeGrid)" />
        {/* Shadow for depth */}
        <path d={d} fill="none" stroke={shadowColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {/* Route line */}
        <path d={d} fill="none" stroke={lineColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* Start marker (green) */}
        <circle cx={start[0]} cy={start[1]} r="5" fill="hsl(142, 55%, 42%)" stroke={markerStroke} strokeWidth="2" />
        {/* End marker (red) */}
        <circle cx={end[0]} cy={end[1]} r="5" fill="hsl(0, 65%, 48%)" stroke={markerStroke} strokeWidth="2" />
      </svg>
    </div>
  );
};

export default RouteMapSVG;
