import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, X } from 'lucide-react';

interface RouteReplayProps {
  map: any;
  routePoints: [number, number][]; // [lat, lng] pairs
  lineColor: string;
  totalDistance?: number; // km
  totalElevation?: number; // m
  averageHeartrate?: number | null;
  maxHeartrate?: number | null;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function buildCumulativeDistances(points: [number, number][]): number[] {
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    dists.push(dists[i - 1] + haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]));
  }
  return dists;
}

function sampleAtDistance(
  points: [number, number][],
  cumDist: number[],
  targetDist: number
): { lat: number; lng: number; segIdx: number; t: number } {
  if (targetDist <= 0) return { lat: points[0][0], lng: points[0][1], segIdx: 0, t: 0 };
  if (targetDist >= cumDist[cumDist.length - 1]) {
    const last = points[points.length - 1];
    return { lat: last[0], lng: last[1], segIdx: points.length - 2, t: 1 };
  }
  let lo = 0, hi = cumDist.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cumDist[mid] <= targetDist) lo = mid;
    else hi = mid;
  }
  const segLen = cumDist[hi] - cumDist[lo];
  const t = segLen > 0 ? (targetDist - cumDist[lo]) / segLen : 0;
  return {
    lat: lerp(points[lo][0], points[hi][0], t),
    lng: lerp(points[lo][1], points[hi][1], t),
    segIdx: lo,
    t,
  };
}

// Catmull-Rom spline interpolation for smooth GPS lines
function catmullRomSpline(points: [number, number][], numPointsPerSegment: number = 3): [number, number][] {
  if (points.length < 3) return points;
  const result: [number, number][] = [points[0]];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[Math.min(i + 1, points.length - 1)];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    for (let j = 1; j <= numPointsPerSegment; j++) {
      const t = j / numPointsPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const lat = 0.5 * (
        (2 * p1[0]) +
        (-p0[0] + p2[0]) * t +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3
      );
      const lng = 0.5 * (
        (2 * p1[1]) +
        (-p0[1] + p2[1]) * t +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
      );
      result.push([lat, lng]);
    }
  }
  return result;
}

// Simplify points using Ramer-Douglas-Peucker before smoothing
function rdpSimplify(points: [number, number][], epsilon: number): [number, number][] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let maxIdx = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDist(points[i], start, end);
    if (d > maxDist) { maxDist = d; maxIdx = i; }
  }
  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function perpendicularDist(point: [number, number], start: [number, number], end: [number, number]): number {
  const dx = end[1] - start[1];
  const dy = end[0] - start[0];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return Math.sqrt((point[0] - start[0]) ** 2 + (point[1] - start[1]) ** 2);
  return Math.abs(dy * point[1] - dx * point[0] + end[1] * start[0] - end[0] * start[1]) / len;
}

function smoothRoute(points: [number, number][]): [number, number][] {
  // Simplify to remove GPS jitter, then spline-interpolate for smooth curves
  const simplified = rdpSimplify(points, 0.00003); // ~3m tolerance
  return catmullRomSpline(simplified, 4);
}

function getReplayDuration(totalDistKm: number): number {
  const base = 25000;
  const perKm = 2000;
  return Math.min(60000, Math.max(base, base + totalDistKm * perKm));
}

const DARK_GREEN = '#1a6b3c';

