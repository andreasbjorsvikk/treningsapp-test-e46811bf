import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    if (!containerRef.current || failed) return;

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
          pitch: 65,
          bearing: 0,
          interactive: false,
          attributionControl: false,
          antialias: false,
          failIfMajorPerformanceCaveat: false,
          preserveDrawingBuffer: false,
          maxTileCacheSize: 20,
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

          // Enhanced 3D terrain with stronger exaggeration for dramatic peaks
          addEnhancedTerrain(map, { exaggeration: 1.6 });

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
  }, [latitude, longitude, heightMoh, failed]);

  if (failed) {
    return (
      <div className={`${className || 'w-full h-[180px] rounded-xl overflow-hidden'} bg-muted flex items-center justify-center`}>
        <span className="text-xs text-muted-foreground">3D-visning utilgjengelig</span>
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
