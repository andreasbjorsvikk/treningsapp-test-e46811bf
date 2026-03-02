export type Language = 'no' | 'en';

const no: Record<string, string> = {
  // Navigation
  'nav.home': 'Hjem',
  'nav.calendar': 'Kalender',
  'nav.training': 'Trening',
  'nav.community': 'Fellesskap',
  'nav.settings': 'Innst.',

  // Months
  'month.0': 'Januar', 'month.1': 'Februar', 'month.2': 'Mars', 'month.3': 'April',
  'month.4': 'Mai', 'month.5': 'Juni', 'month.6': 'Juli', 'month.7': 'August',
  'month.8': 'September', 'month.9': 'Oktober', 'month.10': 'November', 'month.11': 'Desember',
  'month.short.0': 'Jan', 'month.short.1': 'Feb', 'month.short.2': 'Mar', 'month.short.3': 'Apr',
  'month.short.4': 'Mai', 'month.short.5': 'Jun', 'month.short.6': 'Jul', 'month.short.7': 'Aug',
  'month.short.8': 'Sep', 'month.short.9': 'Okt', 'month.short.10': 'Nov', 'month.short.11': 'Des',

  // Weekdays (monday-start)
  'weekday.mon': 'M', 'weekday.tue': 'T', 'weekday.wed': 'O', 'weekday.thu': 'T',
  'weekday.fri': 'F', 'weekday.sat': 'L', 'weekday.sun': 'S',

  // Activity types
  'activity.styrke': 'Styrke', 'activity.løping': 'Løping', 'activity.fjelltur': 'Fjelltur',
  'activity.svømming': 'Svømming', 'activity.sykling': 'Sykling', 'activity.gå': 'Gå',
  'activity.tennis': 'Tennis', 'activity.yoga': 'Yoga', 'activity.annet': 'Annet',

  // Metrics
  'metric.sessions': 'økter', 'metric.minutes': 'timer', 'metric.distance': 'km', 'metric.elevation': 'm',
  'metric.sessions.label': 'Økter', 'metric.minutes.label': 'Tid', 'metric.distance.label': 'Distanse', 'metric.elevation.label': 'Høydemeter',

  // Home
  'home.last7days': 'Siste 7 dager',
  'home.goals': 'Mål',
  'home.recentSessions': 'Siste økter',
  'home.newSession': 'Ny økt',
  'home.editGoal': 'Rediger mål',

  // Goals
  'goals.generalGoal': 'Generelt treningsmål',
  'goals.otherGoals': 'Andre mål',
  'goals.addGoal': 'Legg til mål',
  'goals.noGoalsYet': 'Ingen andre mål ennå.',
  'goals.setGoal': 'Sett ditt treningsmål',
  'goals.sessionsPerWeek': 'økter per uke',
  'goals.sessionsPerMonth': 'økter per måned',
  'goals.sessionsPerYear': 'økter per år',
  'goals.sessionsPer': 'økter per',
  'goals.perWeek': '/uke',
  'goals.perMonth': '/mnd',
  'goals.perYear': '/år',
  'goals.edit': 'Endre',
  'goals.delete': 'Slett',
  'goals.deleteGoalTitle': 'Slett treningsmål',
  'goals.deleteGoalDesc': 'Er du sikker på at du vil slette det generelle treningsmålet? Denne handlingen kan ikke angres.',
  'goals.showOnHome': 'Vis på hjemskjerm',
  'goals.removeFromHome': 'Fjern fra hjemskjerm',
  'goals.period.week': 'uke',
  'goals.period.month': 'måned',
  'goals.period.year': 'år',
  'goals.previousGoals': 'Tidligere mål',
  'goals.ongoing': 'pågående',
  'goals.updateGoal': 'Oppdater treningsmål',
  'goals.validFrom': 'Gyldig fra',
  'goals.otherDate': 'Annen dato',
  'goals.deleteCurrentTitle': 'Slett nåværende mål',
  'goals.deleteCurrentDesc': 'Dette er ditt nåværende mål. Vil du gå tilbake til ditt forrige mål eller sette et nytt?',
  'goals.revertToPrevious': 'Gå tilbake til forrige mål',
  'goals.setNewGoal': 'Sett et nytt mål',

  // Goal card
  'goalCard.thisWeek': 'Denne uken',
  'goalCard.thisMonth': 'Denne måneden',
  'goalCard.thisYear': 'I år',
  'goalCard.daysLeft': 'dager igjen',
  'goalCard.reached': '✓ Nådd!',
  'goalCard.onTrack': 'I rute',
  'goalCard.ahead': 'Foran skjema',
  'goalCard.behind': 'Bak skjema',
  'goalCard.remaining': 'igjen',
  'goalCard.deleteTitle': 'Slett mål',
  'goalCard.deleteDesc': 'Er du sikker på at du vil slette dette målet? Denne handlingen kan ikke angres.',

  // Goal form
  'goalForm.editGoal': 'Rediger mål',
  'goalForm.newGoal': 'Nytt ekstra mål',
  'goalForm.metricType': 'Måltype',
  'goalForm.period': 'Periode',
  'goalForm.activityType': 'Aktivitetstype',
  'goalForm.target': 'Mål',
  'goalForm.all': 'Alle',
  'goalForm.week': 'Uke',
  'goalForm.month': 'Måned',
  'goalForm.year': 'År',
  'goalForm.custom': 'Egendefinert',
  'goalForm.from': 'Fra',
  'goalForm.to': 'Til',
  'goalForm.cancel': 'Avbryt',
  'goalForm.save': 'Lagre',
  'goalForm.create': 'Opprett',
  'goalForm.eg': 'f.eks.',

  // Primary goal form
  'primaryGoal.setGoal': 'Sett treningsmål',
  'primaryGoal.description': 'Hvor mange økter vil du trene? Velg periode og antall – resten beregnes automatisk.',
  'primaryGoal.sessionsPerPeriod': 'Økter per',
  'primaryGoal.startDate': 'Startdato for mål',
  'primaryGoal.startDateDesc': 'Mål beregnes fra denne datoen.',
  'primaryGoal.sessionsPerLabel': 'økter per',

  // Progress wheel
  'wheel.setGoal': 'Sett mål',
  'wheel.onTrack': 'Du er i rute',
  'wheel.ahead': '{n} {unit} foran skjema',
  'wheel.behind': '{n} {unit} bak skjema',
  'wheel.session': 'økt',
  'wheel.sessions': 'økter',

  // Stats
  'stats.sessions': 'Økter',
  'stats.time': 'Tid',
  'stats.distance': 'Distanse',
  'stats.elevation': 'Høydemeter',

  // Training subtabs
  'training.statistics': 'Statistikk',
  'training.history': 'Historikk',
  'training.goals': 'Mål',

  // Training page
  'training.exportAll': 'Eksporter alle økter',
  'training.importAdd': 'Importer (legg til)',
  'training.importReplace': 'Importer (erstatt alt)',
  'training.importReplaceConfirm': '⚠️ Dette vil overskrive alle økter du har i appen fra før. Er du sikker?',
  'training.noSessionsFound': 'Ingen økter funnet i',
  'training.session': 'økt',
  'training.sessions': 'økter',
  'training.exportSuccess': 'Økter eksportert!',
  'training.importSuccess': '{n} nye økter lagt til (duplikater hoppet over).',
  'training.importReplaceSuccess': 'Alle økter erstattet med {n} økter.',
  'training.importError': 'Kunne ikke lese filen. Sjekk at det er en gyldig JSON-fil.',

  // Workout dialog
  'workout.newSession': 'Ny økt',
  'workout.editSession': 'Rediger økt',
  'workout.type': 'Type',
  'workout.name': 'Navn på økt',
  'workout.optional': 'valgfritt',
  'workout.date': 'Dato',
  'workout.duration': 'Varighet',
  'workout.distance': 'Distanse',
  'workout.distanceKm': 'Distanse km',
  'workout.elevation': 'Høydemeter',
  'workout.notes': 'Notater',
  // Home stats toggle
  'home.thisWeek': 'Denne uken',
  'home.thisMonth': 'Denne måneden',
  // Health events
  'health.addSickness': 'Legg til sykdom',
  'health.addInjury': 'Legg til skade',
  'health.sickness': 'Sykdom',
  'health.injury': 'Skade',
  'health.newEvent': 'Ny hendelse',
  'health.editEvent': 'Rediger hendelse',
  'health.type': 'Type',
  'health.dateFrom': 'Fra dato',
  'health.dateTo': 'Til dato',
  'health.notes': 'Notater',
  'health.notesPlaceholder': 'Beskrivelse...',
  'health.save': 'Lagre',
  'health.cancel': 'Avbryt',
  'health.add': 'Legg til',
  'health.newSession': 'Ny økt',
  'health.newSicknessInjury': 'Sykdom / Skade',
  'workout.cancel': 'Avbryt',
  'workout.save': 'Lagre',
  'workout.add': 'Legg til',
  'workout.namePlaceholder': 'F.eks. Morgenløp',
  'workout.notesPlaceholder': 'Skriv notater her...',
  'workout.h': 't',
  'workout.min': 'min',

  // Settings
  'settings.title': 'Innstillinger',
  'settings.appearance': 'Utseende',
  'settings.darkMode': 'Mørk modus',
  'settings.colorTheme': 'Fargevalg',
  'settings.accentColor': 'Detaljfarge',
  'settings.sessionColors': 'Økt-farger',
  'settings.tapToChange': 'Trykk på et ikon for å endre fargen.',
  'settings.chooseColor': 'velg farge',
  'settings.preferences': 'Preferanser',
  'settings.firstDayOfWeek': 'Første dag i uken',
  'settings.monday': 'Mandag',
  'settings.sunday': 'Søndag',
  'settings.units': 'Enheter',
  'settings.defaultSessionType': 'Standard økt-type',
  'settings.dangerZone': 'Faresone',
  'settings.deleteAllData': 'Slett all data',
  'settings.deleteAllDataDesc': 'Slett all treningsdata og mål fra denne enheten.',
  'settings.deleteAllDataConfirm': 'Er du sikker på at du vil slette all data? Dette kan ikke angres.',
  'settings.language': 'Språk',
  'settings.languageNo': 'Norsk',
  'settings.languageEn': 'English',
  'settings.account': 'Konto',
  'settings.username': 'Brukernavn',
  'settings.usernamePlaceholder': 'Skriv inn brukernavn',
  'settings.save': 'Lagre',
  'settings.saved': 'Lagret!',
  'settings.signOut': 'Logg ut',
  'settings.signIn': 'Logg inn',
  'settings.notLoggedIn': 'Du er ikke logget inn. Logg inn for å lagre data permanent.',
  'settings.loggedInAs': 'Logget inn som',

  // Theme labels
  'theme.white': 'Hvit', 'theme.orange': 'Oransje', 'theme.blue': 'Blå', 'theme.green': 'Grønn', 'theme.rose': 'Rosa',

  // Accent labels
  'accent.black': 'Svart', 'accent.orange': 'Oransje', 'accent.blue': 'Blå', 'accent.green': 'Grønn',
  'accent.red': 'Rød', 'accent.purple': 'Lilla', 'accent.teal': 'Dus teal', 'accent.rose': 'Dus rosa',
  'accent.slate': 'Skifer', 'accent.amber': 'Amber', 'accent.indigo': 'Indigo', 'accent.sage': 'Salvie',

  // Color preset labels
  'color.green': 'Grønn', 'color.blue': 'Blå', 'color.red': 'Rød', 'color.yellow': 'Gul',
  'color.purple': 'Lilla', 'color.brown': 'Brun', 'color.cyan': 'Cyan', 'color.grey': 'Grå',
  'color.dustyPink': 'Dus rosa', 'color.orange': 'Oransje', 'color.sun': 'Sol', 'color.mint': 'Mint',

  // Common
  'common.cancel': 'Avbryt',
  'common.delete': 'Slett',
  'common.save': 'Lagre',
  'common.edit': 'Rediger',
  'common.add': 'Legg til',
  'common.today': 'I dag',
  'common.yesterday': 'I går',

  // Date formatting
  'date.locale': 'nb-NO',
};

