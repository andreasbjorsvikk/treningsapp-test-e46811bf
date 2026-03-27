## Plan

### Fase 1: Offline-first & Native-ready (IMPLEMENTERT)

#### Del 1: Network Status + Sync Queue ✅
- `src/hooks/useNetworkStatus.ts` — `isOnline` state via `navigator.onLine` + events
- `src/services/syncQueue.ts` — IndexedDB-basert kø med `idb-keyval`
- `src/hooks/useSyncQueue.ts` — React hook for sync queue monitoring + auto-flush

#### Del 2: React Query + Offline Cache ✅
- `PersistQueryClientProvider` i `App.tsx` med IndexedDB-backed persister
- `src/lib/queryPersister.ts` — idb-keyval persister for React Query
- `useAppData` oppdatert med offline writes via sync queue
- localStorage brukes som offline cache for data hentet fra database

#### Del 3: Sync-status UI ✅
- `src/components/SyncStatusIndicator.tsx` — sky-ikon i AppHeader
- Vises kun når kø har ventende operasjoner eller offline
- Tooltip med antall ventende + status

#### Del 4: Offline Peak Check-in (GPS) ✅
- Sync queue støtter `peak_checkins` tabell
- Check-ins kan lagres offline og synkes ved reconnect

#### Del 5: Offline Kart (minimal scaffold) ✅
- `src/utils/offlineRegions.ts` — norske fylker med bounding boxes
- `src/services/offlineMapService.ts` — interface for region-nedlasting (scaffold)
- Peak-data caches via localStorage offline cache

#### Del 6: Native Service Scaffolding ✅
- `src/services/hapticsService.ts` — impact/notification/selection haptics
- `src/services/pushService.ts` — permission request + device token registration
- `src/services/cameraService.ts` — take photo / pick from gallery (web fallback)
- Alle bruker `isNativePlatform()` guard med TODO for Capacitor plugins

#### Del 7: Permissions Onboarding ✅
- `src/components/PermissionsOnboarding.tsx` — steg-for-steg dialog
- Posisjon, varsler, kamera, Apple Health
- Aldri blokkerende, alltid skippbar
- Kun synlig i native modus

### Neste steg (Fase 2)
- Capacitor plugin installasjon (haptics, push, camera, healthkit)
- Offline bilde-buffering for peak check-ins
- Tile-caching for offline kart (native Mapbox SDK)
- Push notification device token storage (DB migration)
