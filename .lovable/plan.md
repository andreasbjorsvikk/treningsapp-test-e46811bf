

## Plan: Hjemskjerm, Trening-fane og Mål-system ombygging

### 1. Hjemskjerm – "Siste 7 dager" kompakt med ikonrad

**Endringer i `src/pages/Index.tsx` og ny komponent `src/components/WeeklySessionIcons.tsx`:**
- Ny komponent som henter økter siste 7 dager og rendrer en horisontal rad med aktivitetsikoner/badger i riktige farger
- Overflow-løsning: hvis >8 ikoner, vis de første 7 + en "+N"-badge på slutten
- Plasseres over eller integrert i StatsOverview-seksjonen
- StatsOverview gjøres mer kompakt: reduser padding fra `p-4` til `p-3`, tekststørrelse fra `text-2xl` til `text-xl`, og legg alt i en tettere grid

### 2. Trening-fane – segmented control i stedet for dropdown

**Endringer i `src/components/BottomNav.tsx`:**
- Fjern dropdown/dropup-logikken fra Trening-knappen
- Trening-knappen navigerer kun til trening-fanen (ingen ChevronDown, ingen popup)

**Endringer i `src/pages/TrainingPage.tsx`:**
- Legg til en segmented control øverst på siden med tre segmenter: Statistikk | Historikk | Mål
- iOS-native stil: pill-formet bakgrunn med sliding highlight, `rounded-lg bg-muted` med aktiv tab `bg-background shadow-sm`
- Bruker eksisterende `subTab`-state

**Endringer i `src/pages/Index.tsx`:**
- Fjern `trainingSubTab`/`onTrainingSubTabChange` fra BottomNav-props
- Flytt sub-tab state til TrainingPage internt, eller behold i Index men styr via TrainingPage

### 3. Mål-system – Hovedmål + Ekstra mål

#### A) Ny type-definisjon i `src/types/workout.ts`:
```typescript
export interface PrimaryGoal {
  id: string;
  inputPeriod: GoalPeriod; // hvilken periode bruker satte
  inputTarget: number;     // verdien bruker skrev inn
  createdAt: string;
}

export interface ExtraGoal {
  id: string;
  metric: GoalMetric;
  period: GoalPeriod | 'custom';
  activityType: SessionType | 'all';
  target: number;
  customStart?: string; // ISO date for egendefinert
  customEnd?: string;
  createdAt: string;
}
```

#### B) Ny service `src/services/primaryGoalService.ts`:
- Lagrer ett enkelt hovedmål i localStorage (`treningslogg_primary_goal`)
- Beregner ekvivalente verdier: Uke↔Måned (×4.33) ↔ År (×12 fra måned, ×52 fra uke)

#### C) Oppdater `src/services/goalService.ts`:
- Støtt `period: 'custom'` med `customStart`/`customEnd` datofiltrering

#### D) Ny komponent `src/components/PrimaryGoalForm.tsx`:
- Segmented control for Uke/Måned/År
- Tallinnput for valgt periode
- Under inputen vises automatisk beregnede ekvivalenter: "= X per uke / Y per måned / Z per år"
- Lagre-knapp

#### E) Oppdater `src/components/GoalForm.tsx` → ekstra mål:
- Legg til "Egendefinert" i periodevalg
- Vis fra/til datepickers når "Egendefinert" er valgt
- Behold eksisterende metrikk/aktivitetstype-velgere

#### F) Ny komponent `src/components/GoalsSection.tsx` (ombygg):
- **Hovedmål-seksjon** øverst: viser nåværende hovedmål med progress ring + "X igjen" + "Y dager igjen"
- Hvis ikke satt: stor CTA "Sett ditt treningsmål"
- **Ekstra mål-seksjon** under: liste av ekstra mål, hver med progress bar
- "Legg til ekstra mål"-knapp

#### G) Oppdater `src/components/GoalCard.tsx`:
- Legg til "X igjen"-tekst (target - current) og "Y dager igjen" i perioden
- Enkel foran/bak-indikator: beregn forventet progresjon basert på andel av perioden som har gått, vis "Foran skjema" / "Bak skjema" med fargekode

#### H) Oppdater `src/pages/Index.tsx`:
- Hjemskjermens progresjonshjul drives nå av hovedmålet (primaryGoal)
- Månedshjulet: viser hovedmålets månedsekvivalent
- Årshjulet: viser hovedmålets årsekvivalent

### Filer som opprettes:
- `src/components/WeeklySessionIcons.tsx`
- `src/components/PrimaryGoalForm.tsx`
- `src/services/primaryGoalService.ts`
- `src/components/TrainingSubTabs.tsx` (segmented control)

### Filer som endres:
- `src/types/workout.ts` – nye typer
- `src/pages/Index.tsx` – hjemskjerm layout, hovedmål-integrasjon
- `src/components/BottomNav.tsx` – fjern dropdown
- `src/pages/TrainingPage.tsx` – segmented control øverst
- `src/components/StatsOverview.tsx` – kompaktere layout
- `src/components/GoalsSection.tsx` – ombygg med hovedmål + ekstra mål
- `src/components/GoalForm.tsx` – egendefinert periode-støtte
- `src/components/GoalCard.tsx` – "X igjen", "Y dager igjen", foran/bak
- `src/services/goalService.ts` – custom period-støtte
- `src/utils/goalUtils.ts` – custom period-beregning

