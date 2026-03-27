/**
 * Offline map region definitions.
 *
 * These bounding boxes define downloadable map regions for native offline maps.
 * In Phase 1, this is data-only scaffolding — actual tile download happens in
 * native via Mapbox SDK OfflineManager (Phase 2/3).
 */

export interface OfflineRegion {
  id: string;
  name: string;
  /** [south, west, north, east] */
  bounds: [number, number, number, number];
  /** Approximate size in MB at zoom 0-14 */
  estimatedSizeMB: number;
}

export const norwegianRegions: OfflineRegion[] = [
  { id: 'oslo', name: 'Oslo', bounds: [59.8, 10.5, 60.0, 10.95], estimatedSizeMB: 25 },
  { id: 'viken', name: 'Viken', bounds: [58.9, 9.5, 60.5, 12.1], estimatedSizeMB: 120 },
  { id: 'vestland', name: 'Vestland', bounds: [59.5, 4.5, 61.5, 7.5], estimatedSizeMB: 150 },
  { id: 'rogaland', name: 'Rogaland', bounds: [58.3, 5.3, 59.6, 7.0], estimatedSizeMB: 80 },
  { id: 'agder', name: 'Agder', bounds: [57.9, 6.2, 59.2, 8.7], estimatedSizeMB: 85 },
  { id: 'vestfold-telemark', name: 'Vestfold og Telemark', bounds: [58.7, 8.3, 60.1, 10.1], estimatedSizeMB: 90 },
  { id: 'innlandet', name: 'Innlandet', bounds: [60.0, 8.5, 62.5, 12.5], estimatedSizeMB: 180 },
  { id: 'more-romsdal', name: 'Møre og Romsdal', bounds: [61.7, 5.5, 63.2, 9.0], estimatedSizeMB: 100 },
  { id: 'trondelag', name: 'Trøndelag', bounds: [62.5, 9.0, 65.0, 14.5], estimatedSizeMB: 160 },
  { id: 'nordland', name: 'Nordland', bounds: [65.0, 11.0, 69.5, 16.5], estimatedSizeMB: 200 },
  { id: 'troms-finnmark', name: 'Troms og Finnmark', bounds: [68.5, 15.0, 71.2, 31.5], estimatedSizeMB: 250 },
];

/**
 * Get a region by id.
 */
export function getRegionById(id: string): OfflineRegion | undefined {
  return norwegianRegions.find((r) => r.id === id);
}
