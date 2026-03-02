

## Plan

### 1. Kart i øktdetaljer (bug-fix)

Kartdata finnes i databasen (bekreftet via SQL-spørring). Koden i `WorkoutDetailDrawer.tsx` ser korrekt ut -- den sjekker `session.summaryPolyline`, dekoder polyline, og rendrer et Leaflet-kart. Mulige årsaker til at du ikke ser kartet:

- **Leaflet container-høyde:** Kartet rendres i en `div` med `h-48`, men Leaflet krever at containeren har en eksplisitt størrelse når den mountes. Inne i en Drawer som animerer inn, kan dette feile stille.
- **MapErrorBoundary svelger feilen:** Error boundary returnerer `null` ved feil, så kartet forsvinner uten noen synlig feilmelding.

**Fix:** Legge til en `key` på `MapContainer` basert på session-id for å tvinge re-mount, og legge til en liten delay/`whenReady`-callback. Eventuelt fjerne `MapErrorBoundary` midlertidig for å se den faktiske feilen i konsollen.

### 2. Fellesskap-seksjonen (ny feature)

Bygges med mock-data. Ingen database-tabeller ennå.

#### Filstruktur

```text
src/pages/CommunityPage.tsx          -- Hovedside (erstatter placeholder)
src/components/community/
  CommunitySubTabs.tsx               -- Segmentert kontroll (Utfordringer | Ledertavle)
  ChallengeCard.tsx                   -- Kort for én utfordring
  ChallengeDetail.tsx                 -- Detaljside (drawer) for utfordring
  ChallengeForm.tsx                   -- Opprett/rediger utfordring (dialog)
  LeaderboardSection.tsx              -- Ledertavle med periode/kategori-filter
  LeaderboardRow.tsx                  -- Én rad i ledertavle
  NotificationBell.tsx                -- Bjelle-ikon med badge
  NotificationSheet.tsx               -- Liste over notifikasjoner (sheet)
  FriendsGroupSheet.tsx               -- Venner & grupper (sheet)
src/data/mockCommunity.ts             -- All mock-data
```

#### A. Hovedside (`CommunityPage.tsx`)

- Header med tittel "Fellesskap" + NotificationBell øverst til høyre
- `CommunitySubTabs`: **Utfordringer** | **Ledertavle**
- Når "Utfordringer" er valgt: viser utfordrings-seksjonen
- Når "Ledertavle" er valgt: viser ledertavle-seksjonen

#### B. Utfordringer

**Segmentert kontroll** (inne i utfordringer): Aktive | Mine | Arkiv

- **Aktive:** Kort-liste med `ChallengeCard` for utfordringer brukeren deltar i
- **Mine:** Utfordringer brukeren har opprettet, med redigeringsknapp
- **Arkiv:** Avsluttede utfordringer med sluttresultat

**ChallengeCard viser:**
- Emoji + navn
- Periode (f.eks. "1.--30. april")
- Metrikk-type (ikon)
- Progress bar med begge brukernes progresjon
- Plassering + antall deltakere
- Avatarer for deltakere (maks 4)

**ChallengeDetail (Drawer):**
- Rangert deltakerliste
- Nedtelling ("6 dager igjen")
- "Forlat utfordring"-knapp
- "Rediger"-knapp (krever godkjenning fra andre)

**ChallengeForm (Dialog):**
- Navn, emoji (valgfritt)
- Metrikk: Økter / Distanse / Varighet / Høydemeter
- Aktivitetstype: Alle + alle eksisterende typer
- Periode: Denne uken / Denne måneden / Dette året / Egendefinert
- Målverdi (tall)
- Velg deltakere fra venneliste/gruppe

#### C. Ledertavle

- Periode-segment: Ukentlig | Månedlig | Årlig
- Kategori-valg: Økter | Distanse | Høydemeter
- Aktivitetstype-filter (samme som statistikksiden)
- Rangert liste med plassering + tall
- Fallback-tekst hvis ingen venner: "Inviter venner for å starte konkurranse"

#### D. Notifikasjoner (bjelle)

- Bjelle-ikon med rød badge (antall uleste)
- Åpner et Sheet med liste over notifikasjoner:
  - Invitasjon til utfordring
  - Endring krever godkjenning
  - Utfordring avsluttet
- Kun visuell mock, ingen backend

#### E. Venner & Grupper

- Enkel liste over venner (mock)
- Grupper: navn + emoji, ingen chat
- Brukes for å velge deltakere i utfordringer

#### F. Mock-data (`mockCommunity.ts`)

Inneholder:
- 3-4 mock-utfordringer (aktive, mine, arkiverte)
- 5-6 mock-venner med avatar og brukernavn
- 1-2 mock-grupper
- 3-4 mock-notifikasjoner
- Mock-ledertavle-data

#### Designprinsipper

- Samme `glass-card`, `rounded-lg`, font-stiler som resten av appen
- Segmentert kontroll: identisk stil som `TrainingSubTabs`
- Progress bars: `bg-secondary` bakgrunn, fargede indikatorer
- Kort-layout: kompakt, sportslig, minimalistisk
- Ingen feed, ingen kommentarer, ingen bilder
- Støtter dark mode via eksisterende CSS-variabler

