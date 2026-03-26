import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { SessionType } from '@/types/workout';
import { defaultTypeColors, allSessionTypes } from '@/utils/workoutUtils';
import { supabase } from '@/integrations/supabase/client';
import { activityColorMap, applyActivityColorOverrides, getActivityColorOverrides, defaultActivityColorMap, saveActivityColors } from '@/utils/activityColors';
import type { Language } from '@/i18n/translations';

export type AppColorTheme = 'white' | 'orange' | 'blue' | 'green' | 'rose';
export type AccentColor = 'black' | 'orange' | 'blue' | 'green' | 'red' | 'purple' | 'teal' | 'rose' | 'slate' | 'amber' | 'indigo' | 'sage';
export type FirstDayOfWeek = 'monday' | 'sunday';
export type UnitSystem = 'metric' | 'imperial';

export type PrivacyLevel = 'me' | 'friends' | 'selected';

export interface AppSettings {
  darkMode: boolean;
  colorTheme: AppColorTheme;
  accentColor: AccentColor;
  firstDayOfWeek: FirstDayOfWeek;
  unitSystem: UnitSystem;
  defaultSessionType: SessionType;
  sessionTypeColors: Record<SessionType, string>;
  language: Language;
  showPrimaryWheelsOnHome: boolean;
  disabledSessionTypes: SessionType[];
  privacyWorkouts: PrivacyLevel;
  privacyStats: PrivacyLevel;
  privacyGoals: PrivacyLevel;
  privacyPeakCheckins: PrivacyLevel;
  pinnedChallengeIds: string[];
  homeSectionOrder: string[];
  weeklyReportEnabled: boolean;
  monthlyReportEnabled: boolean;
}

interface ThemeColors {
  label: string;
  swatch: string;
  swatchDark: string;
  light: { background: string; card: string; border: string; muted: string };
  dark: { background: string; card: string; border: string; muted: string };
}

export const APP_THEMES: Record<AppColorTheme, ThemeColors> = {
  white: {
    label: 'Hvit',
    swatch: 'hsl(0, 0%, 96%)',
    swatchDark: 'hsl(0, 0%, 12%)',
    light: { background: '0 0% 97%', card: '0 0% 100%', border: '0 0% 90%', muted: '0 0% 95%' },
    dark: { background: '0 0% 8%', card: '0 0% 12%', border: '0 0% 18%', muted: '0 0% 15%' },
  },
  orange: {
    label: 'Oransje',
    swatch: 'hsl(30, 55%, 88%)',
    swatchDark: 'hsl(25, 30%, 13%)',
    light: { background: '30 40% 94%', card: '30 25% 97%', border: '30 20% 88%', muted: '30 20% 92%' },
    dark: { background: '25 25% 9%', card: '25 20% 13%', border: '25 18% 18%', muted: '25 18% 15%' },
  },
  blue: {
    label: 'Blå',
    swatch: 'hsl(210, 55%, 88%)',
    swatchDark: 'hsl(215, 30%, 13%)',
    light: { background: '210 45% 94%', card: '210 30% 97%', border: '210 25% 88%', muted: '210 25% 92%' },
    dark: { background: '215 30% 9%', card: '215 25% 13%', border: '215 20% 18%', muted: '215 20% 15%' },
  },
  green: {
    label: 'Grønn',
    swatch: 'hsl(150, 40%, 87%)',
    swatchDark: 'hsl(155, 25%, 13%)',
    light: { background: '150 35% 93%', card: '150 22% 97%', border: '150 20% 87%', muted: '150 18% 91%' },
    dark: { background: '155 25% 9%', card: '155 20% 13%', border: '155 18% 18%', muted: '155 18% 15%' },
  },
  rose: {
    label: 'Rosa',
    swatch: 'hsl(340, 50%, 90%)',
    swatchDark: 'hsl(340, 25%, 13%)',
    light: { background: '340 40% 94%', card: '340 25% 97%', border: '340 20% 88%', muted: '340 18% 92%' },
    dark: { background: '340 25% 9%', card: '340 20% 13%', border: '340 18% 18%', muted: '340 18% 15%' },
  },
};

interface AccentPreset {
  label: string;
  swatch: string;
  light: { primary: string; energy: string; energyGlow: string };
  dark: { primary: string; energy: string; energyGlow: string };
}