const RouteReplay = ({ map, routePoints, lineColor, totalDistance, totalElevation, averageHeartrate, maxHeartrate }: RouteReplayProps) => {
  const [phase, setPhase] = useState<'idle' | 'intro' | 'playing' | 'outro'>('idle');
  const [stats, setStats] = useState({ distance: 0, elevation: 0 });
  const markerRef = useRef<any>(null);
  const glowMarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const cumDistRef = useRef<number[]>([]);
  const totalDistRef = useRef(0);
  const stoppedRef = useRef(false);
  const routeHiddenRef = useRef(false);

  useEffect(() => {
    cumDistRef.current = buildCumulativeDistances(routePoints);
    totalDistRef.current = cumDistRef.current[cumDistRef.current.length - 1];
  }, [routePoints]);

  const cleanup = useCallback(() => {
    stoppedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    if (glowMarkerRef.current) { glowMarkerRef.current.remove(); glowMarkerRef.current = null; }
    try {
      if (map.getLayer('replay-progress')) map.removeLayer('replay-progress');
      if (map.getSource('replay-progress')) map.removeSource('replay-progress');
    } catch {}
    // Restore original route visibility
    if (routeHiddenRef.current) {
      try {
        if (map.getLayer('route-line')) {
          map.setLayoutProperty('route-line', 'visibility', 'visible');
        }
      } catch {}
      routeHiddenRef.current = false;
    }
  }, [map]);

  const resetCamera = useCallback(() => {
    const lats = routePoints.map(p => p[0]);
    const lngs = routePoints.map(p => p[1]);
    const sw: [number, number] = [Math.min(...lngs) - 0.005, Math.min(...lats) - 0.002];
    const ne: [number, number] = [Math.max(...lngs) + 0.005, Math.max(...lats) + 0.002];
    map.fitBounds([sw, ne], { padding: 60, pitch: 60, bearing: -20, duration: 1200 });
  }, [map, routePoints]);

  const stopReplay = useCallback(() => {
    cleanup();
    setPhase('idle');
    setStats({ distance: 0, elevation: 0 });
    resetCamera();
  }, [cleanup, resetCamera]);

  const startReplay = useCallback(async () => {
    if (!map || routePoints.length < 2) return;
    cleanup();
    stoppedRef.current = false;
    setPhase('intro');
    setStats({ distance: 0, elevation: 0 });

    const mapboxgl = (await import('mapbox-gl')).default;
    const cumDist = cumDistRef.current;
    const totalDist = totalDistRef.current;
    const reportedDist = totalDistance ?? totalDist;
    const reportedElev = totalElevation ?? 0;
    const replayDuration = getReplayDuration(reportedDist);

    // Hide the existing route line
    try {
      if (map.getLayer('route-line')) {
        map.setLayoutProperty('route-line', 'visibility', 'none');
        routeHiddenRef.current = true;
      }
    } catch {}

    // Fly camera to start point with a nice zoom
    const startBearing = bearing(
      routePoints[0][0], routePoints[0][1],
      routePoints[Math.min(15, routePoints.length - 1)][0],
      routePoints[Math.min(15, routePoints.length - 1)][1]
    );

    map.flyTo({
      center: [routePoints[0][1], routePoints[0][0]],
      zoom: 15,
      pitch: 65,
      bearing: startBearing,
      duration: 2200,
      essential: true,
    });

    await new Promise(r => setTimeout(r, 2400));
    if (stoppedRef.current) return;

    setPhase('playing');

    // Add progress line (dark green, drawn as marker moves)
    if (!map.getSource('replay-progress')) {
      map.addSource('replay-progress', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addLayer({
        id: 'replay-progress',
        type: 'line',
        source: 'replay-progress',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': DARK_GREEN, 'line-width': 5, 'line-opacity': 0.9 },
      });
    }

    // Glow marker (outer pulse)
    const glowEl = document.createElement('div');
    glowEl.style.cssText = `
      width: 28px; height: 28px; border-radius: 50%;
      background: radial-gradient(circle, ${DARK_GREEN}55 0%, transparent 70%);
      pointer-events: none;
      animation: replay-pulse 2s ease-in-out infinite;
    `;
    glowMarkerRef.current = new mapboxgl.Marker({ element: glowEl, anchor: 'center' })
      .setLngLat([routePoints[0][1], routePoints[0][0]])
      .addTo(map);

    // Main marker dot
    const el = document.createElement('div');
    el.style.cssText = `
      width: 14px; height: 14px; border-radius: 50%;
      background: ${DARK_GREEN}; border: 3px solid white;
      box-shadow: 0 0 12px ${DARK_GREEN}aa, 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([routePoints[0][1], routePoints[0][0]])
      .addTo(map);

    // Inject pulse animation CSS
    if (!document.getElementById('replay-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'replay-pulse-style';
      style.textContent = `
        @keyframes replay-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.6); opacity: 0.15; }
        }
      `;
      document.head.appendChild(style);
    }

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      if (stoppedRef.current) return;
      const elapsed = now - startTimeRef.current;
      const rawProgress = Math.min(elapsed / replayDuration, 1);

      // Smooth cubic ease-in-out
      let eased: number;
      if (rawProgress < 0.5) {
        eased = 4 * rawProgress * rawProgress * rawProgress;
      } else {
        eased = 1 - Math.pow(-2 * rawProgress + 2, 3) / 2;
      }

      const currentDist = eased * totalDist;
      const pos = sampleAtDistance(routePoints, cumDist, currentDist);

      const lngLat: [number, number] = [pos.lng, pos.lat];
      markerRef.current?.setLngLat(lngLat);
      glowMarkerRef.current?.setLngLat(lngLat);

      // Update progress line (draw behind marker)
      const progressCoords: [number, number][] = [];
      for (let i = 0; i <= pos.segIdx; i++) {
        progressCoords.push([routePoints[i][1], routePoints[i][0]]);
      }
      progressCoords.push([pos.lng, pos.lat]);

      try {
        const src = map.getSource('replay-progress');
        if (src) {
          src.setData({
            type: 'Feature', properties: {},
            geometry: { type: 'LineString', coordinates: progressCoords },
          });
        }
      } catch {}

      // Stats
      const distKm = eased * reportedDist;
      const elev = Math.round(eased * reportedElev);
      setStats({ distance: Math.round(distKm * 10) / 10, elevation: elev });

      // NO camera auto-follow — user controls the map freely

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // --- OUTRO ---
        setPhase('outro');
        setStats({ distance: reportedDist, elevation: reportedElev });

        // Zoom out to show full route after a moment
        const lats = routePoints.map(p => p[0]);
        const lngs = routePoints.map(p => p[1]);
        const sw: [number, number] = [Math.min(...lngs) - 0.008, Math.min(...lats) - 0.004];
        const ne: [number, number] = [Math.max(...lngs) + 0.008, Math.max(...lats) + 0.004];

        setTimeout(() => {
          if (stoppedRef.current) return;
          map.fitBounds([sw, ne], {
            padding: 50,
            pitch: 55,
            duration: 2500,
          });
        }, 600);

        // Auto-close after showing stats
        setTimeout(() => {
          if (!stoppedRef.current) stopReplay();
        }, 7000);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [map, routePoints, lineColor, totalDistance, totalElevation, cleanup, stopReplay, resetCamera]);

  useEffect(() => {
    return () => {
      stoppedRef.current = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      cleanup();
    };
  }, [cleanup]);

  if (!map) return null;

  const reportedDist = totalDistance ?? totalDistRef.current;
  const reportedElev = totalElevation ?? 0;

  if (phase === 'idle') {
    return (
      <button
        onClick={startReplay}
        className="absolute bottom-6 right-4 z-[10001] flex items-center gap-2 rounded-full bg-background/90 backdrop-blur-sm px-4 py-2.5 shadow-lg border border-border hover:bg-background transition-all hover:scale-105"
      >
        <Play className="w-5 h-5 text-primary fill-primary" />
        <span className="text-sm font-semibold text-foreground">Replay</span>
      </button>
    );
  }

  return (
    <>
      {/* Close button */}
      <button
        onClick={stopReplay}
        className="absolute top-4 right-4 z-[10001] p-2.5 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border border-border hover:bg-background transition-colors"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      {/* Live stats during playing */}
      {phase === 'playing' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[10001] flex gap-6 rounded-2xl bg-background/85 backdrop-blur-md px-6 py-3 shadow-xl border border-border animate-fade-in">
          <div className="text-center">
            <p className="text-lg font-bold text-foreground leading-tight">
              {stats.distance.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">km</span>
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Distanse</p>
          </div>
          {reportedElev > 0 && (
            <div className="text-center">
              <p className="text-lg font-bold text-foreground leading-tight">
                {stats.elevation} <span className="text-xs font-normal text-muted-foreground">m</span>
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stigning</p>
            </div>
          )}
        </div>
      )}

      {/* Outro: 3D stats card */}
      {phase === 'outro' && (
        <div className="absolute inset-0 z-[10002] flex items-end justify-center pb-10 pointer-events-none animate-fade-in">
          <div
            className="pointer-events-auto rounded-2xl px-8 py-6 shadow-2xl border border-border/50 text-center"
            style={{
              background: 'linear-gradient(145deg, hsl(var(--background) / 0.92), hsl(var(--card) / 0.88))',
              backdropFilter: 'blur(16px)',
              transform: 'perspective(800px) rotateX(4deg) rotateY(-2deg)',
              boxShadow: `
                0 25px 50px -12px rgba(0,0,0,0.4),
                0 12px 24px -8px rgba(0,0,0,0.2),
                inset 0 1px 0 rgba(255,255,255,0.15),
                inset 0 -1px 0 rgba(0,0,0,0.1)
              `,
            }}
          >
            <p className="text-2xl mb-3">🏁</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <div className="text-center">
                <p className="text-xl font-bold text-foreground">{reportedDist.toFixed(1)}<span className="text-xs font-normal text-muted-foreground ml-1">km</span></p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Distanse</p>
              </div>
              {reportedElev > 0 && (
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{reportedElev}<span className="text-xs font-normal text-muted-foreground ml-1">m</span></p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stigning</p>
                </div>
              )}
              {averageHeartrate && averageHeartrate > 0 && (
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{Math.round(averageHeartrate)}<span className="text-xs font-normal text-muted-foreground ml-1">bpm</span></p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gj.sn. puls</p>
                </div>
              )}
              {maxHeartrate && maxHeartrate > 0 && (
                <div className="text-center">
                  <p className="text-xl font-bold text-foreground">{Math.round(maxHeartrate)}<span className="text-xs font-normal text-muted-foreground ml-1">bpm</span></p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Maks puls</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RouteReplay;