const en: Record<string, string> = {
  // Navigation
  'nav.home': 'Home',
  'nav.calendar': 'Calendar',
  'nav.training': 'Training',
  'nav.community': 'Community',
  'nav.settings': 'Settings',

  // Months
  'month.0': 'January', 'month.1': 'February', 'month.2': 'March', 'month.3': 'April',
  'month.4': 'May', 'month.5': 'June', 'month.6': 'July', 'month.7': 'August',
  'month.8': 'September', 'month.9': 'October', 'month.10': 'November', 'month.11': 'December',
  'month.short.0': 'Jan', 'month.short.1': 'Feb', 'month.short.2': 'Mar', 'month.short.3': 'Apr',
  'month.short.4': 'May', 'month.short.5': 'Jun', 'month.short.6': 'Jul', 'month.short.7': 'Aug',
  'month.short.8': 'Sep', 'month.short.9': 'Oct', 'month.short.10': 'Nov', 'month.short.11': 'Dec',

  // Weekdays
  'weekday.mon': 'M', 'weekday.tue': 'T', 'weekday.wed': 'W', 'weekday.thu': 'T',
  'weekday.fri': 'F', 'weekday.sat': 'S', 'weekday.sun': 'S',

  // Activity types
  'activity.styrke': 'Strength', 'activity.løping': 'Running', 'activity.fjelltur': 'Hiking',
  'activity.svømming': 'Swimming', 'activity.sykling': 'Cycling', 'activity.gå': 'Walking',
  'activity.tennis': 'Tennis', 'activity.yoga': 'Yoga', 'activity.annet': 'Other',

  // Metrics
  'metric.sessions': 'sessions', 'metric.minutes': 'hours', 'metric.distance': 'km', 'metric.elevation': 'm',
  'metric.sessions.label': 'Sessions', 'metric.minutes.label': 'Time', 'metric.distance.label': 'Distance', 'metric.elevation.label': 'Elevation',

  // Home
  'home.last7days': 'Last 7 days',
  'home.goals': 'Goals',
  'home.recentSessions': 'Recent sessions',
  'home.newSession': 'New session',
  'home.editGoal': 'Edit goal',

  // Goals
  'goals.generalGoal': 'General training goal',
  'goals.otherGoals': 'Other goals',
  'goals.addGoal': 'Add goal',
  'goals.noGoalsYet': 'No other goals yet.',
  'goals.setGoal': 'Set your training goal',
  'goals.sessionsPerWeek': 'sessions per week',
  'goals.sessionsPerMonth': 'sessions per month',
  'goals.sessionsPerYear': 'sessions per year',
  'goals.sessionsPer': 'sessions per',
  'goals.perWeek': '/week',
  'goals.perMonth': '/month',
  'goals.perYear': '/year',
  'goals.edit': 'Edit',
  'goals.delete': 'Delete',
  'goals.deleteGoalTitle': 'Delete training goal',
  'goals.deleteGoalDesc': 'Are you sure you want to delete the general training goal? This action cannot be undone.',
  'goals.showOnHome': 'Show on home screen',
  'goals.removeFromHome': 'Remove from home screen',
  'goals.period.week': 'week',
  'goals.period.month': 'month',
  'goals.period.year': 'year',
  'goals.previousGoals': 'Previous goals',
  'goals.ongoing': 'ongoing',
  'goals.updateGoal': 'Update training goal',
  'goals.validFrom': 'Valid from',
  'goals.otherDate': 'Other date',
  'goals.deleteCurrentTitle': 'Delete current goal',
  'goals.deleteCurrentDesc': 'This is your current goal. Do you want to revert to your previous goal or set a new one?',
  'goals.revertToPrevious': 'Revert to previous goal',
  'goals.setNewGoal': 'Set a new goal',

  // Goal card
  'goalCard.thisWeek': 'This week',
  'goalCard.thisMonth': 'This month',
  'goalCard.thisYear': 'This year',
  'goalCard.daysLeft': 'days left',
  'goalCard.reached': '✓ Reached!',
  'goalCard.onTrack': 'On track',
  'goalCard.ahead': 'Ahead of schedule',
  'goalCard.behind': 'Behind schedule',
  'goalCard.remaining': 'remaining',
  'goalCard.deleteTitle': 'Delete goal',
  'goalCard.deleteDesc': 'Are you sure you want to delete this goal? This action cannot be undone.',

  // Goal form
  'goalForm.editGoal': 'Edit goal',
  'goalForm.newGoal': 'New extra goal',
  'goalForm.metricType': 'Metric type',
  'goalForm.period': 'Period',
  'goalForm.activityType': 'Activity type',
  'goalForm.target': 'Target',
  'goalForm.all': 'All',
  'goalForm.week': 'Week',
  'goalForm.month': 'Month',
  'goalForm.year': 'Year',
  'goalForm.custom': 'Custom',
  'goalForm.from': 'From',
  'goalForm.to': 'To',
  'goalForm.cancel': 'Cancel',
  'goalForm.save': 'Save',
  'goalForm.create': 'Create',
  'goalForm.eg': 'e.g.',

  // Primary goal form
  'primaryGoal.setGoal': 'Set training goal',
  'primaryGoal.description': 'How many sessions do you want to train? Choose period and number – the rest is calculated automatically.',
  'primaryGoal.sessionsPerPeriod': 'Sessions per',
  'primaryGoal.startDate': 'Goal start date',
  'primaryGoal.startDateDesc': 'Goal is calculated from this date.',
  'primaryGoal.sessionsPerLabel': 'sessions per',

  // Progress wheel
  'wheel.setGoal': 'Set goal',
  'wheel.onTrack': 'You\'re on track',
  'wheel.ahead': '{n} {unit} ahead of schedule',
  'wheel.behind': '{n} {unit} behind schedule',
  'wheel.session': 'session',
  'wheel.sessions': 'sessions',

  // Stats
  'stats.sessions': 'Sessions',
  'stats.time': 'Time',
  'stats.distance': 'Distance',
  'stats.elevation': 'Elevation',

  // Training subtabs
  'training.statistics': 'Statistics',
  'training.history': 'History',
  'training.goals': 'Goals',

  // Training page
  'training.exportAll': 'Export all sessions',
  'training.importAdd': 'Import (add)',
  'training.importReplace': 'Import (replace all)',
  'training.importReplaceConfirm': '⚠️ This will overwrite all existing sessions. Are you sure?',
  'training.noSessionsFound': 'No sessions found in',
  'training.session': 'session',
  'training.sessions': 'sessions',
  'training.exportSuccess': 'Sessions exported!',
  'training.importSuccess': '{n} new sessions added (duplicates skipped).',
  'training.importReplaceSuccess': 'All sessions replaced with {n} sessions.',
  'training.importError': 'Could not read the file. Check that it is a valid JSON file.',

  // Workout dialog
  'workout.newSession': 'New session',
  'workout.editSession': 'Edit session',
  'workout.type': 'Type',
  'workout.name': 'Session name',
  'workout.optional': 'optional',
  'workout.date': 'Date',
  'workout.duration': 'Duration',
  'workout.distance': 'Distance',
  'workout.distanceKm': 'Distance km',
  'workout.elevation': 'Elevation',
  'workout.notes': 'Notes',
  // Home stats toggle
  'home.thisWeek': 'This week',
  'home.thisMonth': 'This month',
  // Health events
  'health.addSickness': 'Add sickness',
  'health.addInjury': 'Add injury',
  'health.sickness': 'Sickness',
  'health.injury': 'Injury',
  'health.newEvent': 'New event',
  'health.editEvent': 'Edit event',
  'health.type': 'Type',
  'health.dateFrom': 'From date',
  'health.dateTo': 'To date',
  'health.notes': 'Notes',
  'health.notesPlaceholder': 'Description...',
  'health.save': 'Save',
  'health.cancel': 'Cancel',
  'health.add': 'Add',
  'health.newSession': 'New session',
  'health.newSicknessInjury': 'Sickness / Injury',
  'workout.cancel': 'Cancel',
  'workout.save': 'Save',
  'workout.add': 'Add',
  'workout.namePlaceholder': 'E.g. Morning run',
  'workout.notesPlaceholder': 'Write notes here...',
  'workout.h': 'h',
  'workout.min': 'min',

  // Settings
  'settings.title': 'Settings',
  'settings.appearance': 'Appearance',
  'settings.darkMode': 'Dark mode',
  'settings.colorTheme': 'Color theme',
  'settings.accentColor': 'Accent color',
  'settings.sessionColors': 'Session colors',
  'settings.tapToChange': 'Tap an icon to change its color.',
  'settings.chooseColor': 'choose color',
  'settings.preferences': 'Preferences',
  'settings.firstDayOfWeek': 'First day of week',
  'settings.monday': 'Monday',
  'settings.sunday': 'Sunday',
  'settings.units': 'Units',
  'settings.defaultSessionType': 'Default session type',
  'settings.dangerZone': 'Danger zone',
  'settings.deleteAllData': 'Delete all data',
  'settings.deleteAllDataDesc': 'Delete all training data and goals from this device.',
  'settings.deleteAllDataConfirm': 'Are you sure you want to delete all data? This cannot be undone.',
  'settings.language': 'Language',
  'settings.languageNo': 'Norsk',
  'settings.languageEn': 'English',
  'settings.account': 'Account',
  'settings.username': 'Username',
  'settings.usernamePlaceholder': 'Enter username',
  'settings.save': 'Save',
  'settings.saved': 'Saved!',
  'settings.signOut': 'Sign out',
  'settings.signIn': 'Sign in',
  'settings.notLoggedIn': 'You are not signed in. Sign in to save your data permanently.',
  'settings.loggedInAs': 'Signed in as',

  // Theme labels
  'theme.white': 'White', 'theme.orange': 'Orange', 'theme.blue': 'Blue', 'theme.green': 'Green', 'theme.rose': 'Rose',

  // Accent labels
  'accent.black': 'Black', 'accent.orange': 'Orange', 'accent.blue': 'Blue', 'accent.green': 'Green',
  'accent.red': 'Red', 'accent.purple': 'Purple', 'accent.teal': 'Soft teal', 'accent.rose': 'Soft rose',
  'accent.slate': 'Slate', 'accent.amber': 'Amber', 'accent.indigo': 'Indigo', 'accent.sage': 'Sage',

  // Color preset labels
  'color.green': 'Green', 'color.blue': 'Blue', 'color.red': 'Red', 'color.yellow': 'Yellow',
  'color.purple': 'Purple', 'color.brown': 'Brown', 'color.cyan': 'Cyan', 'color.grey': 'Grey',
  'color.dustyPink': 'Dusty pink', 'color.orange': 'Orange', 'color.sun': 'Sun', 'color.mint': 'Mint',

  // Common
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.save': 'Save',
  'common.edit': 'Edit',
  'common.add': 'Add',
  'common.today': 'Today',
  'common.yesterday': 'Yesterday',

  // Date formatting
  'date.locale': 'en-US',
};

export const translations: Record<Language, Record<string, string>> = { no, en };
