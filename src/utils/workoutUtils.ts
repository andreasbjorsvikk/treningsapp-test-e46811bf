import { SessionType } from '@/types/workout';
import { 
  Dumbbell, 
  PersonStanding, 
  Mountain, 
  Waves, 
  Bike, 
  Footprints, 
  CircleDot,
  Flower2,
  Trophy
} from 'lucide-react';

interface SessionTypeConfig {
  label: string;
  icon: typeof Dumbbell;
  color: string;
}

// Default muted colors per type (bg class + text)
export const defaultTypeColors: Record<SessionType, string> = {
  styrke:   '#9ca3af', // grey
  løping:   '#60a5fa', // blue
  fjelltur: '#4ade80', // green
  svømming: '#67e8f9', // light blue
  sykling:  '#f87171', // red
  gå:       '#a3866a', // brown
  tennis:   '#fb923c', // orange
  yoga:     '#c084fc', // purple
  fotball:  '#4ade80', // green
  trappemaskin: '#f59e0b', // amber
  annet:    '#a1a1aa', // zinc
};

export const typeColorOptions: { label: string; value: string }[] = [
  { label: 'Grå',     value: '#9ca3af' },
  { label: 'Blå',     value: '#60a5fa' },
  { label: 'Grønn',   value: '#4ade80' },
  { label: 'Lys blå', value: '#67e8f9' },
  { label: 'Rød',     value: '#f87171' },
  { label: 'Brun',    value: '#a3866a' },
  { label: 'Oransje', value: '#fb923c' },
  { label: 'Lilla',   value: '#c084fc' },
  { label: 'Gul',     value: '#fbbf24' },
  { label: 'Rosa',    value: '#f472b6' },
  { label: 'Teal',    value: '#2dd4bf' },
  { label: 'Sink',    value: '#a1a1aa' },
];

export const sessionTypeConfig: Record<SessionType, SessionTypeConfig> = {
  styrke: {
    label: 'Styrke',
    icon: Dumbbell,
    color: 'bg-primary text-primary-foreground',
  },
  løping: {
    label: 'Løping',
    icon: PersonStanding,
    color: 'bg-success text-success-foreground',
  },
  fjelltur: {
    label: 'Fjelltur',
    icon: Mountain,
    color: 'bg-accent text-accent-foreground',
  },
  svømming: {
    label: 'Svømming',
    icon: Waves,
    color: 'bg-accent text-accent-foreground',
  },
  sykling: {
    label: 'Sykling',
    icon: Bike,
    color: 'bg-warning text-warning-foreground',
  },
  gå: {
    label: 'Gå',
    icon: Footprints,
    color: 'bg-success text-success-foreground',
  },
  tennis: {
    label: 'Tennis',
    icon: Trophy,
    color: 'bg-primary text-primary-foreground',
  },
  yoga: {
    label: 'Yoga',
    icon: Flower2,
    color: 'bg-warning text-warning-foreground',
  },
  fotball: {
    label: 'Fotball',
    icon: CircleDot,
    color: 'bg-success text-success-foreground',
  },
  annet: {
    label: 'Annet',
    icon: CircleDot,
    color: 'bg-muted text-muted-foreground',
  },
};

export const allSessionTypes: SessionType[] = [
  'styrke', 'løping', 'fjelltur', 'svømming', 'sykling', 'gå', 'tennis', 'yoga', 'fotball', 'annet'
];

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I går';
  
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}
