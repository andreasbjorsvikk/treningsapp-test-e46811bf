import { useState } from 'react';
import { WorkoutSession } from '@/types/workout';
import { sessionTypeConfig, formatDuration, formatDate } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { Clock, MapPin, MountainSnow, Pencil, Trash2 } from 'lucide-react';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SessionCardProps {
  session: WorkoutSession;
  onEdit?: (session: WorkoutSession) => void;
  onDelete?: (id: string) => void;
}

const SessionCard = ({ session, onEdit, onDelete }: SessionCardProps) => {
  const config = sessionTypeConfig[session.type];
  const { settings } = useSettings();
  const isDark = settings.darkMode;
  const colors = getActivityColors(session.type, isDark);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <>
      <div className="glass-card rounded-lg px-3 py-2.5 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-2.5">
          <div
            className="rounded-md p-1.5 shrink-0 flex items-center justify-center"
            style={{ backgroundColor: colors.bg }}
          >
            <ActivityIcon type={session.type} className="w-5 h-5" colorOverride={!isDark ? colors.text : undefined} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display font-semibold text-sm leading-tight">
                  {session.title || config.label}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(session.date)}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {onEdit && (
                  <button onClick={() => onEdit(session)} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
                {onDelete && (
                  <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Vil du slette «{session.title || config.label}»? Dette kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete?.(session.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SessionCard;
