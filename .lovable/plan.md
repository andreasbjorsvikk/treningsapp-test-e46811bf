

## Plan: Økt-detaljvisning med kart, puls og høydeprofil

### Oversikt

Bygge en "Workout Detail Drawer" som åpnes når man trykker på en økt. Viser et pent kort med kartrute, nøkkelstatistikk, og valgfritt puls/høydeprofil via en "Last detaljer"-knapp.

### Steg 1: Database-migrering

Legge til kolonner i `workout_sessions`:
- `average_heartrate` (integer, nullable)
- `max_heartrate` (integer, nullable)  
- `summary_polyline` (text, nullable)

Ny tabell `workout_streams`:
- `id` (uuid, PK)
- `session_id` (uuid, FK til workout_sessions, unique)
- `user_id` (uuid)
- `heartrate_data` (jsonb) -- array med tidspunkt/puls
- `altitude_data` (jsonb) -- array med distanse/høyde
- `latlng_data` (jsonb) -- array med lat/lng-punkter
- `created_at` (timestamptz)
- RLS: brukere ser kun egne data

### Steg 2: Oppdater Strava sync (edge function)

Under vanlig synk: lagre `average_heartrate`, `max_heartrate`, `summary_polyline` fra Strava-aktiviteten (allerede tilgjengelig, ingen ekstra API-kall).

Ny action `fetch-streams`: henter detaljerte streams for én økt (1 API-kall), decoder og lagrer i `workout_streams`.

### Steg 3: Installer Leaflet

Legge til `leaflet` og `react-leaflet` for kartvisning. Gratis med OpenStreetMap-tiles, lett interaktivt (zoom/pan).

### Steg 4: Ny komponent `WorkoutDetailDrawer`

Drawer fra bunnen med:
- **Kartseksjon** (øverst): Decoder polyline, viser ruten på et lite Leaflet-kart. Skjules for økter uten GPS.
- **Header**: Økt-ikon, tittel, dato, varighet
- **Stat-tiles**: Distanse, høydemeter, snitt-tempo i et grid
- **Puls-tiles**: Snittpuls, makspuls (vises hvis data finnes)
- **"Last detaljer"-knapp**: Henter streams fra edge function, viser:
  - Høydeprofil-chart (Recharts AreaChart, distanse på x-akse, høyde på y-akse)
  - Pulsdiagram (Recharts LineChart, tid/distanse på x-akse, puls på y-akse)
- **Notater** nederst
- **Rediger/Slett-knapper** i footer

### Steg 5: Koble SessionCard

Trykk på SessionCard åpner WorkoutDetailDrawer i stedet for å bare vise inline-info.

### Tekniske detaljer

- Polyline-decoding: liten utility-funksjon (~30 linjer) for å decode Googles encoded polyline-format
- Leaflet CSS importeres i index.css
- Recharts allerede installert, brukes for puls- og høydeprofil-charts
- Streams caches i `workout_streams` -- hentes bare én gang per økt
