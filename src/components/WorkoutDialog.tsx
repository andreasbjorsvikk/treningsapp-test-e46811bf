import { useState, useEffect } from 'react';
import { WorkoutSession, SessionType } from '@/types/workout';
import { allSessionTypes } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import ActivityIcon from '@/components/ActivityIcon';
import { getActivityColors } from '@/utils/activityColors';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface WorkoutDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<WorkoutSession, 'id'>) => void;
  session?: WorkoutSession;
  defaultDate?: string;
}

function getVisibleFields(type: SessionType) {
  switch (type) {
    case 'styrke':
    case 'yoga':
    case 'tennis':
      return { distance: false, elevation: false };
    case 'svømming':
      return { distance: true, elevation: false };
    case 'fjelltur':
    case 'løping':
    case 'sykling':
    case 'gå':
      return { distance: true, elevation: true };
    default:
      return { distance: true, elevation: true };
  }
}

const WorkoutDialog = ({ open, onClose, onSave, session, defaultDate }: WorkoutDialogProps) => {
  const { settings, getTypeColor } = useSettings();
  const { t } = useTranslation();
  const [type, setType] = useState<SessionType>(session?.type || settings.defaultSessionType);
  const [title, setTitle] = useState(session?.title || '');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');
  const [distance, setDistance] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setType(session?.type || settings.defaultSessionType);
      setTitle(session?.title || '');
      const dateVal = session?.date?.slice(0, 10)
        || defaultDate
        || new Date().toISOString().slice(0, 10);
      setDate(dateVal);
      setHours(session ? Math.floor(session.durationMinutes / 60).toString() : '0');
      setMinutes(session ? (session.durationMinutes % 60).toString() : '30');
      setDistance(session?.distance?.toString() || '');
      setElevationGain(session?.elevationGain?.toString() || '');
      setNotes(session?.notes || '');
    }
  }, [open, session, defaultDate, settings.defaultSessionType]);

  const fields = getVisibleFields(type);

  const handleSave = () => {
    const durationMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (durationMinutes <= 0) return;

    onSave({
      type,
      title: title.trim() || undefined,
      date: new Date(date + 'T12:00:00').toISOString(),
      durationMinutes,
      distance: fields.distance && distance ? parseFloat(distance) : undefined,
      elevationGain: fields.elevation && elevationGain ? parseInt(elevationGain) : undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader className="items-center">
          <DialogTitle className="text-center">{session ? t('workout.editSession') : t('workout.newSession')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="space-y-1.5">
            <Label>{t('workout.type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as SessionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
              {allSessionTypes.map(tp => {
                  const isDark = settings.darkMode;
                  const actColors = getActivityColors(tp, isDark);
                  return (
                    <SelectItem key={tp} value={tp}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: actColors.bg }}
                        >
                          <ActivityIcon
                            type={tp}
                            className="w-5 h-5"
                            colorOverride={!isDark ? actColors.text : undefined}
                          />
                        </span>
                        {t(`activity.${tp}`)}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>{t('workout.name')}</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={t('workout.namePlaceholder')} />
          </div>

          <div className="space-y-1">
            <Label>{t('workout.date')}</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full max-w-full" />
          </div>

          <div className="space-y-1">
            <Label>{t('workout.duration')}</Label>
            <div className="flex gap-2 items-center">
              <Input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)} className="w-20" />
              <span className="text-sm text-muted-foreground">{t('workout.h')}</span>
              <Input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)} className="w-20" />
              <span className="text-sm text-muted-foreground">{t('workout.min')}</span>
            </div>
          </div>

          {(fields.distance || fields.elevation) && (
            <div className="grid grid-cols-2 gap-3">
              {fields.distance && (
                <div className="space-y-1">
                  <Label>{t('workout.distance')}</Label>
                  <Input type="number" step="0.1" min="0" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0.0" />
                </div>
              )}
              {fields.elevation && (
                <div className="space-y-1">
                  <Label>{t('workout.elevation')}</Label>
                  <Input type="number" min="0" value={elevationGain} onChange={e => setElevationGain(e.target.value)} placeholder="0" />
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>{t('workout.notes')}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('workout.notesPlaceholder')} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('workout.cancel')}</Button>
          <Button onClick={handleSave}>{session ? t('workout.save') : t('workout.add')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutDialog;
