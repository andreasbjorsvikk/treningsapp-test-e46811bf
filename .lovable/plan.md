

# Fase 2: Native UX, varsler og feature scaffolding — Justert plan

## Min vurdering av ChatGPTs plan

Planen er god i retning, men har noen deler som er overspesifisert for det som faktisk gir verdi nå. Her er min justerte versjon med det som faktisk bør gjøres, tonet ned der det er unødvendig.

---

## Del 1: Haptics — koble til actions (liten jobb)

Legg til `hapticsService`-kall på riktige steder i appen. Alt er no-op i web, men klar for native.

- Tab-bytte i `BottomNav` → `selectionChanged()`
- Lagre økt / mål → `impact('medium')`
- Mål nådd / badge / challenge ferdig / peak check-in → `notification('success')`
- Segmented controls / sub-tab bytte → `selectionChanged()`

Ingen nye filer. Bare import + kall i eksisterende komponenter.

---

## Del 2: Notification preferences (moderat jobb)

**Hva ChatGPT foreslår som er unødvendig nå:**
- "Lokal scheduling-struktur" — rapportene trigges allerede on-app-open, ikke via timer
- Skille mellom "local" og "push" i UI — forvirrer brukeren, ingen av dem fungerer ennå

**Hva jeg faktisk vil bygge:**

1. **DB-tabell `notification_preferences`** med kolonner per kategori:
   - `friend_challenge` (boolean, default true)
   - `challenge_complete` (boolean, default true)
   - `goal_reached` (boolean, default true)
   - `weekly_report` (boolean, default true)
   - `monthly_report` (boolean, default true)

2. **UI i Innstillinger** — ny seksjon "Varsler" med toggles per kategori, enkel og tydelig

3. **Hook `useNotificationPreferences`** som leser/skriver til tabellen

4. Sjekk preferences før rapport-prompt vises og før community-varsler sendes

Ingen push-infrastruktur, ingen scheduling, ingen lokal notification API. Bare preferanser som styrer hva som vises i appen.

---

## Del 3: Permissions onboarding polish (liten jobb)

Scaffoldet finnes allerede i `PermissionsOnboarding.tsx`. Justeringer:

- Legg til permission-status tracking i localStorage (`not_asked` / `granted` / `denied` / `unavailable`)
- Vis status i Innstillinger under hver tillatelse (grønn = aktivert, grå = ikke spurt, rød = avslått)
- Legg til "Åpne tillatelser" knapp i Innstillinger som viser onboarding-dialogen på nytt
- Platform guards: skjul Apple Health på ikke-iOS, skjul native-spesifikke ting i web

Alt er fortsatt scaffold — ingen ekte permission-requests.

---

## Del 4: Kamera-flyt polish (liten jobb)

`cameraService.ts` og `CheckinImageUpload.tsx` finnes allerede og fungerer i web. Justeringer:

- Oversett hardkodede norske strenger i `CheckinImageUpload` ("Juster bilde", "Komprimerer...", etc.)
- Legg til bedre error-håndtering (toast ved feil)
- Sørg for at `cameraService` brukes konsekvent (sjekk at avatar-upload også går via service)

Ikke bygge ny UI-flyt. Det som finnes fungerer.

---

## Del 5: Sync/dead-letter visibility (moderat jobb)

Sync-indikatoren finnes i hero-headeren. Utvid med:

1. **Ny seksjon i Innstillinger** — "Synkronisering":
   - Online/offline status
   - Antall ventende operasjoner
   - Antall feilede (dead-letter)
   - "Prøv igjen"-knapp for dead-letter queue
   - Sist synkronisert tidspunkt

2. Brukervennlig språk, ikke teknisk. F.eks. "2 endringer venter på å bli lagret" og "1 endring kunne ikke lagres — prøv igjen".

---

## Del 6: Native guards audit (liten jobb)

Gå gjennom alle `isNativePlatform()`-guards og sørg for:
- Ingen feil i web når native funksjoner mangler
- Ingen misvisende UI (f.eks. "Koble til Apple Health" skal ikke vises i web)
- Tydelige TODO-kommentarer der Capacitor-plugin kreves senere
- Apple Health-seksjonen i Innstillinger vises kun på iOS

---

## Del 7: Apple Health settings polish

Allerede scaffoldet. Kun:
- Sørg for at seksjonen er skjult i web/Android
- Tydelig status-visning (tilkoblet / frakoblet / utilgjengelig)
- Konsistent med resten av innstillingene
- Ingen nye funksjoner

---

## Rekkefølge

1. Notification preferences (DB + UI + hook) — størst funksjonell verdi
2. Sync visibility i Innstillinger
3. Haptics integration points
4. Permissions status tracking + Innstillinger UI
5. Kamera-flyt polish + oversettelse
6. Native guards audit + Apple Health polish

---

## Hva som IKKE gjøres

- Ingen Capacitor-installasjon
- Ingen push-infrastruktur
- Ingen lokal notification scheduling
- Ingen HealthKit-integrasjon
- Ingen Xcode-oppsett
- Ingen widgets

## Tekniske detaljer

- Ny migrasjon: `notification_preferences` tabell med RLS (user_id = auth.uid())
- Ny hook: `useNotificationPreferences.ts`
- Endringer i ~10 eksisterende filer for haptics-kall
- Ny seksjon i `SettingsPage.tsx` for sync-status og notification toggles
- Oversettelsesnøkler i `translations.ts` for nye UI-elementer

