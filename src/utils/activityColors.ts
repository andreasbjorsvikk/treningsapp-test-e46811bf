import { SessionType } from '@/types/workout';

export interface ActivityColorSet {
  bg: string;       // cell background
  text: string;     // text & icon color
  badge: string;    // badge background
}

export interface ActivityColors {
  light: ActivityColorSet;
  dark: ActivityColorSet;
}

export const defaultActivityColorMap: Partial<Record<SessionType, ActivityColors>> = {
  fjelltur: {
    light: { bg: 'rgb(212,242,184)', text: 'rgb(47,107,69)', badge: 'rgb(225,248,206)' },
    dark:  { bg: 'rgb(105,162,85)',  text: '#ffffff',        badge: '#1f3a2a' },
  },
  sykling: {
    light: { bg: 'rgb(255,212,214)', text: 'rgb(122,15,15)', badge: 'rgb(255,230,231)' },
    dark:  { bg: 'rgb(176,78,83)',   text: '#ffffff',         badge: '#7a0f0f' },
  },
  løping: {
    light: { bg: 'rgb(210,229,255)', text: 'rgb(42,93,168)', badge: 'rgb(228,240,255)' },
    dark:  { bg: 'rgb(77,120,179)',  text: '#ffffff',         badge: '#1c2f4a' },
  },
  gå: {
    light: { bg: 'rgb(232,212,195)', text: 'rgb(75,46,31)',  badge: 'rgb(242,228,217)' },
    dark:  { bg: 'rgb(149,115,86)',  text: '#ffffff',         badge: '#423122' },
  },
  svømming: {
    light: { bg: 'rgb(229,247,255)', text: '#3f6fa8',        badge: 'rgb(240,251,255)' },
    dark:  { bg: 'rgb(105,172,203)', text: '#ffffff',         badge: '#345260' },
  },
  styrke: {
    light: { bg: 'rgb(212,212,216)', text: '#000000',        badge: 'rgb(228,228,232)' },
    dark:  { bg: 'rgb(98,100,104)',  text: '#ffffff',         badge: '#313030' },
  },
  tennis: {
    light: { bg: 'rgb(249,230,183)', text: '#734402', badge: 'rgb(255,238,190)' },
    dark:  { bg: 'rgb(191,144,66)',  text: '#ffffff',         badge: '#492d12' },
  },
  yoga: {
    light: { bg: 'rgb(241,217,252)', text: 'rgb(121,11,150)', badge: 'rgb(245,230,255)' },
    dark:  { bg: 'rgb(141,105,149)',  text: '#ffffff',          badge: '#3e0f50' },
  },
  fotball: {
    light: { bg: 'rgb(220,240,200)', text: 'rgb(55,100,40)', badge: 'rgb(232,248,215)' },
    dark:  { bg: 'rgb(90,140,70)',   text: '#ffffff',         badge: '#2a4a1f' },
  },
  trappemaskin: {
    light: { bg: 'rgb(255,230,180)', text: 'rgb(140,75,5)', badge: 'rgb(255,240,200)' },
    dark:  { bg: 'rgb(185,130,45)',  text: '#ffffff',        badge: '#4a3510' },
  },
  annet: {
    light: { bg: 'rgb(220,220,224)', text: '#444444',        badge: 'rgb(232,232,236)' },
    dark:  { bg: 'rgb(90,90,94)',    text: '#ffffff',         badge: '#2a2a2e' },
  },
};

// Mutable runtime map – initialized from defaults, overridden by user settings
export const activityColorMap: Partial<Record<SessionType, ActivityColors>> = { ...defaultActivityColorMap };

// Restore saved color overrides from localStorage
export function restoreActivityColors() {
  try {
    const saved = localStorage.getItem('treningslogg_activity_colors');
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<Record<SessionType, ActivityColors>>;
      Object.assign(activityColorMap, parsed);
    }
  } catch {}
}

// Save current color overrides to localStorage (only non-default entries)
export function saveActivityColors() {
  const overrides: Partial<Record<SessionType, ActivityColors>> = {};
  for (const [type, colors] of Object.entries(activityColorMap)) {
    const def = defaultActivityColorMap[type as SessionType];
    if (colors && (!def || JSON.stringify(colors) !== JSON.stringify(def))) {
      overrides[type as SessionType] = colors;
    }
  }
  if (Object.keys(overrides).length > 0) {
    localStorage.setItem('treningslogg_activity_colors', JSON.stringify(overrides));
  } else {
    localStorage.removeItem('treningslogg_activity_colors');
  }
}

// Apply overrides from database (full ActivityColors structure)
export function applyActivityColorOverrides(dbColors: Record<string, any>) {
  for (const [type, colorData] of Object.entries(dbColors)) {
    if (colorData && typeof colorData === 'object' && 'light' in colorData && 'dark' in colorData) {
      // Full ActivityColors structure from DB
      (activityColorMap as any)[type] = colorData;
    }
  }
}

// Get overrides to save to DB (only non-default entries as full ActivityColors)
export function getActivityColorOverrides(): Record<string, ActivityColors> {
  const overrides: Record<string, ActivityColors> = {};
  for (const [type, colors] of Object.entries(activityColorMap)) {
    const def = defaultActivityColorMap[type as SessionType];
    if (colors && (!def || JSON.stringify(colors) !== JSON.stringify(def))) {
      overrides[type] = colors;
    }
  }
  return overrides;
}

export function getActivityColors(type: SessionType, isDark: boolean): ActivityColorSet {
  const colors = activityColorMap[type];
  if (!colors) {
    return isDark
      ? { bg: 'rgb(90,90,94)', text: '#ffffff', badge: '#2a2a2e' }
      : { bg: 'rgb(220,220,224)', text: '#444444', badge: 'rgb(232,232,236)' };
  }
  return isDark ? colors.dark : colors.light;
}