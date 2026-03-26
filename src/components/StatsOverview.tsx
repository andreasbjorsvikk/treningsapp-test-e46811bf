import { Activity, Clock, MapPin, TrendingUp } from 'lucide-react';
import { WeeklyStats } from '@/types/workout';
import { formatDuration } from '@/utils/workoutUtils';
import { useTranslation } from '@/i18n/useTranslation';

interface StatsOverviewProps {
  stats: WeeklyStats;
  compact?: boolean;
  onClick?: () => void;
}

const StatsOverview = ({ stats, compact, onClick }: StatsOverviewProps) => {
  const { t } = useTranslation();

  const statCards = [
    { label: t('stats.sessions'), value: stats.totalSessions.toString(), icon: Activity, accent: 'text-primary' },
    { label: t('stats.time'), value: formatDuration(stats.totalMinutes), icon: Clock, accent: 'text-accent' },
    { label: t('stats.distance'), value: `${stats.totalDistance.toFixed(1)} km`, icon: MapPin, accent: 'text-success' },
    { label: t('stats.elevation'), value: `${Math.round(stats.totalElevation || 0)} m`, icon: TrendingUp, accent: 'text-warning' },
  ];

  return (
    <div className={compact ? 'grid grid-cols-2 gap-1.5' : 'grid grid-cols-4 gap-2'}>
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className={`glass-card card-gradient rounded-lg ${compact ? 'p-2' : 'p-3'} shadow-md ${onClick ? 'cursor-pointer hover:brightness-95 dark:hover:brightness-110 transition-all' : ''}`}
          onClick={onClick}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <stat.icon className={`w-3.5 h-3.5 ${stat.accent}`} />
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {stat.label}
            </span>
          </div>
          <p className={`font-display font-bold ${compact ? 'text-base' : 'text-xl'}`}>{stat.value}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsOverview;
