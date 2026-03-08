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
  const [is3D, setIs3D] = useState(true);
  const [isSatellite, setIsSatellite] = useState(false);

  const checkedPeakIds = new Set(checkins.map(c => c.peak_id));

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center: [number, number] = peaks.length > 0
      ? [peaks[0].longitude, peaks[0].latitude]
      : [5.7, 59.9];

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center,
      zoom: 11,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    m.addControl(new mapboxgl.NavigationControl(), 'top-right');

    m.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true,
      }),
      'top-right'
    );

    m.on('style.load', () => {
      m.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
      m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

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

  // Toggle 2D/3D
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;

    if (is3D) {
      m.easeTo({ pitch: 60, bearing: -20, duration: 600 });
      if (!m.getTerrain()) {
        if (!m.getSource('mapbox-dem')) {
          m.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          });
        }
        m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      }
    } else {
      m.easeTo({ pitch: 0, bearing: 0, duration: 600 });
      m.setTerrain(null);
    }
  }, [is3D, mapLoaded]);

  // Toggle satellite/outdoors
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    const m = map.current;
    const style = isSatellite
      ? 'mapbox://styles/mapbox/satellite-streets-v12'
      : 'mapbox://styles/mapbox/outdoors-v12';

    m.setStyle(style);

    m.once('style.load', () => {
      // Re-add terrain after style change
      if (!m.getSource('mapbox-dem')) {
        m.addSource('mapbox-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
      }
      if (is3D) {
        m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });
      }
      if (!m.getLayer('sky')) {
        m.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [0.0, 90.0],
            'sky-atmosphere-sun-intensity': 15,
          },
        });
      }
      // Re-trigger marker rendering
      setMapLoaded(prev => !prev);
      setTimeout(() => setMapLoaded(true), 50);
    });
  }, [isSatellite]);

  // Add/update markers
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    peaks.forEach(peak => {
      const isTaken = checkedPeakIds.has(peak.id);

      const el = document.createElement('div');
      el.style.cssText = `
        width: 36px; height: 36px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        background: ${isTaken ? 'hsl(152, 60%, 42%)' : 'hsl(0, 0%, 100%)'};
        border: 2px solid ${isTaken ? 'hsl(152, 60%, 35%)' : 'hsl(220, 13%, 80%)'};
        border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      `;
      el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${isTaken ? 'white' : 'hsl(220, 10%, 46%)'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 2 15H2L8 3z"/></svg>`;

      const isDark = document.documentElement.classList.contains('dark');
      const popupBg = isDark ? 'hsl(222, 25%, 12%)' : 'hsl(0, 0%, 100%)';
      const popupBorder = isDark ? 'hsl(222, 20%, 20%)' : 'hsl(220, 13%, 90%)';
      const popupText = isDark ? 'hsl(210, 20%, 95%)' : 'hsl(220, 25%, 10%)';
      const popupMuted = isDark ? 'hsl(220, 12%, 62%)' : 'hsl(220, 10%, 46%)';
      const btnBg = isDark ? 'hsl(152, 55%, 38%)' : 'hsl(0, 0%, 15%)';
      const statusColor = isTaken ? 'hsl(152, 60%, 42%)' : popupMuted;
      const statusText = isTaken ? '✓ Besøkt' : `${peak.heightMoh} moh`;

      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        maxWidth: '240px',
        className: 'peak-popup',
      });
      popup.setHTML(`
        <div style="font-family: 'Space Grotesk', sans-serif; padding: 8px 4px; background: ${popupBg}; border-radius: 12px;">
          <div style="font-weight: 700; font-size: 15px; color: ${popupText}; margin-bottom: 4px; letter-spacing: -0.01em;">${peak.name}</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
            <span style="font-size: 11px; font-weight: 600; color: ${statusColor}; background: ${isDark ? 'hsl(222, 20%, 18%)' : 'hsl(220, 16%, 95%)'}; padding: 2px 8px; border-radius: 100px;">${statusText}</span>
            <span style="font-size: 11px; color: ${popupMuted};">${peak.area}</span>
          </div>
          <button id="peak-btn-${peak.id}" style="
            font-size: 12px; font-weight: 600; padding: 8px 14px;
            background: ${btnBg}; color: white; border: none;
            border-radius: 10px; cursor: pointer; width: 100%;
            transition: opacity 0.15s;
            letter-spacing: 0.01em;
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

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([peak.longitude, peak.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });
  }, [peaks, checkins, mapLoaded, t]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      {/* Top-left: 2D/3D toggle */}
      <button
        onClick={() => setIs3D(prev => !prev)}
        className="absolute top-2 left-2 z-10 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md border border-border bg-background text-foreground"
      >
        {is3D ? '2D' : '3D'}
      </button>
      {/* Top-left: Map style toggle */}
      <button
        onClick={() => setIsSatellite(prev => !prev)}
        className="absolute top-12 left-2 z-10 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md border border-border bg-background text-foreground"
      >
        {isSatellite ? '🗺️ Kart' : '🛰️ Satelitt'}
      </button>
    </div>
  );
};

export default MapView;
