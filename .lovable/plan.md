

## Plan: Verifisere og fikse haptics som ikke kjennes

### Analyse

Koden ser riktig ut — alle 18 filer har `hapticsService.impact('heavy')` kall. Servicen (`hapticsService.ts`) har ekte Capacitor-kall. Siden bottom tabs og training sub-tabs fungerer, er selve Capacitor-broen OK.

### Sannsynlig årsak

Problemet er trolig at **appen bruker hot-reload mot Lovable preview-URL**, og noen komponenter ble oppdatert i Lovable MEN den native appen cacher eldre JavaScript-bundles. Alternativt kan det være at du rett og slett ikke har testet alle interaksjonene systematisk ennå.

### Foreslått tilnærming

**Steg 1: Legg til et synlig debug-overlay (midlertidig)**

Legg til en liten toast/visuell indikator som vises kort hver gang `hapticsService.impact()` kalles, f.eks. et lite badge øverst på skjermen med teksten "HAPTIC: heavy". Dette bekrefter visuelt om kallet faktisk skjer, uavhengig av om du kjenner vibrasjonen.

**Steg 2: Sjekk Xcode-logger**

Hvert haptics-kall logger allerede `HAPTICS before native call` og `HAPTICS success`. Når du trykker på f.eks. PeriodSelector-pilene eller MetricSelector-chips — ser du disse loggene i Xcode? Hvis ikke, er det JavaScript-koden som ikke kjører (caching-problem).

**Steg 3: Force cache-bust**

I `capacitor.config.ts`, legg til en query-parameter på server-URLen for å tvinge fresh load:
```
url: "https://...lovableproject.com?forceHideBadge=true&v=2"
```
Deretter `npx cap sync` + rebuild i Xcode.

**Steg 4: Justere til produksjonsnivåer**

Når vi har bekreftet at alle kall faktisk treffer, justere intensitet:

| Interaksjon | Nåværende | Mål |
|---|---|---|
| Bottom tabs | heavy | medium |
| Training/Map/Community sub-tabs | heavy | medium |
| Period chips, prev/next | heavy | medium |
| Metric chips | heavy | medium |
| Activity type filter | heavy | medium |
| Chart type toggle | heavy | medium |
| DurationPicker wheel snap/click | heavy | medium |
| Swipe complete | heavy | medium |
| Workout save | heavy | heavy (beholde) |
| Map long press | heavy | heavy (beholde) |
| Badge/goal/challenge | notification(success) | beholde |

### Endringer i kode

- 1 fil: `hapticsService.ts` — legg til visuell debug (midlertidig)
- 1 fil: `capacitor.config.ts` — cache-bust parameter
- ~15 filer: nedgradere heavy → medium etter bekreftelse

### Ingen risiko for web

Alt er bak `isNativeCapacitorRuntime()` guard. Web forblir no-op.

