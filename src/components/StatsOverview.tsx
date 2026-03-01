import { Activity, Clock, MapPin, TrendingUp } from 'lucide-react';
import { WeeklyStats } from '@/types/workout';
import { formatDuration } from '@/utils/workoutUtils';

interface StatsOverviewProps {
  stats: WeeklyStats;
  compact?: boolean;
}

const StatsOverview = ({ stats, compact }: StatsOverviewProps) => {
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
    {
      label: 'Høydemeter',
      value: `${Math.round(stats.totalElevation || 0)} m`,
      icon: TrendingUp,
      accent: 'text-warning',
    },
  ];

  return (
    <div className={compact ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-4 gap-2'}>
      {statCards.map((stat) => (
        <div key={stat.label} className={`glass-card rounded-lg ${compact ? 'p-2' : 'p-3'}`}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <stat.icon className={`w-3 h-3 ${stat.accent}`} />
            <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </span>
          </div>
          <p className={`font-display font-bold ${compact ? 'text-sm' : 'text-lg'}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsOverview;
