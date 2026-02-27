import { useState, useEffect } from 'react';
import { WorkoutSession, SessionType } from '@/types/workout';
import { sessionTypeConfig, allSessionTypes } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import ActivityIcon from '@/components/ActivityIcon';
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
  defaultDate?: string; // YYYY-MM-DD
}

// Field visibility rules per type
function getVisibleFields(type: SessionType) {
  switch (type) {
    case 'styrke':
    case 'yoga':
    case 'tennis':
      return { distance: false, elevation: false };
    case 'svømming':
      return { distance: true, elevation: false };
    case 'fjelltur':
      return { distance: true, elevation: true };
    case 'løping':
    case 'sykling':
    case 'gå':
      return { distance: true, elevation: true }; // elevation optional
    default:
      return { distance: true, elevation: true };
  }
}

const WorkoutDialog = ({ open, onClose, onSave, session, defaultDate }: WorkoutDialogProps) => {
  const { settings, getTypeColor } = useSettings();
  const [type, setType] = useState<SessionType>(session?.type || settings.defaultSessionType);
  const [title, setTitle] = useState(session?.title || '');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');
  const [distance, setDistance] = useState('');
  const [elevationGain, setElevationGain] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form when dialog opens
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
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session ? 'Rediger økt' : 'Ny økt'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as SessionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allSessionTypes.map(t => {
                  const cfg = sessionTypeConfig[t];
                  const color = getTypeColor(t);
                  return (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <ActivityIcon type={t} className="w-4 h-4" />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Navn på økt <span className="text-muted-foreground font-normal">(valgfritt)</span></Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="F.eks. Morgenløp" />
          </div>

          <div className="space-y-1.5">
            <Label>Dato</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Varighet</Label>
            <div className="flex gap-2 items-center">
              <Input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)} className="w-20" />
              <span className="text-sm text-muted-foreground">t</span>
              <Input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)} className="w-20" />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>

          {fields.distance && (
            <div className="space-y-1.5">
              <Label>Distanse km <span className="text-muted-foreground font-normal">(valgfritt)</span></Label>
              <Input type="number" step="0.1" min="0" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0.0" />
            </div>
          )}

          {fields.elevation && (
            <div className="space-y-1.5">
              <Label>Høydemeter <span className="text-muted-foreground font-normal">(valgfritt)</span></Label>
              <Input type="number" min="0" value={elevationGain} onChange={e => setElevationGain(e.target.value)} placeholder="0" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notater <span className="text-muted-foreground font-normal">(valgfritt)</span></Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Skriv notater her..." rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Avbryt</Button>
          <Button onClick={handleSave}>{session ? 'Lagre' : 'Legg til'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutDialog;
