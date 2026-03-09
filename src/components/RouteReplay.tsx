import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, X } from 'lucide-react';

interface RouteReplayProps {
  map: any; // mapboxgl.Map instance
  routePoints: [number, number][]; // [lat, lng] pairs
  lineColor: string;
  totalDistance?: number; // km
  totalElevation?: number; // m
}

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Interpolate between two points
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

// Calculate bearing between two points
function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// Build cumulative distances for each point
function buildCumulativeDistances(points: [number, number][]): number[] {
  const dists = [0];
  for (let i = 1; i < points.length; i++) {
    dists.push(dists[i - 1] + haversine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]));
  }
  return dists;
}

// Sample point along route at a given distance
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
  // Binary search for segment
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

// Estimate elevation gain from lat/lng (very rough — use totalElevation prop when available)
function estimateElevationProgress(progress: number, totalElevation: number): number {
  // Simple linear approximation
  return Math.round(progress * totalElevation);
}

const REPLAY_DURATION_MS = 15000; // 15 second replay

const RouteReplay = ({ map, routePoints, lineColor, totalDistance, totalElevation }: RouteReplayProps) => {
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState({ distance: 0, elevation: 0 });
  const markerRef = useRef<any>(null);
  const glowMarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const cumDistRef = useRef<number[]>([]);
  const totalDistRef = useRef(0);

  // Precompute cumulative distances
  useEffect(() => {
    cumDistRef.current = buildCumulativeDistances(routePoints);
    totalDistRef.current = cumDistRef.current[cumDistRef.current.length - 1];
  }, [routePoints]);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    if (glowMarkerRef.current) { glowMarkerRef.current.remove(); glowMarkerRef.current = null; }
    // Remove progress line
    try {
      if (map.getLayer('replay-progress')) map.removeLayer('replay-progress');
      if (map.getSource('replay-progress')) map.removeSource('replay-progress');
    } catch {}
  }, [map]);

  const stopReplay = useCallback(() => {
    cleanup();
    setPlaying(false);
    setFinished(false);
    setStats({ distance: 0, elevation: 0 });

    // Reset camera
    const lats = routePoints.map(p => p[0]);
    const lngs = routePoints.map(p => p[1]);
    const sw: [number, number] = [Math.min(...lngs) - 0.005, Math.min(...lats) - 0.002];
    const ne: [number, number] = [Math.max(...lngs) + 0.005, Math.max(...lats) + 0.002];
    map.fitBounds([sw, ne], { padding: 60, pitch: 60, bearing: -20, duration: 1000 });
  }, [map, routePoints, cleanup]);

  const startReplay = useCallback(async () => {
    if (!map || routePoints.length < 2) return;
    cleanup();
    setPlaying(true);
    setFinished(false);

    const mapboxgl = (await import('mapbox-gl')).default;
    const cumDist = cumDistRef.current;
    const totalDist = totalDistRef.current;
    const reportedDist = totalDistance ?? totalDist;
    const reportedElev = totalElevation ?? 0;

    // Add progress line source
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
        paint: {
          'line-color': '#ffffff',
          'line-width': 6,
          'line-opacity': 0.9,
        },
      });
    }

    // Create glow marker (outer)
    const glowEl = document.createElement('div');
    glowEl.style.cssText = `
      width: 24px; height: 24px; border-radius: 50%;
      background: radial-gradient(circle, ${lineColor}88 0%, transparent 70%);
      pointer-events: none;
    `;
    glowMarkerRef.current = new mapboxgl.Marker({ element: glowEl, anchor: 'center' })
      .setLngLat([routePoints[0][1], routePoints[0][0]])
      .addTo(map);

    // Create main marker
    const el = document.createElement('div');
    el.style.cssText = `
      width: 14px; height: 14px; border-radius: 50%;
      background: ${lineColor}; border: 2.5px solid white;
      box-shadow: 0 0 12px ${lineColor}aa, 0 2px 8px rgba(0,0,0,0.3);
      pointer-events: none;
    `;
    markerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat([routePoints[0][1], routePoints[0][0]])
      .addTo(map);

    // Initial camera
    const startBearing = bearing(routePoints[0][0], routePoints[0][1], routePoints[Math.min(5, routePoints.length - 1)][0], routePoints[Math.min(5, routePoints.length - 1)][1]);
    map.easeTo({
      center: [routePoints[0][1], routePoints[0][0]],
      zoom: 14.5,
      pitch: 65,
      bearing: startBearing,
      duration: 1500,
    });

    await new Promise(r => setTimeout(r, 1600));

    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / REPLAY_DURATION_MS, 1);

      // Ease function for natural speed variation
      const eased = progress < 0.1
        ? progress * 5 * progress * 5 * 0.02 // slow start - quadratic ease in for first 10%
        : progress > 0.9
          ? 1 - (1 - progress) * (1 - progress) * 100 * 0.01 + 0.9 * 0.99 // slow end
          : progress; // linear middle

      const currentDist = eased * totalDist;
      const pos = sampleAtDistance(routePoints, cumDist, currentDist);

      // Update marker position
      const lngLat: [number, number] = [pos.lng, pos.lat];
      markerRef.current?.setLngLat(lngLat);
      glowMarkerRef.current?.setLngLat(lngLat);

      // Update progress line
      const progressCoords: [number, number][] = [];
      for (let i = 0; i <= pos.segIdx; i++) {
        progressCoords.push([routePoints[i][1], routePoints[i][0]]);
      }
      // Add interpolated current position
      progressCoords.push([pos.lng, pos.lat]);
      
      const src = map.getSource('replay-progress');
      if (src) {
        src.setData({
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: progressCoords },
        });
      }

      // Update stats
      const distKm = (currentDist / totalDist) * reportedDist;
      const elev = estimateElevationProgress(eased, reportedElev);
      setStats({ distance: Math.round(distKm * 10) / 10, elevation: elev });

      // Camera: look ahead
      const lookAheadDist = Math.min(currentDist + totalDist * 0.05, totalDist);
      const ahead = sampleAtDistance(routePoints, cumDist, lookAheadDist);
      const camBearing = bearing(pos.lat, pos.lng, ahead.lat, ahead.lng);

      map.easeTo({
        center: lngLat,
        bearing: camBearing,
        pitch: 65,
        duration: 100,
        easing: (t: number) => t, // linear for smooth following
      });

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Finished
        setFinished(true);
        setStats({ distance: reportedDist, elevation: reportedElev });
        // Auto-reset after delay
        setTimeout(() => {
          stopReplay();
        }, 3000);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
  }, [map, routePoints, lineColor, totalDistance, totalElevation, cleanup, stopReplay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      cleanup();
    };
  }, [cleanup]);

  if (!map) return null;

  // Play button (when not playing)
  if (!playing) {
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

  // Replay overlay UI
  return (
    <>
      {/* Close button */}
      <button
        onClick={stopReplay}
        className="absolute top-4 right-4 z-[10001] p-2.5 rounded-full bg-background/90 backdrop-blur-sm shadow-lg border border-border hover:bg-background transition-colors"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      {/* Stats panel */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[10001] flex gap-6 rounded-2xl bg-background/85 backdrop-blur-md px-6 py-3 shadow-xl border border-border">
        <div className="text-center">
          <p className="text-lg font-display font-bold text-foreground leading-tight">
            {stats.distance.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">km</span>
          </p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Distanse</p>
        </div>
        {(totalElevation ?? 0) > 0 && (
          <div className="text-center">
            <p className="text-lg font-display font-bold text-foreground leading-tight">
              {stats.elevation} <span className="text-xs font-normal text-muted-foreground">m</span>
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Stigning</p>
          </div>
        )}
      </div>

      {/* Finished overlay */}
      {finished && (
        <div className="absolute inset-0 z-[10002] flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 backdrop-blur-md rounded-2xl px-8 py-6 shadow-2xl border border-border text-center animate-scale-in">
            <p className="text-2xl font-display font-bold text-foreground mb-1">🏁</p>
            <p className="text-sm font-semibold text-foreground">
              {(totalDistance ?? totalDistRef.current).toFixed(1)} km
              {(totalElevation ?? 0) > 0 && ` · ${totalElevation} m`}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default RouteReplay;
