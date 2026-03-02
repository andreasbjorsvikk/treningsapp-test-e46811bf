import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import DurationPicker from '@/components/DurationPicker';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppDataContext } from '@/contexts/AppDataContext';

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
    case 'fotball':
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
  const isMobile = useIsMobile();
  const appData = useAppDataContext();
  const sortedTypes = useMemo(() => {
    const disabled = settings.disabledSessionTypes || [];
    const active = allSessionTypes.filter(t => !disabled.includes(t));
    const counts = new Map<SessionType, number>();
    appData.sessions.forEach(s => counts.set(s.type, (counts.get(s.type) || 0) + 1));
    return [...active].sort((a, b) => (counts.get(b) || 0) - (counts.get(a) || 0));
  }, [appData.sessions, settings.disabledSessionTypes]);
  const [type, setType] = useState<SessionType>(session?.type || settings.defaultSessionType);
  const [title, setTitle] = useState(session?.title || '');
  const [date, setDate] = useState<Date | undefined>();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(30);
  const [distance, setDistance] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [notes, setNotes] = useState('');
  const [durationPickerOpen, setDurationPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setType(session?.type || settings.defaultSessionType);
      setTitle(session?.title || '');
      const dateStr = session?.date?.slice(0, 10) || defaultDate || new Date().toISOString().slice(0, 10);
      setDate(new Date(dateStr + 'T12:00:00'));
      setHours(session ? Math.floor(session.durationMinutes / 60) : 0);
      setMinutes(session ? (session.durationMinutes % 60) : 30);
      setDistance(session?.distance?.toString() || '');
      setElevationGain(session?.elevationGain?.toString() || '');
      setNotes(session?.notes || '');
    }
  }, [open, session, defaultDate, settings.defaultSessionType]);

  const fields = getVisibleFields(type);

  const handleSave = () => {
    const durationMinutes = hours * 60 + minutes;
    if (durationMinutes <= 0 || !date) return;

    onSave({
      type,
      title: title.trim() || undefined,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12).toISOString(),
      durationMinutes,
      distance: fields.distance && distance ? parseFloat(distance) : undefined,
      elevationGain: fields.elevation && elevationGain ? parseInt(elevationGain) : undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const formatDurationDisplay = () => {
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} ${t('workout.h')}`);
    parts.push(`${minutes} ${t('workout.min')}`);
    return parts.join(' ');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md max-h-[85vh] overflow-y-auto overflow-x-hidden">
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
                {sortedTypes.map(tp => {
                    const isDark = settings.darkMode;
                    const actColors = getActivityColors(tp, isDark);
                    return (
                      <SelectItem key={tp} value={tp}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
                            style={{
                              backgroundColor: actColors.bg,
                              boxShadow: isDark
                                ? 'inset 0 1px 1px rgba(255,255,255,0.15), 0 2px 6px rgba(0,0,0,0.3)'
                                : 'inset 0 1px 1px rgba(255,255,255,0.5), 0 1px 4px rgba(0,0,0,0.1)',
                              backdropFilter: 'blur(4px)',
                            }}
                          >
                            <ActivityIcon
                              type={tp}
                              className="w-4 h-4"
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {date ? format(date, 'd. MMM yyyy', { locale: nb }) : <span>Velg dato</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label>{t('workout.duration')}</Label>
              {isMobile ? (
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-10"
                  onClick={() => setDurationPickerOpen(true)}
                >
                  <Clock className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  {formatDurationDisplay()}
                </Button>
              ) : (
                <div className="flex gap-2 items-center">
                  <Input type="number" min="0" value={hours} onChange={e => setHours(parseInt(e.target.value) || 0)} className="w-20" />
                  <span className="text-sm text-muted-foreground">{t('workout.h')}</span>
                  <Input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(parseInt(e.target.value) || 0)} className="w-20" />
                  <span className="text-sm text-muted-foreground">{t('workout.min')}</span>
                </div>
              )}
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

      <DurationPicker
        open={durationPickerOpen}
        onClose={() => setDurationPickerOpen(false)}
        hours={hours}
        minutes={minutes}
        onConfirm={(h, m) => { setHours(h); setMinutes(m); }}
      />
    </>
  );
};

export default WorkoutDialog;
