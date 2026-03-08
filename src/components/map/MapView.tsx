import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Peak } from '@/data/peaks';
import { PeakCheckin } from '@/services/peakCheckinService';
import { useTranslation } from '@/i18n/useTranslation';
import { useSettings } from '@/contexts/SettingsContext';

interface MapViewProps {
  peaks: Peak[];
  checkins: PeakCheckin[];
  onSelectPeak: (peak: Peak) => void;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

const MapView = ({ peaks, checkins, onSelectPeak }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { t } = useTranslation();
  const { settings } = useSettings();
  const [mapLoaded, setMapLoaded] = useState(false);

  const checkedPeakIds = new Set(checkins.map(c => c.peak_id));

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center: [number, number] = peaks.length > 0
      ? [peaks[0].longitude, peaks[0].latitude]
      : [5.7, 59.9];

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: settings.darkMode
        ? 'mapbox://styles/mapbox/outdoors-v12'
        : 'mapbox://styles/mapbox/outdoors-v12',
      center,
      zoom: 11,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    m.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add user location
    m.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    m.on('style.load', () => {
      // Enable 3D terrain
      m.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      // Add sky layer
      m.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });

      setMapLoaded(true);
    });

    map.current = m;

    return () => {
      m.remove();
      map.current = null;
    };
  }, []);

  // Add/update markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    peaks.forEach(peak => {
      const isTaken = checkedPeakIds.has(peak.id);

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'peak-marker';
      el.style.cssText = `
        width: 36px; height: 36px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        background: ${isTaken ? 'hsl(152, 60%, 42%)' : 'hsl(0, 0%, 100%)'};
        border: 2px solid ${isTaken ? 'hsl(152, 60%, 35%)' : 'hsl(220, 13%, 80%)'};
        border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        transition: transform 0.15s;
      `;
      el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isTaken ? 'white' : 'hsl(220, 10%, 46%)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 2 15H2L8 3z"/></svg>`;

      el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.15)'; });
      el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        maxWidth: '220px',
      });
      popup.setHTML(`
        <div style="font-family: 'Space Grotesk', sans-serif; padding: 4px 0;">
          <div style="font-weight: 600; font-size: 14px; margin-bottom: 2px;">${peak.name}</div>
          <div style="font-size: 12px; color: #666; margin-bottom: 6px;">${peak.heightMoh} moh · ${peak.area}</div>
          <button id="peak-btn-${peak.id}" style="
            font-size: 12px; font-weight: 500; padding: 6px 12px;
            background: hsl(0, 0%, 15%); color: white; border: none;
            border-radius: 6px; cursor: pointer; width: 100%;
          ">${t('map.viewPeak')}</button>
        </div>
      `);

      popup.on('open', () => {
        setTimeout(() => {
          const btn = document.getElementById(`peak-btn-${peak.id}`);
          if (btn) {
            btn.addEventListener('click', () => {
              popup.remove();
              onSelectPeak(peak);
            });
          }
        }, 10);
      });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([peak.longitude, peak.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [peaks, checkins, mapLoaded, t]);

  return (
    <div ref={mapContainer} className="w-full h-full" />
  );
};

export default MapView;
