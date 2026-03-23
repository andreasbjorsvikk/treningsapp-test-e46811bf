import { useEffect, useMemo, useRef, useState } from 'react';
import { addEnhancedTerrain } from '@/utils/mapTerrain';

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

interface PeakOrbitMapProps {
  latitude: number;
  longitude: number;
  heightMoh: number;
  className?: string;
}

const PeakOrbitMap = ({ latitude, longitude, heightMoh, className }: PeakOrbitMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const animRef = useRef<number>(0);
  const [failed, setFailed] = useState(false);
  // Use static preview on iOS / low-memory mobile devices to prevent WebGL crashes
  // when main MapView is already consuming a WebGL context
  const prefersStaticPreview = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isMobile = window.matchMedia('(max-width: 768px)').matches || window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const lowMemory = ((navigator as any).deviceMemory ?? 8) <= 4;
    return isIOS || (isMobile && lowMemory);
  }, []);

  const staticUrl = useMemo(() => {
    const marker = `pin-s+16a34a(${longitude},${latitude})`;
    return `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${marker}/${longitude},${latitude},13.4,0,52/900x420@2x?access_token=${MAPBOX_TOKEN}`;
  }, [latitude, longitude]);

  useEffect(() => {
    if (!containerRef.current || failed || prefersStaticPreview) return;

    let cancelled = false;

    const init = async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        await import('mapbox-gl/dist/mapbox-gl.css');
        (mapboxgl as any).accessToken = MAPBOX_TOKEN;

        if (cancelled || !containerRef.current) return;

        // Zoom based on elevation – higher peaks get wider view
        const zoom = heightMoh > 1500 ? 13.2 : heightMoh > 800 ? 13.6 : 14;

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/satellite-streets-v12',
          center: [longitude, latitude],
          zoom,
          pitch: 58,
          bearing: 0,
          interactive: false,
          attributionControl: false,
          antialias: false,
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false,
          maxTileCacheSize: 8,
        });

        mapRef.current = map;

        map.on('error', (e: any) => {
          console.warn('PeakOrbitMap error:', e.error?.message || e);
          // If WebGL context lost, gracefully fail
          if (e.error?.message?.includes('context') || e.error?.message?.includes('WebGL')) {
            cancelled = true;
            setFailed(true);
          }
        });

        map.on('style.load', () => {
          if (cancelled) return;

          addEnhancedTerrain(map, { exaggeration: 1.15, lightweight: true });

          // Start slow orbit once idle
          map.once('idle', () => {
            if (cancelled) return;
            let bearing = 0;
            const rotate = () => {
              if (cancelled) return;
              bearing += 0.08; // slow rotation ~29° per minute
              try {
                map.setBearing(bearing % 360);
              } catch {
                cancelled = true;
                return;
              }
              animRef.current = requestAnimationFrame(rotate);
            };
            animRef.current = requestAnimationFrame(rotate);
          });
        });
      } catch (err) {
        console.warn('PeakOrbitMap failed to init:', err);
        setFailed(true);
      }
    };

    // Delay init slightly to let main map settle
    const timer = setTimeout(init, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch {}
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, heightMoh, failed, prefersStaticPreview]);

  if (failed || prefersStaticPreview) {
    return (
      <div className={`${className || 'w-full h-[180px] rounded-xl overflow-hidden'} bg-muted`}>
        <img
          src={staticUrl}
          alt="Kartforhåndsvisning av fjelltoppen"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className || 'w-full h-[180px] rounded-xl overflow-hidden'}
    />
  );
};

export default PeakOrbitMap;