export const ACCENT_PRESETS: Record<AccentColor, AccentPreset> = {
  black: {
    label: 'Svart',
    swatch: 'hsl(0, 0%, 15%)',
    light: { primary: '0 0% 15%', energy: '0 0% 15%', energyGlow: '0 0% 25%' },
    dark: { primary: '0 0% 85%', energy: '0 0% 85%', energyGlow: '0 0% 75%' },
  },
  orange: {
    label: 'Oransje',
    swatch: 'hsl(24, 95%, 53%)',
    light: { primary: '24 95% 53%', energy: '24 95% 53%', energyGlow: '24 100% 60%' },
    dark: { primary: '24 95% 53%', energy: '24 95% 53%', energyGlow: '24 100% 65%' },
  },
  blue: {
    label: 'Blå',
    swatch: 'hsl(210, 80%, 50%)',
    light: { primary: '210 80% 50%', energy: '210 80% 50%', energyGlow: '210 85% 60%' },
    dark: { primary: '210 80% 60%', energy: '210 80% 60%', energyGlow: '210 85% 70%' },
  },
  green: {
    label: 'Grønn',
    swatch: 'hsl(150, 60%, 40%)',
    light: { primary: '150 60% 40%', energy: '150 60% 40%', energyGlow: '150 65% 50%' },
    dark: { primary: '150 60% 50%', energy: '150 60% 50%', energyGlow: '150 65% 60%' },
  },
  red: {
    label: 'Rød',
    swatch: 'hsl(0, 75%, 50%)',
    light: { primary: '0 75% 50%', energy: '0 75% 50%', energyGlow: '0 80% 60%' },
    dark: { primary: '0 75% 55%', energy: '0 75% 55%', energyGlow: '0 80% 65%' },
  },
  purple: {
    label: 'Lilla',
    swatch: 'hsl(270, 60%, 50%)',
    light: { primary: '270 60% 50%', energy: '270 60% 50%', energyGlow: '270 65% 60%' },
    dark: { primary: '270 60% 65%', energy: '270 60% 65%', energyGlow: '270 65% 75%' },
  },
  teal: {
    label: 'Dus teal',
    swatch: 'hsl(175, 35%, 48%)',
    light: { primary: '175 35% 42%', energy: '175 35% 42%', energyGlow: '175 40% 55%' },
    dark: { primary: '175 35% 55%', energy: '175 35% 55%', energyGlow: '175 40% 65%' },
  },
  rose: {
    label: 'Dus rosa',
    swatch: 'hsl(345, 45%, 60%)',
    light: { primary: '345 40% 52%', energy: '345 40% 52%', energyGlow: '345 45% 62%' },
    dark: { primary: '345 40% 62%', energy: '345 40% 62%', energyGlow: '345 45% 72%' },
  },
  slate: {
    label: 'Skifer',
    swatch: 'hsl(215, 20%, 45%)',
    light: { primary: '215 20% 40%', energy: '215 20% 40%', energyGlow: '215 25% 52%' },
    dark: { primary: '215 20% 65%', energy: '215 20% 65%', energyGlow: '215 25% 75%' },
  },
  amber: {
    label: 'Amber',
    swatch: 'hsl(38, 70%, 50%)',
    light: { primary: '38 70% 45%', energy: '38 70% 45%', energyGlow: '38 75% 55%' },
    dark: { primary: '38 70% 55%', energy: '38 70% 55%', energyGlow: '38 75% 65%' },
  },
  indigo: {
    label: 'Indigo',
    swatch: 'hsl(235, 50%, 55%)',
    light: { primary: '235 50% 50%', energy: '235 50% 50%', energyGlow: '235 55% 62%' },
    dark: { primary: '235 50% 65%', energy: '235 50% 65%', energyGlow: '235 55% 75%' },
  },
  sage: {
    label: 'Salvie',
    swatch: 'hsl(140, 20%, 50%)',
    light: { primary: '140 20% 42%', energy: '140 20% 42%', energyGlow: '140 25% 55%' },
    dark: { primary: '140 20% 58%', energy: '140 20% 58%', energyGlow: '140 25% 68%' },
  },
};

