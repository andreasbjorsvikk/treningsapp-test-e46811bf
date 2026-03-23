/**
 * Shared terrain enhancement utilities for Mapbox maps.
 * Adds 3D terrain, hillshade, sky, and directional lighting.
 */

export function addEnhancedTerrain(map: any, options?: { exaggeration?: number; lightweight?: boolean }) {
  const exaggeration = options?.exaggeration ?? 1.4;
  const lightweight = options?.lightweight ?? false;

  try {
    // DEM source for 3D terrain
    if (!map.getSource('mapbox-dem')) {
      map.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }
    map.setTerrain({ source: 'mapbox-dem', exaggeration });

    if (!lightweight) {
      // Hillshade layer for depth on ridges and valleys
      if (!map.getSource('hillshade-dem')) {
        map.addSource('hillshade-dem', {
          type: 'raster-dem',
          url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
          tileSize: 512,
          maxzoom: 14,
        });
      }
      if (!map.getLayer('hillshade')) {
        map.addLayer({
          id: 'hillshade',
          type: 'hillshade',
          source: 'hillshade-dem',
          paint: {
            'hillshade-illumination-direction': 315,
            'hillshade-illumination-anchor': 'viewport',
            'hillshade-exaggeration': 0.5,
            'hillshade-shadow-color': 'rgba(0, 0, 0, 0.25)',
            'hillshade-highlight-color': 'rgba(255, 255, 230, 0.4)',
            'hillshade-accent-color': 'rgba(80, 80, 80, 0.15)',
          },
        }, map.getLayer('route-line') ? 'route-line' : undefined);
      }

      // Atmospheric sky
      if (!map.getLayer('sky')) {
        map.addLayer({
          id: 'sky',
          type: 'sky',
          paint: {
            'sky-type': 'atmosphere',
            'sky-atmosphere-sun': [315, 30],
            'sky-atmosphere-sun-intensity': 12,
          },
        });
      }
    }

    // Directional sunlight – warm golden hour feel with visible shadows
    map.setLight({
      anchor: 'viewport',
      position: [1.5, 315, 35],
      color: '#fff4e0',
      intensity: lightweight ? 0.35 : 0.5,
    });
  } catch (e) {
    console.warn('Failed to add enhanced terrain:', e);
  }
}
