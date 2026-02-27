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
    <div className="grid grid-cols-4 gap-2">
      {tiles.map((tile) => (
        <div key={tile.label} className="glass-card rounded-lg p-3 flex flex-col items-center text-center">
          <tile.icon className={`w-4 h-4 ${tile.accent} mb-1`} />
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
            {tile.label}
          </span>
          <p className="text-sm font-display font-bold leading-tight">{tile.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsTiles;
