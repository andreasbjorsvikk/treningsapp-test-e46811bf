import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, X } from 'lucide-react';

interface RouteReplayProps {
  map: any;
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

// Detect elevation peaks from GPS points (simple local maxima detection)
function detectHighPoints(points: [number, number][], cumDist: number[], totalDist: number): number[] {
  // Return normalized distances (0-1) of likely high points
  // Use latitude as a rough proxy (higher lat != higher elev, but we detect
  // points where the route "turns around" at extremes which often are peaks)
  if (points.length < 20) return [];
  const highPoints: number[] = [];
  const windowSize = Math.max(10, Math.floor(points.length / 20));
  
  for (let i = windowSize; i < points.length - windowSize; i++) {
    const before = points.slice(i - windowSize, i);
    const after = points.slice(i + 1, i + windowSize + 1);
    const curLat = points[i][0];
    const isLocalMax = before.every(p => p[0] <= curLat + 0.0001) && after.every(p => p[0] <= curLat + 0.0001);
    // Also check longitude extremes as peaks can be at any direction
    const curLng = points[i][1];
    const isLngExtreme = before.every(p => p[1] <= curLng + 0.0001) && after.every(p => p[1] <= curLng + 0.0001);
    
    if (isLocalMax || isLngExtreme) {
      const normalizedDist = cumDist[i] / totalDist;
      // Don't add points too close to start/end or to each other
      if (normalizedDist > 0.15 && normalizedDist < 0.85) {
        if (highPoints.length === 0 || normalizedDist - highPoints[highPoints.length - 1] > 0.15) {
          highPoints.push(normalizedDist);
        }
      }
    }
  }
  return highPoints.slice(0, 3); // max 3 peaks
}

// Smooth bearing to avoid jumps
function smoothBearing(current: number, target: number, factor: number): number {
  let diff = target - current;
  // Normalize to [-180, 180]
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return current + diff * factor;
}

// Duration scales with route distance
function getReplayDuration(totalDistKm: number): number {
  // Min 20s, max 45s, scales linearly
  const base = 20000;
  const perKm = 1500;
  return Math.min(45000, Math.max(base, base + totalDistKm * perKm));
}

const INTRO_DURATION_MS = 2500;
const OUTRO_DURATION_MS = 3500;

const RouteReplay = ({ map, routePoints, lineColor, totalDistance, totalElevation }: RouteReplayProps) => {
  const [phase, setPhase] = useState<'idle' | 'intro' | 'playing' | 'outro'>('idle');
  const [stats, setStats] = useState({ distance: 0, elevation: 0 });
  const [showFinish, setShowFinish] = useState(false);
  const markerRef = useRef<any>(null);
  const glowMarkerRef = useRef<any>(null);
  const pulseMarkerRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const cumDistRef = useRef<number[]>([]);
  const totalDistRef = useRef(0);
  const highPointsRef = useRef<number[]>([]);
  const currentBearingRef = useRef(0);
  const stoppedRef = useRef(false);

  useEffect(() => {
    cumDistRef.current = buildCumulativeDistances(routePoints);
    totalDistRef.current = cumDistRef.current[cumDistRef.current.length - 1];
    highPointsRef.current = detectHighPoints(routePoints, cumDistRef.current, totalDistRef.current);
  }, [routePoints]);

  const cleanup = useCallback(() => {
    stoppedRef.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    if (glowMarkerRef.current) { glowMarkerRef.current.remove(); glowMarkerRef.current = null; }
    if (pulseMarkerRef.current) { pulseMarkerRef.current.remove(); pulseMarkerRef.current = null; }
    try {
      if (map.getLayer('replay-progress')) map.removeLayer('replay-progress');
      if (map.getSource('replay-progress')) map.removeSource('replay-progress');
      if (map.getLayer('replay-glow')) map.removeLayer('replay-glow');
      if (map.getSource('replay-glow')) map.removeSource('replay-glow');
    } catch {}
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
    setShowFinish(false);
    setStats({ distance: 0, elevation: 0 });
    resetCamera();
  }, [cleanup, resetCamera]);

  const startReplay = useCallback(async () => {
    if (!map || routePoints.length < 2) return;
    cleanup();
    stoppedRef.current = false;
    setPhase('intro');
    setShowFinish(false);
    setStats({ distance: 0, elevation: 0 });

    const mapboxgl = (await import('mapbox-gl')).default;
    const cumDist = cumDistRef.current;
    const totalDist = totalDistRef.current;
    const reportedDist = totalDistance ?? totalDist;
    const reportedElev = totalElevation ?? 0;
    const replayDuration = getReplayDuration(reportedDist);

    // --- INTRO: Show full route, then fly to start ---
    // Step 1: Zoom out to show entire route
    const lats = routePoints.map(p => p[0]);
    const lngs = routePoints.map(p => p[1]);
    const sw: [number, number] = [Math.min(...lngs) - 0.008, Math.min(...lats) - 0.004];
    const ne: [number, number] = [Math.max(...lngs) + 0.008, Math.max(...lats) + 0.004];
    
    map.fitBounds([sw, ne], { padding: 50, pitch: 45, bearing: -15, duration: 1200 });
    await new Promise(r => setTimeout(r, 1400));
    if (stoppedRef.current) return;

    // Step 2: Fly to start point
    const startBearing = bearing(
      routePoints[0][0], routePoints[0][1],
      routePoints[Math.min(10, routePoints.length - 1)][0],
      routePoints[Math.min(10, routePoints.length - 1)][1]
    );
    currentBearingRef.current = startBearing;

    map.flyTo({
      center: [routePoints[0][1], routePoints[0][0]],
      zoom: 15,
      pitch: 70,
      bearing: startBearing,
      duration: 1800,
      essential: true,
    });
    await new Promise(r => setTimeout(r, 2000));
    if (stoppedRef.current) return;

    setPhase('playing');

    // --- Setup markers and layers ---
    // Glow route layer
    if (!map.getSource('replay-glow')) {
      map.addSource('replay-glow', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      });
      map.addLayer({
        id: 'replay-glow',
        type: 'line',
        source: 'replay-glow',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 10, 'line-opacity': 0.15, 'line-blur': 6 },
      });
    }

    // Progress line
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
        paint: { 'line-color': '#ffffff', 'line-width': 5, 'line-opacity': 0.85 },
      });
    }

    // Pulse marker (large outer glow)
    const pulseEl = document.createElement('div');
    pulseEl.className = 'replay-pulse-marker';
    pulseEl.style.cssText = `
      width: 36px; height: 36px; border-radius: 50%;
      background: radial-gradient(circle, ${lineColor}44 0%, transparent 70%);
      pointer-events: none;
      animation: replay-pulse 2s ease-in-out infinite;
    `;
    pulseMarkerRef.current = new mapboxgl.Marker({ element: pulseEl, anchor: 'center' })
      .setLngLat([routePoints[0][1], routePoints[0][0]])
      .addTo(map);

    // Glow marker
    const glowEl = document.createElement('div');
    glowEl.style.cssText = `
      width: 22px; height: 22px; border-radius: 50%;
      background: radial-gradient(circle, ${lineColor}66 0%, transparent 70%);
      pointer-events: none;
    `;
    glowMarkerRef.current = new mapboxgl.Marker({ element: glowEl, anchor: 'center' })
      .setLngLat([routePoints[0][1], routePoints[0][0]])
      .addTo(map);

    // Main marker
    const el = document.createElement('div');
    el.style.cssText = `
      width: 12px; height: 12px; border-radius: 50%;
      background: ${lineColor}; border: 2.5px solid white;
      box-shadow: 0 0 16px ${lineColor}cc, 0 0 6px ${lineColor}88, 0 2px 8px rgba(0,0,0,0.3);
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
          50% { transform: scale(1.5); opacity: 0.2; }
        }
      `;
      document.head.appendChild(style);
    }

    startTimeRef.current = performance.now();
    const highPoints = highPointsRef.current;

    const animate = (now: number) => {
      if (stoppedRef.current) return;
      const elapsed = now - startTimeRef.current;
      const rawProgress = Math.min(elapsed / replayDuration, 1);

      // Smooth ease: cubic ease-in-out
      let eased: number;
      if (rawProgress < 0.05) {
        // Slow start
        eased = rawProgress * rawProgress * (1 / 0.05) * 0.05;
      } else if (rawProgress > 0.92) {
        // Slow end
        const t = (rawProgress - 0.92) / 0.08;
        const base = 0.92;
        eased = base + (1 - base) * (1 - (1 - t) * (1 - t));
      } else {
        eased = rawProgress;
      }

      // Check if near a high point — slow down
      let speedMultiplier = 1;
      for (const hp of highPoints) {
        const dist = Math.abs(eased - hp);
        if (dist < 0.04) {
          speedMultiplier = 0.5; // slow at peaks
        }
      }

      // Apply speed multiplier by adjusting effective progress
      // (This is approximate — for true speed control we'd need a different approach)
      const currentDist = eased * totalDist;
      const pos = sampleAtDistance(routePoints, cumDist, currentDist);

      const lngLat: [number, number] = [pos.lng, pos.lat];
      markerRef.current?.setLngLat(lngLat);
      glowMarkerRef.current?.setLngLat(lngLat);
      pulseMarkerRef.current?.setLngLat(lngLat);

      // Update progress line
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
        const glowSrc = map.getSource('replay-glow');
        if (glowSrc) {
          glowSrc.setData({
            type: 'Feature', properties: {},
            geometry: { type: 'LineString', coordinates: progressCoords },
          });
        }
      } catch {}

      // Stats
      const distKm = eased * reportedDist;
      const elev = Math.round(eased * reportedElev);
      setStats({ distance: Math.round(distKm * 10) / 10, elevation: elev });

      // Camera: smooth bearing with gentle look-ahead
      const lookAheadFraction = 0.03;
      const lookAheadDist = Math.min(currentDist + totalDist * lookAheadFraction, totalDist);
      const ahead = sampleAtDistance(routePoints, cumDist, lookAheadDist);
      const targetBearing = bearing(pos.lat, pos.lng, ahead.lat, ahead.lng);

      // Very smooth bearing interpolation
      const bearingSmoothing = 0.03; // very gentle
      currentBearingRef.current = smoothBearing(currentBearingRef.current, targetBearing, bearingSmoothing);

      // Check if near a high point for orbit effect
      let orbitOffset = 0;
      for (const hp of highPoints) {
        const dist = Math.abs(eased - hp);
        if (dist < 0.03) {
          // Gentle orbit: add a slow rotation
          const orbitProgress = (eased - (hp - 0.03)) / 0.06;
          orbitOffset = Math.sin(orbitProgress * Math.PI) * 25; // max 25 degree orbit
        }
      }

      map.easeTo({
        center: lngLat,
        bearing: currentBearingRef.current + orbitOffset,
        pitch: 70,
        zoom: 15,
        duration: 200,
        easing: (t: number) => t,
      });

      if (rawProgress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // --- OUTRO ---
        setPhase('outro');
        setStats({ distance: reportedDist, elevation: reportedElev });
        setShowFinish(true);

        // Gentle zoom out to show full route
        setTimeout(() => {
          if (stoppedRef.current) return;
          map.fitBounds([sw, ne], {
            padding: 50,
            pitch: 50,
            bearing: currentBearingRef.current,
            duration: 2000,
          });
        }, 800);

        // Auto-close after delay
        setTimeout(() => {
          if (!stoppedRef.current) stopReplay();
        }, OUTRO_DURATION_MS + 1500);
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

      {/* Intro overlay */}
      {phase === 'intro' && (
        <div className="absolute inset-0 z-[10002] flex items-center justify-center pointer-events-none">
          <div className="bg-background/80 backdrop-blur-md rounded-2xl px-6 py-4 shadow-xl border border-border text-center animate-fade-in">
            <p className="text-sm font-semibold text-foreground animate-pulse">Forbereder replay…</p>
          </div>
        </div>
      )}

      {/* Stats panel */}
      {(phase === 'playing' || phase === 'outro') && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[10001] flex gap-6 rounded-2xl bg-background/85 backdrop-blur-md px-6 py-3 shadow-xl border border-border animate-fade-in">
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
      )}

      {/* Finish overlay */}
      {showFinish && (
        <div className="absolute inset-0 z-[10002] flex items-center justify-center pointer-events-none">
          <div className="bg-background/90 backdrop-blur-md rounded-2xl px-8 py-6 shadow-2xl border border-border text-center animate-scale-in">
            <p className="text-2xl font-display font-bold text-foreground mb-2">🏁</p>
            <p className="text-base font-semibold text-foreground">
              {(totalDistance ?? totalDistRef.current).toFixed(1)} km
            </p>
            {(totalElevation ?? 0) > 0 && (
              <p className="text-sm text-muted-foreground mt-1">{totalElevation} m stigning</p>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default RouteReplay;
