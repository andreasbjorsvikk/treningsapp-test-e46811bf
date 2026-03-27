
Målet ditt er riktig prioritert. Jeg er enig i at fase 1 ikke er ferdig for ekte offline-bruk ennå.

## Hva som faktisk er galt nå
Jeg har gått gjennom koden, og problemet er reelt:

- `useAppData` er fortsatt ikke migrert til et ekte query/cache-lag. Den bruker `useState` + manuelle `reload()`-kall.
- Offline fallback går til lokale tjenester som leser fra generelle `localStorage`-nøkler.
- `workoutService` fyller inn `mockSessions` hvis ingen cache finnes, som forklarer test/demo-data offline.
- Query-persisteringen i `queryPersister.ts` bruker én global IndexedDB-nøkkel, ikke bruker-scope.
- Profildata (`username`, `avatar`) hentes direkte i `Index.tsx` og `SettingsPage.tsx`, så de er ikke del av offline-cachen.
- `syncQueue` dropper operasjoner stille etter maks retry i stedet for å flytte dem til en feilet-kø.

## Plan for å fikse dette

### 1) Innfør auth-ready bootstrap før datalasting
- Utvide auth-laget med eksplisitt “auth ready / session restored”-tilstand.
- App-data skal ikke laste før auth er ferdig initialisert.
- Offline oppstart skal bruke sist gjenopprettede session fra auth-lagringen, ikke demo/local fallback.

### 2) Fullfør `useAppData`-migreringen til ekte query-lag
Refaktorer `useAppData` bort fra manuell state og over til et sentralt, cachebart datalag for:
- profil
- workouts
- goals
- primary goals
- health events
- peak check-ins
- evt. daily health metrics hvis brukt i statistikkvisninger

`useAppData` skal bli en aggregator over disse queryene + mutasjonene, slik at resten av appen fortsatt kan bruke samme context-API.

### 3) Gjør all cache user-scoped
Alle brukerdata må skilles per bruker:
- query keys må inkludere `user.id`
- persistering i IndexedDB må ha separat nøkkel per bruker eller rydde/isolere cache ved brukerbytte
- lokale fallback-nøkler må enten namespaceres med `user.id` eller fases ut for innloggede brukere

Dette hindrer at feil brukerdata eller gammel testdata vises på delt enhet.

### 4) Fjern demo/test-fallback for innloggede brukere
- `mockSessions` må aldri brukes for innlogget/offline bruker.
- Dersom bruker er innlogget og ingen cache finnes, skal appen vise tydelig offline empty state.
- Gjelder profil, mål, kalender, statistikk og økter.

### 5) Cache profil og header-data riktig
Flytt profilhenting ut av direkte `supabase.from('profiles')`-kall i sider og inn i samme offline-klare datalag.
Da vil:
- riktig brukernavn
- avatar
- privacy-relatert profilinfo
kunne vises fra cache offline.

### 6) Oppdater visningene til å håndtere “offline uten cache”
Legg inn tydelige empty/offline states i sentrale visninger:
- forside
- kalender
- trening/statistikk
- mål
- profil/settings der relevant

Regel:
- Har vi cache → vis siste kjente brukerdata
- Ingen cache + offline → vis forklarende tomtilstand
- Aldri vis mock/demo som fallback

### 7) Forbedre sync queue med dead-letter state
Endre `syncQueue` slik at operasjoner etter maks retry:
- ikke slettes
- flyttes til en egen failed/dead-letter queue
- beholder `lastError`, `retryCount`, payload og timestamp

Legg også grunnlag for:
- manuell retry senere
- UI-status i neste steg, uten å måtte bygge full admin/debug UI nå

### 8) Rydd i legacy localStorage-avhengigheter
Det finnes fortsatt flere direkte `localStorage`-flyter i appen. I denne runden bør vi prioritere:
- treningsdata
- mål
- primary goals
- health events
- profil-relatert pending/welcome-logikk som kan være global og ikke bruker-scope

Vi trenger ikke rydde absolutt alt på én gang, men alt som påvirker feil brukerdata offline må inn i trygg struktur nå.

## Foreslått implementeringsrekkefølge
1. Auth-ready bootstrap
2. User-scoped query/cache foundation
3. Migrere `useAppData` datakilder
4. Migrere profildata inn i samme lag
5. Fjerne mock/demo fallback for innloggede brukere
6. Legge inn offline empty states
7. Dead-letter queue for sync failures
8. Rydding av kritiske legacy localStorage-nøkler

## Hva dette vil løse
Etter denne runden skal appen kunne:
- starte offline med sist kjente innloggede bruker
- vise riktig profil offline
- vise riktige mål, økter, kalender og statistikk fra siste cache
- aldri vise demo/testdata for innlogget bruker
- holde feilede sync-operasjoner tilgjengelige for senere retry

## Tekniske detaljer
- Behold `AppDataProvider` og `useAppDataContext` som offentlig API for resten av appen.
- Innfør query-nøkler som inkluderer `user.id`, f.eks. `['app-data','sessions', user.id]`.
- Ikke bruk generelle nøkler som `treningsapp_query_cache` alene for brukerdata uten scoping.
- Fjern eller beskytt `mockSessions` bootstrap slik at den kun gjelder ekte anonym/demo-modus, ikke autentisert bruker.
- Direkte sidekall til backend for profil (`Index`, `Settings`) bør erstattes med delt cached profil-query.
- `syncQueue` bør få `failedQueue` + lesefunksjon for senere UI/debugging.

## Min vurdering
Ja — dette er riktig neste steg, og jeg er enig i alle fem punktene du listet. Problemet er ikke bare en liten bug; det er at offline-laget fortsatt er halvveis koblet. Planen over fullfører grunnmuren så appen faktisk oppfører seg som en ekte offline-first app for innloggede brukere.
