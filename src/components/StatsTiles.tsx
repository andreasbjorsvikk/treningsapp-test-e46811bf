import { Activity, Clock, MapPin, TrendingUp } from 'lucide-react';
import { WorkoutSession } from '@/types/workout';
import { formatDuration } from '@/utils/workoutUtils';

interface StatsTilesProps {
  sessions: WorkoutSession[];
}

const StatsTiles = ({ sessions }: StatsTilesProps) => {
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const totalDistance = sessions.reduce((sum, s) => sum + (s.distance || 0), 0);
  const totalElevation = sessions.reduce((sum, s) => sum + (s.elevationGain || 0), 0);

  const tiles = [
    { label: 'Økter', value: totalSessions.toString(), icon: Activity, accent: 'text-primary' },
    { label: 'Total tid', value: formatDuration(totalMinutes), icon: Clock, accent: 'text-accent' },
    { label: 'Distanse', value: `${totalDistance.toFixed(1)} km`, icon: MapPin, accent: 'text-success' },
    { label: 'Høydemeter', value: `${Math.round(totalElevation)} m`, icon: TrendingUp, accent: 'text-warning' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {tiles.map((tile) => (
        <div key={tile.label} className="glass-card rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <tile.icon className={`w-4 h-4 ${tile.accent}`} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {tile.label}
            </span>
          </div>
          <p className="text-2xl font-display font-bold">{tile.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsTiles;
