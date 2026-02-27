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
    label: 'Gange',
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
  annet: {
    label: 'Annet',
    icon: CircleDot,
    color: 'bg-muted text-muted-foreground',
  },
};

export const allSessionTypes: SessionType[] = [
  'styrke', 'løping', 'fjelltur', 'svømming', 'sykling', 'gå', 'tennis', 'yoga', 'annet'
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
  if (diffDays < 7) return `${diffDays} dager siden`;
  
  return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}
