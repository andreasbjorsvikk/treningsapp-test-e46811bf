import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Peak } from '@/data/peaks';
import { PeakCheckin } from '@/services/peakCheckinService';
import { Camera, Compass, Mountain, Navigation, Map as MapIcon, Eye, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPeakIcon } from '@/utils/peakIcons';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface ARViewProps {
  peaks: Peak[];
  checkins: PeakCheckin[];
  onSelectPeak?: (peak: Peak) => void;
}

interface UserPosition {
  lat: number;
  lng: number;
  altitude: number | null;
}

interface VisiblePeak {
  peak: Peak;
  bearing: number;
  distance: number;
  elevAngle: number;
  screenX: number;
  screenY: number;
  isTaken: boolean;
}

const MAX_DISTANCE_KM = 30;
const HORIZONTAL_FOV = 60;
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

mapboxgl.accessToken = MAPBOX_TOKEN;

function toRad(deg: number) { return deg * Math.PI / 180; }
function toDeg(rad: number) { return rad * 180 / Math.PI; }

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function angleDiff(a: number, b: number): number {
  let diff = normalizeDeg(a - b);
  if (diff > 180) diff -= 360;
  return diff;
}

type ARMode = 'camera' | '3d';

const ARView = ({ peaks, checkins, onSelectPeak }: ARViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<UserPosition | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [tilt, setTilt] = useState<number>(0);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [compassEnabled, setCompassEnabled] = useState(false);
  const [maxDist, setMaxDist] = useState(MAX_DISTANCE_KM);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [mode, setMode] = useState<ARMode>('camera');
  const [mapReady, setMapReady] = useState(false);
  const [cameraZoom, setCameraZoom] = useState(1);
  const headingSmoothed = useRef<number | null>(null);
  const lastMapUpdate = useRef(0);
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

  const checkedPeakIds = useMemo(() => new Set(checkins.map(c => c.peak_id)), [checkins]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const requestCompassPermission = useCallback(async () => {
    const OrientationEvent = (window as any).DeviceOrientationEvent;

    if (!OrientationEvent) {
      setCompassEnabled(false);
      return false;
    }

    if (typeof OrientationEvent.requestPermission === 'function') {
      try {
        const result = await OrientationEvent.requestPermission();
        const granted = result === 'granted';
        setCompassEnabled(granted);
        return granted;
      } catch (err) {
        console.warn('Compass permission request failed', err);
        setCompassEnabled(false);
        return false;
      }
    }

    // Android / browsers without explicit permission API
    setCompassEnabled(true);
    return true;
  }, []);

  // Init: getUserMedia directly in user gesture + attempt compass permission
  const init = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setPermissionsReady(true);
      // Try once here (works on many devices). If denied/missed, user can retry from button.
      await requestCompassPermission();
    } catch (err: any) {
      setCameraError('Kunne ikke starte kamera. Sjekk at du har gitt tilgang.');
      console.error('Camera error:', err);
    }
  }, [requestCompassPermission]);

  // Attach stream to video element when it mounts (after permissionsReady becomes true)
  useEffect(() => {
    if (!permissionsReady || !streamRef.current) return;
    const attachStream = () => {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(err => console.error('Video play error:', err));
      }
    };
    // Small delay to ensure DOM is ready
    requestAnimationFrame(attachStream);
  }, [permissionsReady]);

  // Pinch-to-zoom for camera mode
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.hypot(dx, dy);
      pinchStartZoom.current = cameraZoom;
    }
  }, [cameraZoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current != null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / pinchStartDist.current;
      setCameraZoom(Math.max(1, Math.min(5, pinchStartZoom.current * scale)));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchStartDist.current = null;
  }, []);

  // GPS watcher
  useEffect(() => {
    if (!permissionsReady) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          altitude: pos.coords.altitude
        });
      },
      (err) => console.error('GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [permissionsReady]);

  // Compass listener (added only after permission is granted)
  useEffect(() => {
    if (!permissionsReady || !compassEnabled) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let alpha: number | null = null;

      if ((e as any).webkitCompassHeading != null) {
        alpha = Number((e as any).webkitCompassHeading);
      } else if (e.alpha != null) {
        alpha = (360 - e.alpha) % 360;
      }

      if (alpha != null && Number.isFinite(alpha)) {
        if (headingSmoothed.current == null) {
          headingSmoothed.current = alpha;
        } else {
          let diff = alpha - headingSmoothed.current;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          headingSmoothed.current = normalizeDeg(headingSmoothed.current + diff * 0.15);
        }
        setHeading(headingSmoothed.current);
      }

      if (e.beta != null) {
        setTilt(Math.max(0, Math.min(90, e.beta)));
      }
    };

    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation', handleOrientation as EventListener, true);

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation', handleOrientation as EventListener, true);
    };
  }, [permissionsReady, compassEnabled]);

  // Cleanup on unmount
  useEffect(() => () => {
    stopCamera();
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
  }, [stopCamera]);

  // ── 3D Map initialization ──
  useEffect(() => {
    if (mode !== '3d' || !permissionsReady || !mapContainerRef.current) return;
    if (mapRef.current) return; // already init

    const initialCenter = userPos || { lat: 60.0, lng: 5.67 };

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: [initialCenter.lng, initialCenter.lat],
      zoom: 14,
      pitch: 75,
      bearing: heading || 0,
      antialias: false,
      interactive: true,
      dragPan: false,
      dragRotate: false,
      scrollZoom: true,
      touchZoomRotate: true,
      doubleClickZoom: true,
      touchPitch: false,
    });

    map.on('style.load', () => {
      // 3D terrain
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Sky
      map.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 30.0],
          'sky-atmosphere-sun-intensity': 5,
        },
      });

      // Add peak markers
      addPeakMarkers(map);
      setMapReady(true);
    });

    mapRef.current = map;

    return () => {
      // Don't remove here – cleanup on unmount handles it
    };
  }, [mode, permissionsReady]);

  // Add peak markers to 3D map
  const addPeakMarkers = useCallback((map: mapboxgl.Map) => {
    // Clear old
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const userLat = userPos?.lat || 60.0;
    const userLng = userPos?.lng || 5.67;

    peaks.forEach(peak => {
      const dist = calcDistance(userLat, userLng, peak.latitude, peak.longitude);
      if (dist > maxDist) return;

      const isTaken = checkedPeakIds.has(peak.id);
      const icon = getPeakIcon(peak.heightMoh, peak.id);

      const el = document.createElement('div');
      el.style.cssText = `
        display: flex; flex-direction: column; align-items: center; gap: 2px; cursor: pointer;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));
      `;
      el.innerHTML = `
        <div style="
          padding: 2px 6px; border-radius: 6px; font-size: 10px; font-weight: 700;
          white-space: nowrap;
          background: ${isTaken ? 'hsla(152,60%,42%,0.9)' : 'rgba(0,0,0,0.7)'};
          color: white; border: 1px solid ${isTaken ? 'hsla(152,60%,35%,0.6)' : 'rgba(255,255,255,0.25)'};
          backdrop-filter: blur(4px);
        ">
          ${peak.name} <span style="opacity:0.7;font-size:9px">${peak.heightMoh}m</span>
        </div>
        <div style="
          width: 32px; height: 32px;
          display: flex; align-items: flex-end; justify-content: center;
          background: ${isTaken ? 'hsl(152,60%,42%)' : 'rgba(255,255,255,0.9)'};
          clip-path: polygon(50% 0%, 59% 0.3%, 67% 1.2%, 75% 3%, 82% 6%, 88% 10%, 93% 15%, 96% 22%, 98.5% 29%, 99.7% 37%, 100% 45%, 100% 75%, 0% 75%, 0% 45%, 0.3% 37%, 1.5% 29%, 4% 22%, 7% 15%, 12% 10%, 18% 6%, 25% 3%, 33% 1.2%, 41% 0.3%);
        ">
          <img src="${icon}" style="width:28px;height:28px;object-fit:cover;object-position:center bottom" />
        </div>
      `;

      el.addEventListener('click', () => onSelectPeak?.(peak));

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([peak.longitude, peak.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [peaks, userPos, maxDist, checkedPeakIds, onSelectPeak]);

  // ── Sync 3D map camera with sensors ──
  useEffect(() => {
    if (mode !== '3d' || !mapRef.current || !mapReady || !userPos || heading == null) return;

    const now = Date.now();
    if (now - lastMapUpdate.current < 50) return; // throttle to ~20fps
    lastMapUpdate.current = now;

    const map = mapRef.current;

    // Map pitch from device tilt: holding upright (tilt~90) => high pitch, tilted down (tilt~45) => lower pitch
    const pitch = Math.min(85, Math.max(30, tilt * 0.95));

    map.jumpTo({
      center: [userPos.lng, userPos.lat],
      bearing: heading,
      pitch,
    });
  }, [mode, mapReady, userPos, heading, tilt]);

  // Re-add markers when maxDist changes
  useEffect(() => {
    if (mode === '3d' && mapRef.current && mapReady) {
      addPeakMarkers(mapRef.current);
    }
  }, [mode, mapReady, maxDist, addPeakMarkers]);

  // Handle mode switch
  const toggleMode = useCallback(() => {
    setMode(prev => {
      const next = prev === 'camera' ? '3d' : 'camera';
      if (next === '3d') {
        // Pause camera to save battery
        if (videoRef.current) {
          videoRef.current.pause();
        }
      } else {
        // Resume camera
        if (videoRef.current && streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
          videoRef.current.play().catch(() => {});
        }
        // Remove 3D map
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          setMapReady(false);
        }
      }
      return next;
    });
  }, []);

  // Calculate visible peaks (for camera mode)
  const visiblePeaks = useMemo(() => {
    if (!userPos || heading == null || mode !== 'camera') return [];

    const results: VisiblePeak[] = [];
    const containerWidth = containerRef.current?.clientWidth || 400;
    const containerHeight = containerRef.current?.clientHeight || 700;

    for (const peak of peaks) {
      const dist = calcDistance(userPos.lat, userPos.lng, peak.latitude, peak.longitude);
      if (dist > maxDist) continue;

      const bearing = calcBearing(userPos.lat, userPos.lng, peak.latitude, peak.longitude);
      const hDiff = angleDiff(bearing, heading);
      if (Math.abs(hDiff) > HORIZONTAL_FOV / 2 + 5) continue;

      const screenX = containerWidth / 2 + (hDiff / (HORIZONTAL_FOV / 2)) * (containerWidth / 2);
      const userAlt = userPos.altitude || 50;
      const elevDiff = peak.heightMoh - userAlt;
      const elevAngle = toDeg(Math.atan2(elevDiff, dist * 1000));
      const verticalFov = HORIZONTAL_FOV * (containerHeight / containerWidth);
      const tiltOffset = tilt - 70;
      const adjustedAngle = elevAngle - tiltOffset;
      const screenY = containerHeight / 2 - (adjustedAngle / (verticalFov / 2)) * (containerHeight / 2);
      const clampedY = Math.max(60, Math.min(containerHeight - 80, screenY));

      results.push({ peak, bearing, distance: dist, elevAngle, screenX, screenY: clampedY, isTaken: checkedPeakIds.has(peak.id) });
    }

    results.sort((a, b) => b.distance - a.distance);
    return results;
  }, [userPos, heading, tilt, peaks, maxDist, checkedPeakIds, mode]);

  // Compass direction label
  const compassDir = heading != null ? (
    heading >= 337.5 || heading < 22.5 ? 'N' :
    heading < 67.5 ? 'NØ' :
    heading < 112.5 ? 'Ø' :
    heading < 157.5 ? 'SØ' :
    heading < 202.5 ? 'S' :
    heading < 247.5 ? 'SV' :
    heading < 292.5 ? 'V' : 'NV'
  ) : '';

  // ── Pre-permissions screen ──
  if (!permissionsReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground">AR Fjellvisning</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Se fjelltopper rundt deg gjennom kameraet eller som 3D-terreng. Krever tilgang til kamera, GPS og kompass.
          </p>
        </div>
        {cameraError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">{cameraError}</p>
        )}
        <Button onClick={init} size="lg" className="gap-2">
          <Camera className="w-5 h-5" />
          Start AR-visning
        </Button>
        <p className="text-[11px] text-muted-foreground">Fungerer best utendørs på mobil.</p>
      </div>
    );
  }

  // ── Main AR view ──
  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black"
      onTouchStart={mode === 'camera' ? handleTouchStart : undefined}
      onTouchMove={mode === 'camera' ? handleTouchMove : undefined}
      onTouchEnd={mode === 'camera' ? handleTouchEnd : undefined}
    >
      {/* Camera feed (visible in camera mode) */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${mode === 'camera' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ transform: `scale(${cameraZoom})`, transformOrigin: 'center center' }}
        playsInline
        muted
        autoPlay
      />

      {/* 3D Map container (visible in 3d mode) */}
      <div
        ref={mapContainerRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${mode === '3d' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Peak labels overlay (camera mode only) */}
      {mode === 'camera' && visiblePeaks.map(({ peak, distance, screenX, screenY, isTaken }) => {
        const icon = getPeakIcon(peak.heightMoh, peak.id);
        const opacity = Math.max(0.5, 1 - distance / maxDist);
        const scale = Math.max(0.6, 1 - (distance / maxDist) * 0.4);

        return (
          <button
            key={peak.id}
            className="absolute flex flex-col items-center gap-0.5 transition-transform duration-200 active:scale-110"
            style={{
              left: `${screenX}px`,
              top: `${screenY}px`,
              transform: `translate(-50%, -100%) scale(${scale})`,
              opacity,
              zIndex: Math.round(1000 - distance),
            }}
            onClick={() => onSelectPeak?.(peak)}
          >
            <div className={`px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shadow-lg backdrop-blur-md border ${
              isTaken
                ? 'bg-[hsl(152,60%,42%)]/85 text-white border-[hsl(152,60%,35%)]/50'
                : 'bg-black/60 text-white border-white/20'
            }`}>
              <span>{peak.name}</span>
              <span className="ml-1.5 text-[10px] opacity-80">{peak.heightMoh}m</span>
            </div>
            <span className="text-[9px] text-white/90 font-medium drop-shadow-lg">
              {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
            </span>
            <div className={`w-8 h-8 rounded-full flex items-end justify-center border-2 shadow-lg [clip-path:inset(0_0_25%_0)] overflow-hidden ${
              isTaken
                ? 'bg-[hsl(152,60%,42%)] border-[hsl(152,60%,35%)]'
                : 'bg-white/90 border-white/60'
            }`}>
              <img src={icon} alt="" className="w-7 h-7 object-contain object-bottom" />
            </div>
            <div className={`w-px h-4 ${isTaken ? 'bg-[hsl(152,60%,42%)]/50' : 'bg-white/30'}`} />
          </button>
        );
      })}

      {/* HUD: Compass */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/15 shadow-lg">
        <Compass className="w-4 h-4 text-white/80" style={{ transform: `rotate(${-(heading || 0)}deg)` }} />
        <span className="text-white text-sm font-bold">{compassDir}</span>
        <span className="text-white/60 text-xs">{heading != null ? `${Math.round(heading)}°` : '—'}</span>
      </div>

      {/* Zoom indicator (camera mode) */}
      {mode === 'camera' && cameraZoom > 1.05 && (
        <button
          onClick={() => setCameraZoom(1)}
          className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white text-xs font-medium"
        >
          {cameraZoom.toFixed(1)}x ✕
        </button>
      )}

      <div className="absolute top-4 right-4 z-30 flex gap-2">
        {/* Mode toggle */}
        <button
          onClick={toggleMode}
          className="px-3 py-1.5 rounded-full bg-primary/70 backdrop-blur-md border border-white/15 text-white text-xs font-medium flex items-center gap-1"
        >
          {mode === 'camera' ? (
            <><Eye className="w-3.5 h-3.5" /> 3D</>
          ) : (
            <><Video className="w-3.5 h-3.5" /> Kamera</>
          )}
        </button>
        {/* Mini-map toggle (camera mode) */}
        {mode === 'camera' && (
          <button
            onClick={() => setShowMiniMap(v => !v)}
            className={`px-3 py-1.5 rounded-full backdrop-blur-md border border-white/15 text-white text-xs font-medium transition-colors ${showMiniMap ? 'bg-primary/60' : 'bg-black/50'}`}
          >
            <MapIcon className="w-3.5 h-3.5 inline mr-1" />
            Kart
          </button>
        )}
        {/* Peak count */}
        <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white text-xs font-medium">
          <Mountain className="w-3.5 h-3.5 inline mr-1" />
          {mode === 'camera' ? visiblePeaks.length : peaks.filter(p => userPos ? calcDistance(userPos.lat, userPos.lng, p.latitude, p.longitude) <= maxDist : false).length} topper
        </div>
      </div>

      {/* Mini-map (camera mode only) */}
      {mode === 'camera' && showMiniMap && userPos && (
        <div className="absolute bottom-24 right-3 z-30 w-36 h-36 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl">
          {(() => {
            const zoom = maxDist > 20 ? 9 : maxDist > 10 ? 10 : 11;
            const nearPeaks = peaks
              .map(p => ({ ...p, dist: calcDistance(userPos.lat, userPos.lng, p.latitude, p.longitude) }))
              .filter(p => p.dist <= maxDist)
              .sort((a, b) => a.dist - b.dist)
              .slice(0, 15);
            const markers = nearPeaks.map(p => {
              const color = checkedPeakIds.has(p.id) ? '2dbe6c' : 'ffffff';
              return `pin-s+${color}(${p.longitude},${p.latitude})`;
            }).join(',');
            const userMarker = `pin-s-circle+4a90d9(${userPos.lng},${userPos.lat})`;
            const allMarkers = markers ? `${userMarker},${markers}` : userMarker;
            const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/${allMarkers}/${userPos.lng},${userPos.lat},${zoom},0/${288}x${288}@2x?access_token=${MAPBOX_TOKEN}`;
            return <img src={mapUrl} alt="Minikart" className="w-full h-full object-cover" />;
          })()}
          <div
            className="absolute top-1/2 left-1/2 w-0 h-0 -translate-x-1/2 -translate-y-1/2 z-10"
            style={{ transform: `translate(-50%, -50%) rotate(${heading || 0}deg)` }}
          >
            <div className="w-0.5 h-12 bg-primary/60 mx-auto origin-bottom" style={{ marginTop: '-48px' }} />
            <div className="w-2 h-2 rounded-full bg-primary border border-white mx-auto -mt-0.5" />
          </div>
        </div>
      )}

      {/* HUD: Distance filter */}
      <div className="absolute bottom-6 left-4 right-4 z-30">
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-black/50 backdrop-blur-md border border-white/15">
          <Navigation className="w-4 h-4 text-white/70 shrink-0" />
          <input
            type="range"
            min={2}
            max={50}
            value={maxDist}
            onChange={e => setMaxDist(Number(e.target.value))}
            className="flex-1 h-1 accent-primary"
          />
          <span className="text-white text-xs font-bold w-10 text-right">{maxDist}km</span>
        </div>
      </div>

      {/* No GPS warning */}
      {!userPos && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-amber-500/80 backdrop-blur-sm text-white text-xs font-medium shadow-lg">
          Venter på GPS-posisjon...
        </div>
      )}

      {/* Compass state */}
      {!compassEnabled && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/80 backdrop-blur-sm text-white text-xs font-medium shadow-lg">
          <span>Kompass ikke aktivert</span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 px-2 text-[11px]"
            onClick={requestCompassPermission}
          >
            Aktiver kompass
          </Button>
        </div>
      )}

      {/* Waiting for compass data */}
      {compassEnabled && heading == null && userPos && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-amber-500/80 backdrop-blur-sm text-white text-xs font-medium shadow-lg">
          Venter på kompass...
        </div>
      )}
    </div>
  );
};

export default ARView;
