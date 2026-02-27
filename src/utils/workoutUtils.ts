import { SessionType } from '@/types/workout';
import { 
  Dumbbell, 
  PersonStanding, 
  Bike, 
  Waves, 
  Flower2, 
  Zap, 
  Footprints, 
  Mountain,
  CircleDot 
} from 'lucide-react';

interface SessionTypeConfig {
  label: string;
  icon: typeof Dumbbell;
  color: string; // tailwind bg class using design tokens
}

export const sessionTypeConfig: Record<SessionType, SessionTypeConfig> = {
  strength: {
    label: 'Styrke',
    icon: Dumbbell,
    color: 'bg-primary text-primary-foreground',
  },
  running: {
    label: 'Løping',
    icon: PersonStanding,
    color: 'bg-success text-success-foreground',
  },
  cycling: {
    label: 'Sykling',
    icon: Bike,
    color: 'bg-accent text-accent-foreground',
  },
  swimming: {
    label: 'Svømming',
    icon: Waves,
    color: 'bg-accent text-accent-foreground',
  },
  yoga: {
    label: 'Yoga',
    icon: Flower2,
    color: 'bg-warning text-warning-foreground',
  },
  hiit: {
    label: 'HIIT',
    icon: Zap,
    color: 'bg-destructive text-destructive-foreground',
  },
  walking: {
    label: 'Gange',
    icon: Footprints,
    color: 'bg-success text-success-foreground',
  },
  skiing: {
    label: 'Ski',
    icon: Mountain,
    color: 'bg-accent text-accent-foreground',
  },
  other: {
    label: 'Annet',
    icon: CircleDot,
    color: 'bg-muted text-muted-foreground',
  },
};

export const feelingLabels: Record<number, string> = {
  1: '😫',
  2: '😕',
  3: '😐',
  4: '😊',
  5: '🔥',
};

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}t`;
  return `${h}t ${m}m`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'I dag';
  if (diffDays === 1) return 'I går';
  if (diffDays < 7) return `${diffDays} dager siden`;
  
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}
