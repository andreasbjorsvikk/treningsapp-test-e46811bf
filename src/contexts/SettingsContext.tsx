import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SessionType } from '@/types/workout';
import { defaultTypeColors } from '@/utils/workoutUtils';

export type AccentColor = 'orange' | 'blue' | 'green' | 'purple' | 'rose' | 'teal';
export type FirstDayOfWeek = 'monday' | 'sunday';
export type UnitSystem = 'metric' | 'imperial';

export interface AppSettings {
  darkMode: boolean;
  accentColor: AccentColor;
  firstDayOfWeek: FirstDayOfWeek;
  unitSystem: UnitSystem;
  defaultSessionType: SessionType;
  sessionTypeColors: Record<SessionType, string>;
}

const defaultSettings: AppSettings = {
  darkMode: true,
  accentColor: 'orange',
  firstDayOfWeek: 'monday',
  unitSystem: 'metric',
  defaultSessionType: 'styrke',
  sessionTypeColors: { ...defaultTypeColors },
};

const ACCENT_COLORS: Record<AccentColor, { label: string; hsl: string; glow: string; swatch: string }> = {
  orange: { label: 'Oransje', hsl: '24 95% 53%', glow: '24 100% 60%', swatch: '#f97316' },
  blue:   { label: 'Blå',     hsl: '217 91% 60%', glow: '217 100% 68%', swatch: '#3b82f6' },
  green:  { label: 'Grønn',   hsl: '152 60% 42%', glow: '152 70% 50%', swatch: '#22c55e' },
  purple: { label: 'Lilla',   hsl: '270 70% 55%', glow: '270 80% 65%', swatch: '#a855f7' },
  rose:   { label: 'Rosa',    hsl: '340 75% 55%', glow: '340 85% 65%', swatch: '#f43f5e' },
  teal:   { label: 'Teal',    hsl: '180 60% 40%', glow: '180 70% 50%', swatch: '#14b8a6' },
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  accentColors: typeof ACCENT_COLORS;
  getTypeColor: (type: SessionType) => string;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem('treningslogg_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...defaultSettings,
          ...parsed,
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

  // Apply accent color CSS vars
  useEffect(() => {
    const accent = ACCENT_COLORS[settings.accentColor];
    const root = document.documentElement;
    root.style.setProperty('--primary', accent.hsl);
    root.style.setProperty('--ring', accent.hsl);
    root.style.setProperty('--energy', accent.hsl);
    root.style.setProperty('--energy-glow', accent.glow);
  }, [settings.accentColor]);

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
    <SettingsContext.Provider value={{ settings, updateSettings, accentColors: ACCENT_COLORS, getTypeColor }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
