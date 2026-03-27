/**
 * Offline map service — manages downloaded map regions.
 *
 * Phase 1: Scaffold only. Actual tile download requires native Mapbox SDK
 * OfflineManager via Capacitor (Phase 2/3).
 *
 * This service tracks which regions the user has "selected" for offline use.
 */
import { get, set } from 'idb-keyval';
import { isNativePlatform } from '@/utils/capacitor';
import type { OfflineRegion } from '@/utils/offlineRegions';

const SAVED_REGIONS_KEY = 'treningsapp_offline_map_regions';

export interface SavedRegion {
  regionId: string;
  downloadedAt: string;
  /** Estimated size at download time */
  sizeMB: number;
}

export const offlineMapService = {
  /** Get list of downloaded regions. */
  async getSavedRegions(): Promise<SavedRegion[]> {
    return (await get<SavedRegion[]>(SAVED_REGIONS_KEY)) ?? [];
  },

  /** "Download" a region for offline use. */
  async downloadRegion(region: OfflineRegion): Promise<boolean> {
    if (!isNativePlatform()) {
      console.debug('[offlineMap] downloadRegion is native-only. Saving preference.');
    }

    // TODO: Native implementation
    // const { MapboxOffline } = await import('some-capacitor-mapbox-plugin');
    // await MapboxOffline.downloadRegion({
    //   name: region.id,
    //   bounds: region.bounds,
    //   minZoom: 0,
    //   maxZoom: 14,
    // });

    const saved = await this.getSavedRegions();
    if (saved.some((s) => s.regionId === region.id)) return true;

    saved.push({
      regionId: region.id,
      downloadedAt: new Date().toISOString(),
      sizeMB: region.estimatedSizeMB,
    });
    await set(SAVED_REGIONS_KEY, saved);
    return true;
  },

  /** Remove a downloaded region. */
  async removeRegion(regionId: string): Promise<void> {
    // TODO: Native implementation — remove tiles from disk
    const saved = await this.getSavedRegions();
    await set(SAVED_REGIONS_KEY, saved.filter((s) => s.regionId !== regionId));
  },

  /** Check if a region is available offline. */
  async isRegionAvailable(regionId: string): Promise<boolean> {
    const saved = await this.getSavedRegions();
    return saved.some((s) => s.regionId === regionId);
  },
};
