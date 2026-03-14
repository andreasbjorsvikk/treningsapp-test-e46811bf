import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Peak } from '@/data/peaks';
import { PeakCheckin } from '@/services/peakCheckinService';
import { Camera, CameraOff, Compass, Mountain, Navigation, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import peakLowIcon from '@/assets/icons/peak-low.png';
import peakMediumIcon from '@/assets/icons/peak-medium.png';
import peakHighIcon from '@/assets/icons/peak-high.png';
import peakVeryHighIcon from '@/assets/icons/peak-veryhigh.png';

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
const HORIZONTAL_FOV = 60; // degrees

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

function getPeakIcon(heightMoh: number): string {
  if (heightMoh >= 800) return peakVeryHighIcon;
  if (heightMoh >= 500) return peakHighIcon;
  if (heightMoh >= 200) return peakMediumIcon;
  return peakLowIcon;
}

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function angleDiff(a: number, b: number): number {
  let diff = normalizeDeg(a - b);
  if (diff > 180) diff -= 360;
  return diff;
}

const ARView = ({ peaks, checkins, onSelectPeak }: ARViewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [userPos, setUserPos] = useState<UserPosition | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [tilt, setTilt] = useState<number>(0);
  const [permissionsReady, setPermissionsReady] = useState(false);
  const [maxDist, setMaxDist] = useState(MAX_DISTANCE_KM);
  const headingSmoothed = useRef<number | null>(null);

  const checkedPeakIds = useMemo(() => new Set(checkins.map(c => c.peak_id)), [checkins]);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setCameraError('Kunne ikke starte kamera. Sjekk at du har gitt tilgang.');
      console.error('Camera error:', err);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Request orientation permission (iOS)
  const requestOrientationPermission = useCallback(async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const result = await (DeviceOrientationEvent as any).requestPermission();
        if (result !== 'granted') {
          setCameraError('Kompass-tilgang ble nektet. Vennligst gi tilgang i innstillingene.');
          return false;
        }
      } catch {
        setCameraError('Kunne ikke be om kompass-tilgang.');
        return false;
      }
    }
    return true;
  }, []);

  // Init: request permissions and start
  const init = useCallback(async () => {
    const orientationOk = await requestOrientationPermission();
    if (!orientationOk) return;
    await startCamera();
    setPermissionsReady(true);
  }, [requestOrientationPermission, startCamera]);

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

  // Compass listener
  useEffect(() => {
    if (!permissionsReady) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let alpha: number | null = null;

      // iOS uses webkitCompassHeading
      if ((e as any).webkitCompassHeading != null) {
        alpha = (e as any).webkitCompassHeading;
      } else if (e.alpha != null) {
        alpha = (360 - e.alpha) % 360;
      }

      if (alpha != null) {
        // Smooth heading
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

      // Tilt from beta
      if (e.beta != null) {
        setTilt(Math.max(0, Math.min(90, e.beta)));
      }
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, [permissionsReady]);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  // Calculate visible peaks
  const visiblePeaks = useMemo(() => {
    if (!userPos || heading == null) return [];

    const results: VisiblePeak[] = [];
    const containerWidth = containerRef.current?.clientWidth || 400;
    const containerHeight = containerRef.current?.clientHeight || 700;

    for (const peak of peaks) {
      const dist = calcDistance(userPos.lat, userPos.lng, peak.latitude, peak.longitude);
      if (dist > maxDist) continue;

      const bearing = calcBearing(userPos.lat, userPos.lng, peak.latitude, peak.longitude);
      const hDiff = angleDiff(bearing, heading);

      // Only show peaks within FOV
      if (Math.abs(hDiff) > HORIZONTAL_FOV / 2 + 5) continue;

      // Screen X position
      const screenX = containerWidth / 2 + (hDiff / (HORIZONTAL_FOV / 2)) * (containerWidth / 2);

      // Elevation angle
      const userAlt = userPos.altitude || 50;
      const elevDiff = peak.heightMoh - userAlt;
      const elevAngle = toDeg(Math.atan2(elevDiff, dist * 1000));

      // Screen Y: map elevation angle to vertical position
      const verticalFov = HORIZONTAL_FOV * (containerHeight / containerWidth);
      const tiltOffset = tilt - 70;
      const adjustedAngle = elevAngle - tiltOffset;
      const screenY = containerHeight / 2 - (adjustedAngle / (verticalFov / 2)) * (containerHeight / 2);
      const clampedY = Math.max(60, Math.min(containerHeight - 80, screenY));

      results.push({
        peak,
        bearing,
        distance: dist,
        elevAngle,
        screenX,
        screenY: clampedY,
        isTaken: checkedPeakIds.has(peak.id),
      });
    }

    // Sort by distance (far first so close ones render on top)
    results.sort((a, b) => b.distance - a.distance);
    return results;
  }, [userPos, heading, tilt, peaks, maxDist, checkedPeakIds]);

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

  if (!permissionsReady) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-foreground">AR Fjellvisning</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Se fjelltopper rundt deg gjennom kameraet. Krever tilgang til kamera, GPS og kompass.
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

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-black">
      {/* Camera feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        playsInline
        muted
        autoPlay
      />

      {/* Peak labels overlay */}
      {visiblePeaks.map(({ peak, distance, screenX, screenY, isTaken }) => {
        const icon = getPeakIcon(peak.elevation);
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
            {/* Label */}
            <div className={`px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap shadow-lg backdrop-blur-md border ${
              isTaken
                ? 'bg-[hsl(152,60%,42%)]/85 text-white border-[hsl(152,60%,35%)]/50'
                : 'bg-black/60 text-white border-white/20'
            }`}>
              <span>{peak.name}</span>
              <span className="ml-1.5 text-[10px] opacity-80">{peak.heightMoh}m</span>
            </div>
            {/* Distance */}
            <span className="text-[9px] text-white/90 font-medium drop-shadow-lg">
              {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}
            </span>
            {/* Icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-lg ${
              isTaken
                ? 'bg-[hsl(152,60%,42%)] border-[hsl(152,60%,35%)]'
                : 'bg-white/90 border-white/60'
            }`}>
              <img src={icon} alt="" className="w-5 h-5 object-contain" />
            </div>
            {/* Connector line */}
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

      {/* HUD: Peak count */}
      <div className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white text-xs font-medium">
        <Mountain className="w-3.5 h-3.5 inline mr-1" />
        {visiblePeaks.length} topper
      </div>

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

      {/* No compass warning */}
      {heading == null && userPos && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-xl bg-amber-500/80 backdrop-blur-sm text-white text-xs font-medium shadow-lg">
          Venter på kompass...
        </div>
      )}
    </div>
  );
};

export default ARView;
