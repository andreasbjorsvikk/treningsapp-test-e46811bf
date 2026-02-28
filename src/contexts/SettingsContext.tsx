import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SessionType } from '@/types/workout';
import { defaultTypeColors } from '@/utils/workoutUtils';

export type AppColorTheme = 'white' | 'orange' | 'blue' | 'green' | 'rose';
export type FirstDayOfWeek = 'monday' | 'sunday';
export type UnitSystem = 'metric' | 'imperial';

export interface AppSettings {
  darkMode: boolean;
  colorTheme: AppColorTheme;
  firstDayOfWeek: FirstDayOfWeek;
  unitSystem: UnitSystem;
  defaultSessionType: SessionType;
  sessionTypeColors: Record<SessionType, string>;
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

const defaultSettings: AppSettings = {
  darkMode: true,
  colorTheme: 'orange',
  firstDayOfWeek: 'monday',
  unitSystem: 'metric',
  defaultSessionType: 'styrke',
  sessionTypeColors: { ...defaultTypeColors },
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  appThemes: typeof APP_THEMES;
  getTypeColor: (type: SessionType) => string;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('treningslogg_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old accentColor to colorTheme
        const colorTheme = parsed.colorTheme || parsed.accentColor || defaultSettings.colorTheme;
        return {
          ...defaultSettings,
          ...parsed,
          colorTheme: ['white', 'orange', 'blue', 'green', 'rose'].includes(colorTheme) ? colorTheme : 'orange',
          sessionTypeColors: { ...defaultTypeColors, ...(parsed.sessionTypeColors || {}) },
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

  // Persist
  useEffect(() => {
    localStorage.setItem('treningslogg_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  };

  const getTypeColor = (type: SessionType) => {
    return settings.sessionTypeColors[type] || defaultTypeColors[type];
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, appThemes: APP_THEMES, getTypeColor }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
