
# Fase 2: Native UX, varsler og feature scaffolding — Implementert

## Ferdig ✅

### Del 1: Haptics integration points
- Tab-bytte i BottomNav → `selectionChanged()`
- Sub-tab bytte i TrainingSubTabs → `selectionChanged()`
- Lagre økt i WorkoutDialog → `impact('medium')`
- Mål nådd (GoalCompletionOverlay) → `notification('success')`
- Badge oppnådd (BadgeUnlockOverlay) → `notification('success')`
- Peak check-in (PeakDetailDrawer) → `notification('success')`

### Del 2: Notification preferences
- DB-tabell `notification_preferences` med RLS
- Hook `useNotificationPreferences` med optimistic updates
- UI i Innstillinger med toggles per kategori (5 kategorier)
- Oversatt til norsk og engelsk

### Del 3: Sync/dead-letter visibility
- Ny "Synkronisering" seksjon i Innstillinger
- Viser online/offline status
- Antall ventende operasjoner
- Antall feilede (dead-letter) med "Prøv igjen"-knapp
- Badge i hovedmenyen som viser antall ventende/feilede

### Del 4: Kamera-flyt polish
- Alle hardkodede norske strenger i CheckinImageUpload oversatt
- useTranslation lagt til i begge komponenter (upload + crop dialog)
- Feiltekster oversatt

### Del 5-7: Native guards + Apple Health
- Apple Health-seksjonen i Innstillinger vises allerede kun på native iOS
- isNativePlatform()/isIOS() guards er korrekte
- Permissions onboarding viser kun på native plattform
- Haptics er no-op i web via service

## Neste steg (Fase 3)
- Ekte Capacitor-plugins når native build er klar
- Push notification delivery
- HealthKit-integrasjon
- Full offline map tile caching
