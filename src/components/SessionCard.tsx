import { WorkoutSession } from '@/types/workout';
import { sessionTypeConfig, formatDuration, formatDate } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { Clock, MapPin, MountainSnow, Pencil, Trash2 } from 'lucide-react';
import ActivityIcon from '@/components/ActivityIcon';

interface SessionCardProps {
  session: WorkoutSession;
  onEdit?: (session: WorkoutSession) => void;
  onDelete?: (id: string) => void;
}

const SessionCard = ({ session, onEdit, onDelete }: SessionCardProps) => {
  const config = sessionTypeConfig[session.type];
  const { getTypeColor } = useSettings();
  const typeColor = getTypeColor(session.type);

  return (
    <div className="glass-card rounded-lg px-3 py-2.5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2.5">
        <div className="rounded-md p-1.5 shrink-0" style={{ backgroundColor: typeColor, color: '#fff' }}>
          <ActivityIcon type={session.type} className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display font-semibold text-sm leading-tight">
                {session.title || config.label}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {config.label} · {formatDate(session.date)}
              </p>
            </div>
            <div className="flex gap-1 shrink-0">
              {onEdit && (
                <button onClick={() => onEdit(session)} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(session.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDuration(session.durationMinutes)}</span>
            </div>
            {session.distance && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                <span>{session.distance} km</span>
              </div>
            )}
            {session.elevationGain && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MountainSnow className="w-3.5 h-3.5" />
                <span>{session.elevationGain} m</span>
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