const defaultSettings: AppSettings = {
  darkMode: false,
  colorTheme: 'white',
  accentColor: 'black',
  firstDayOfWeek: 'monday',
  unitSystem: 'metric',
  defaultSessionType: 'styrke',
  sessionTypeColors: { ...defaultTypeColors },
  language: 'no',
  showPrimaryWheelsOnHome: true,
  disabledSessionTypes: [],
  privacyWorkouts: 'me',
  privacyStats: 'me',
  privacyGoals: 'me',
  privacyPeakCheckins: 'friends',
  pinnedChallengeIds: [],
  homeSectionOrder: ['wheels', 'activity', 'stats', 'challenges', 'extraGoals'],
  weeklyReportEnabled: true,
  monthlyReportEnabled: true,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  appThemes: typeof APP_THEMES;
  accentPresets: typeof ACCENT_PRESETS;
  getTypeColor: (type: SessionType) => string;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('treningslogg_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        const colorTheme = parsed.colorTheme || 'orange';
        return {
          ...defaultSettings,
          ...parsed,
          colorTheme: ['white', 'orange', 'blue', 'green', 'rose'].includes(colorTheme) ? colorTheme : 'orange',
          accentColor: ['black', 'orange', 'blue', 'green', 'red', 'purple', 'teal', 'rose', 'slate', 'amber', 'indigo', 'sage'].includes(parsed.accentColor) ? parsed.accentColor : 'black',
          sessionTypeColors: { ...defaultTypeColors, ...(parsed.sessionTypeColors || {}) },
          language: ['no', 'en'].includes(parsed.language) ? parsed.language : 'no',
          showPrimaryWheelsOnHome: parsed.showPrimaryWheelsOnHome !== false,
          disabledSessionTypes: Array.isArray(parsed.disabledSessionTypes) ? parsed.disabledSessionTypes : [],
        };
      }
    } catch {}
    return defaultSettings;
  });

  // Apply dark mode class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.darkMode);
  }, [settings.darkMode]);

  // Apply color theme CSS vars
  useEffect(() => {
    const theme = APP_THEMES[settings.colorTheme];
    const mode = settings.darkMode ? theme.dark : theme.light;
    const root = document.documentElement;
    root.style.setProperty('--background', mode.background);
    root.style.setProperty('--card', mode.card);
    root.style.setProperty('--popover', mode.card);
    root.style.setProperty('--border', mode.border);
    root.style.setProperty('--input', mode.border);
    root.style.setProperty('--muted', mode.muted);
  }, [settings.colorTheme, settings.darkMode]);

  // Apply accent color CSS vars
  useEffect(() => {
    const accent = ACCENT_PRESETS[settings.accentColor];
    const mode = settings.darkMode ? accent.dark : accent.light;
    const root = document.documentElement;
    root.style.setProperty('--primary', mode.primary);
    root.style.setProperty('--energy', mode.energy);
    root.style.setProperty('--energy-glow', mode.energyGlow);
    root.style.setProperty('--ring', mode.primary);
  }, [settings.accentColor, settings.darkMode]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('treningslogg_settings', JSON.stringify(settings));
  }, [settings]);

  // Load session type colors from database on auth
  const [dbColorsLoaded, setDbColorsLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const loadDbColors = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || cancelled) return;
      const { data } = await supabase
        .from('profiles')
        .select('session_type_colors')
        .eq('id', session.user.id)
        .single();
      if (cancelled) return;
      if (data?.session_type_colors && typeof data.session_type_colors === 'object') {
        const dbColors = data.session_type_colors as Record<string, any>;
        // Check if it's the new format (full ActivityColors with light/dark)
        const firstValue = Object.values(dbColors)[0];
        if (firstValue && typeof firstValue === 'object' && 'light' in firstValue) {
          // New format: full ActivityColors structure
          applyActivityColorOverrides(dbColors);
          saveActivityColors(); // sync to localStorage
        } else {
          // Old format: simple hex strings - just update sessionTypeColors
          setSettings(prev => ({
            ...prev,
            sessionTypeColors: { ...defaultTypeColors, ...dbColors },
          }));
        }
      }
      setDbColorsLoaded(true);
    };
    loadDbColors();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadDbColors();
      else setDbColorsLoaded(false);
    });

    return () => { cancelled = true; subscription.unsubscribe(); };
  }, []);

  // Save session type colors to database when changed (debounced)
  const colorsRef = useCallback((colors: Record<SessionType, string>) => colors, []);
  useEffect(() => {
    if (!dbColorsLoaded) return;
    const timer = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      // Save full ActivityColors structure (light/dark) to DB
      const overrides = getActivityColorOverrides();
      await supabase
        .from('profiles')
        .update({ session_type_colors: Object.keys(overrides).length > 0 ? overrides : null } as any)
        .eq('id', session.user.id);
    }, 1000);
    return () => clearTimeout(timer);
  }, [settings.sessionTypeColors, dbColorsLoaded]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  };

  const getTypeColor = (type: SessionType) => {
    return settings.sessionTypeColors[type] || defaultTypeColors[type];
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, appThemes: APP_THEMES, accentPresets: ACCENT_PRESETS, getTypeColor }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}
