

## Diskusjon og plan

### Problem 1: Strava overskriver brukerredigeringer ved re-sync

**Kjerneproblemet**: Når sync kjører, gjør den `upsert` med `onConflict: "user_id,strava_activity_id"` og `ignoreDuplicates: false`. Dette betyr at ALLE felter fra Strava overskriver det som ligger i databasen — inkludert type, høydemeter, distanse og tittel som brukeren har redigert.

**Tredemølle-problemet**: Du har rett — Strava sender tredemølle som "Run" (ikke "VirtualRun" med mindre det er Zwift/lignende). Det finnes ingen pålitelig måte å skille dette automatisk. Så brukeren må redigere manuelt, og da må den redigeringen bevares.

### Løsning: «user_modified»-flagg

Beste tilnærming er å legge til et `user_modified`-felt (boolean) på `workout_sessions`:

- Settes til `true` når brukeren redigerer en Strava-synkronisert økt via appen
- Ved re-sync: **hopp over** økter der `user_modified = true` — ikke overskriv noe
- Webhook-hendelser (update/delete fra Strava) respekterer også dette flagget

**Alternativet** (å tracke per-felt hva som er endret) er mer komplekst og ikke nødvendig — hvis brukeren har redigert økten, bør hele økten "eies" av brukeren.

### Problem 2: «Ikke tell som en økt»

Legge til et `exclude_from_count`-felt (boolean, default false) på `workout_sessions`. Når dette er avhuket:
- All data (distanse, høydemeter, varighet, HR osv.) telles med i statistikk og mål
- Men økten telles **ikke** som én økt i: primærmål (antall økter), ekstra mål med metric "sessions", utfordringer, og badges

---

### Implementeringsplan

**Steg 1: Database-migrasjon**
- Legg til `user_modified boolean NOT NULL DEFAULT false` på `workout_sessions`
- Legg til `exclude_from_count boolean NOT NULL DEFAULT false` på `workout_sessions`

**Steg 2: Edge function — Strava sync**
- I `sync`-handlingen: Når en økt allerede finnes (er i `existingIds`), sjekk `user_modified`. Hvis `true`, hopp over den helt.
- I `sync-all`: Samme logikk.
- I webhook (`strava-webhook/index.ts`): Ved `update`-event, sjekk `user_modified` før overskriving. Ved `delete`, slett uansett.

**Steg 3: WorkoutDialog — sett user_modified ved redigering**
- Når brukeren lagrer endringer på en økt som har `strava_activity_id`, sett `user_modified = true` i databasen.

**Steg 4: WorkoutDialog — «Ikke tell som en økt»**
- Legg til en checkbox med label "Ikke tell som en økt" med et `?`-ikon som viser tooltip/popover med forklaringen du beskrev.
- Lagre verdien i `exclude_from_count`.

**Steg 5: Filtrere ut exclude_from_count i statistikk**
- I `useAppData.ts` / `AppDataContext.tsx`: Når `metric === 'sessions'` telles, filtrer bort økter der `exclude_from_count = true`.
- Påvirker: primærmål (økt-telling), ekstra mål med sessions-metric, utfordringer, badges, og statistikk-visninger der antall økter vises.
- All annen statistikk (total distanse, høydemeter, varighet) inkluderer disse øktene som normalt.

**Steg 6: Oppdater TypeScript-typer**
- Legg til `userModified?: boolean` og `excludeFromCount?: boolean` på `WorkoutSession`-interfacet.

### Filer som endres
- `supabase/functions/strava/index.ts` — sync-logikk
- `supabase/functions/strava-webhook/index.ts` — webhook-logikk  
- `src/components/WorkoutDialog.tsx` — UI for checkbox + sette user_modified
- `src/types/workout.ts` — nye felter
- `src/services/workoutService.ts` — sende user_modified ved save
- `src/contexts/AppDataContext.tsx` — filtrere exclude_from_count
- `src/utils/goalUtils.ts` — respektere exclude_from_count i mål-beregninger
- DB-migrasjon for de to nye kolonnene

