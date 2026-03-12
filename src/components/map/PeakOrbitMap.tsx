import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    const init = async () => {
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
      });

      mapRef.current = map;

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
            map.setBearing(bearing % 360);
            animRef.current = requestAnimationFrame(rotate);
          };
          animRef.current = requestAnimationFrame(rotate);
        });
      });
    };

    init();

    return () => {
      cancelled = true;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, heightMoh]);

  return (
    <div
      ref={containerRef}
      className={className || 'w-full h-[180px] rounded-xl overflow-hidden'}
    />
  );
};

export default PeakOrbitMap;
