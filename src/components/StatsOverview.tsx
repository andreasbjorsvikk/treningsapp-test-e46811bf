import { Activity, Clock, MapPin } from 'lucide-react';
import { WeeklyStats } from '@/types/workout';
import { formatDuration } from '@/utils/workoutUtils';

interface StatsOverviewProps {
  stats: WeeklyStats;
}

const StatsOverview = ({ stats }: StatsOverviewProps) => {
  const statCards = [
    {
      label: 'Økter',
      value: stats.totalSessions.toString(),
      icon: Activity,
      accent: 'text-primary',
    },
    {
      label: 'Tid',
      value: formatDuration(stats.totalMinutes),
      icon: Clock,
      accent: 'text-accent',
    },
    {
      label: 'Distanse',
      value: `${stats.totalDistance.toFixed(1)} km`,
      icon: MapPin,
      accent: 'text-success',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {statCards.map((stat) => (
        <div key={stat.label} className="glass-card rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <stat.icon className={`w-4 h-4 ${stat.accent}`} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </span>
          </div>
          <p className="text-2xl font-display font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsOverview;
