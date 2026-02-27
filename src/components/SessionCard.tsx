import { WorkoutSession } from '@/types/workout';
import { sessionTypeConfig, feelingLabels, formatDuration, formatDate } from '@/utils/workoutUtils';
import { Clock, Flame, MapPin } from 'lucide-react';

interface SessionCardProps {
  session: WorkoutSession;
}

const SessionCard = ({ session }: SessionCardProps) => {
  const config = sessionTypeConfig[session.type];
  const Icon = config.icon;

  return (
    <div className="glass-card rounded-lg p-4 hover:shadow-md transition-shadow animate-slide-up">
      <div className="flex items-start gap-3">
        {/* Type badge */}
        <div className={`${config.color} rounded-lg p-2.5 shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold text-sm leading-tight">
                {session.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {config.label} · {formatDate(session.date)}
              </p>
            </div>
            <span className="text-lg shrink-0" title={`Følelse: ${session.feeling}/5`}>
              {feelingLabels[session.feeling]}
            </span>
          </div>

          {/* Metrics */}
          <div className="flex items-center gap-4 mt-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDuration(session.durationMinutes)}</span>
            </div>
            {session.caloriesBurned && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="w-3.5 h-3.5" />
                <span>{session.caloriesBurned} kcal</span>
              </div>
            )}
            {session.distance && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{session.distance} km</span>
              </div>
            )}
          </div>

          {session.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-1 italic">
              {session.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionCard;
