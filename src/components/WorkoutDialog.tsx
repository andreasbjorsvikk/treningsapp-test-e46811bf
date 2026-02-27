import { useState } from 'react';
import { WorkoutSession, SessionType } from '@/types/workout';
import { sessionTypeConfig, allSessionTypes } from '@/utils/workoutUtils';
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
  session?: WorkoutSession; // if editing
}

const WorkoutDialog = ({ open, onClose, onSave, session }: WorkoutDialogProps) => {
  const [type, setType] = useState<SessionType>(session?.type || 'styrke');
  const [title, setTitle] = useState(session?.title || '');
  const [date, setDate] = useState(session?.date?.slice(0, 16) || new Date().toISOString().slice(0, 16));
  const [hours, setHours] = useState(session ? Math.floor(session.durationMinutes / 60).toString() : '0');
  const [minutes, setMinutes] = useState(session ? (session.durationMinutes % 60).toString() : '30');
  const [distance, setDistance] = useState(session?.distance?.toString() || '');
  const [elevationGain, setElevationGain] = useState(session?.elevationGain?.toString() || '');
  const [notes, setNotes] = useState(session?.notes || '');

  const handleSave = () => {
    const durationMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    if (durationMinutes <= 0) return;

    onSave({
      type,
      title: title.trim() || undefined,
      date: new Date(date).toISOString(),
      durationMinutes,
      distance: distance ? parseFloat(distance) : undefined,
      elevationGain: elevationGain ? parseInt(elevationGain) : undefined,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session ? 'Rediger økt' : 'Ny økt'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as SessionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allSessionTypes.map(t => (
                  <SelectItem key={t} value={t}>
                    {sessionTypeConfig[t].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Navn på økt (valgfritt)</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="F.eks. Morgenløp" />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Dato og tid</Label>
            <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <Label>Varighet</Label>
            <div className="flex gap-2 items-center">
              <Input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)} className="w-20" />
              <span className="text-sm text-muted-foreground">t</span>
              <Input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)} className="w-20" />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>

          {/* Distance */}
          <div className="space-y-1.5">
            <Label>Distanse km (valgfritt)</Label>
            <Input type="number" step="0.1" min="0" value={distance} onChange={e => setDistance(e.target.value)} placeholder="0.0" />
          </div>

          {/* Elevation */}
          <div className="space-y-1.5">
            <Label>Høydemeter (valgfritt)</Label>
            <Input type="number" min="0" value={elevationGain} onChange={e => setElevationGain(e.target.value)} placeholder="0" />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notater (valgfritt)</Label>
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
