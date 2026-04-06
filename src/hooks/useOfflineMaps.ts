import { useState, useEffect, useCallback } from 'react';
import { offlineMapService, SavedRegion } from '@/services/offlineMapService';
import { norwegianRegions, OfflineRegion } from '@/utils/offlineRegions';

export interface RegionWithStatus extends OfflineRegion {
  isDownloaded: boolean;
  downloadedAt?: string;
  isDownloading: boolean;
}

export function useOfflineMaps() {
  const [savedRegions, setSavedRegions] = useState<SavedRegion[]>([]);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await offlineMapService.getSavedRegions();
    setSavedRegions(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const regions: RegionWithStatus[] = norwegianRegions.map(r => {
    const saved = savedRegions.find(s => s.regionId === r.id);
    return {
      ...r,
      isDownloaded: !!saved,
      downloadedAt: saved?.downloadedAt,
      isDownloading: downloadingIds.has(r.id),
    };
  });

  const totalDownloadedMB = savedRegions.reduce((sum, s) => sum + s.sizeMB, 0);

  const download = useCallback(async (region: OfflineRegion) => {
    setDownloadingIds(prev => new Set(prev).add(region.id));
    try {
      await offlineMapService.downloadRegion(region);
      await load();
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev);
        next.delete(region.id);
        return next;
      });
    }
  }, [load]);

  const remove = useCallback(async (regionId: string) => {
    await offlineMapService.removeRegion(regionId);
    await load();
  }, [load]);

  return { regions, totalDownloadedMB, download, remove, loading };
}
