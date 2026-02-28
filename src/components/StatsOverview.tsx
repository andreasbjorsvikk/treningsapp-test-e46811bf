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
    <div className="grid grid-cols-3 gap-2">
      {statCards.map((stat) => (
        <div key={stat.label} className="glass-card rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <stat.icon className={`w-3.5 h-3.5 ${stat.accent}`} />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </span>
          </div>
          <p className="text-xl font-display font-bold">{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsOverview;
