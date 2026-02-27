import { useState, useCallback } from 'react';
import { WorkoutSession } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import { Calendar } from '@/components/ui/calendar';
import SessionCard from '@/components/SessionCard';
import WorkoutDialog from '@/components/WorkoutDialog';

const CalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, setRefresh] = useState(0);

  const allSessions = workoutService.getAll();

  // Dates that have sessions
  const sessionDates = new Set(
    allSessions.map(s => new Date(s.date).toISOString().slice(0, 10))
  );

  const selectedDateStr = selectedDate?.toISOString().slice(0, 10) || '';
  const daySessions = allSessions.filter(s => s.date.startsWith(selectedDateStr));

  const handleDelete = useCallback((id: string) => {
    workoutService.delete(id);
    setRefresh(r => r + 1);
  }, []);

  const handleEdit = useCallback((session: WorkoutSession) => {
    setEditSession(session);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback((data: Omit<WorkoutSession, 'id'>) => {
    if (editSession) {
      workoutService.update(editSession.id, data);
    } else {
      workoutService.add(data);
    }
    setEditSession(undefined);
    setRefresh(r => r + 1);
  }, [editSession]);

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Kalender
      </h2>

      <div className="glass-card rounded-lg p-2 flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="pointer-events-auto"
          modifiers={{ hasSession: (date) => sessionDates.has(date.toISOString().slice(0, 10)) }}
          modifiersClassNames={{ hasSession: 'font-bold text-primary' }}
        />
      </div>

      {selectedDate && (
        <div>
          <h3 className="font-display font-semibold text-sm text-muted-foreground mb-2">
            {selectedDate.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' '}({daySessions.length} økter)
          </h3>
          <div className="space-y-3">
            {daySessions.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Ingen økter denne dagen.</p>
            ) : (
              daySessions.map(s => (
                <SessionCard key={s.id} session={s} onEdit={handleEdit} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      )}

      <WorkoutDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditSession(undefined); }}
        onSave={handleSave}
        session={editSession}
      />
    </div>
  );
};

export default CalendarPage;
