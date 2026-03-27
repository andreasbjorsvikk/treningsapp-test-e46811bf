

# Fase 1: Offline-first & Native-ready — Implementeringsplan

## Oversikt
Gjøre appen fullt brukbar offline med sync-kø, gradvis React Query-migrering, og native service scaffolding.

## Del 1: Network Status + Sync Queue
**Nye filer:**
- `src/hooks/useNetworkStatus.ts` — `isOnline` state via `navigator.onLine` + events
- `src/services/syncQueue.ts` — IndexedDB-basert kø med `idb-keyval`

**Sync queue design:**
- Operasjon: `{ id, table, action, payload, createdAt, retryCount, lastError }`
- Auto-flush når online, i rekkefølge
- Feilede operasjoner forblir i kø, retries med backoff
- Idempotency via unik `id` per operasjon + duplikat-sjekk
- Last-write-wins for brukerdata; server-derived data (badges, standings) refreshes etter sync

## Del 2: React Query migrering (gradvis, 3 steg)
**Steg A**: Wrap eksisterende fetches i `useAppData` i React Query queries — ingen funksjonell endring
**Steg B**: Legg til `persistQueryClient` med `idb-keyval` — cachet data ved oppstart
**Steg C**: Koble offline writes til sync queue — optimistiske mutasjoner

**Nye dependencies:** `idb-keyval`, `@tanstack/react-query-persist-client`

## Del 3: Sync-status UI
- `src/components/SyncStatusIndicator.tsx` — sky-ikon i AppHeader
- Vises kun når `queue.length > 0`, statisk (ingen blinking)
- Forsvinner når alt er synkronisert

## Del 4: Offline Peak Check-in (GPS)
- Validere mot cachet peak-koordinater (100m radius, som eksisterende)
- Lagre i sync queue: `peak_id, GPS, tidsstempel`
- Ingen bilde-buffering i fase 1
- Duplikat-prevensjon: sjekk `user_id + peak_id + checked_in_at`

## Del 5: Offline Kart (minimal)
- Peak-data caches automatisk via React Query persist
- `src/utils/offlineRegions.ts` — fylke bounding boxes (kun datastruktur)
- `src/services/offlineMapService.ts` — interface med TODO for tile-nedlasting
- Kartet forblir online-first

## Del 6: Native Service Scaffolding
Interfaces med web-fallbacks (no-op) og `isNativePlatform()` guards:
- `src/services/hapticsService.ts`
- `src/services/pushService.ts`
- `src/services/cameraService.ts`
- Utvide eksisterende `appleHealthService.ts`

## Del 7: Permissions Onboarding
- `src/components/PermissionsOnboarding.tsx` — kun native modus
- Én skjerm av gangen, forklaring før request
- Alltid "Hopp over"-knapp, kan gjenåpnes fra Innstillinger
- Aldri blokkerende

## Rekkefølge
1. Network status hook + sync queue
2. React Query steg A (wrap fetches)
3. React Query steg B (persist)
4. React Query steg C (offline writes)
5. Sync-status UI
6. Offline peak check-in med GPS
7. Offline kart scaffold
8. Native service scaffolding
9. Permissions onboarding

