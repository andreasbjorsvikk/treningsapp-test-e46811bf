import { useState, useCallback } from 'react';
import { WorkoutSession } from '@/types/workout';
import { useAppDataContext } from '@/contexts/AppDataContext';
import SessionCard from '@/components/SessionCard';
import WorkoutDialog from '@/components/WorkoutDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface DayDrawerProps {
  dateKey: string | null;
  sessions: WorkoutSession[];
  onClose: () => void;
  onRefresh: () => void;
}

const DayDrawer = ({ dateKey, sessions, onClose, onRefresh }: DayDrawerProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const appData = useAppDataContext();

  const dateLabel = dateKey
    ? new Date(dateKey + 'T00:00:00').toLocaleDateString('nb-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      })
    : '';

  const handleDelete = useCallback(async (id: string) => {
    await appData.deleteSession(id);
    onRefresh();
  }, [appData, onRefresh]);

  const handleEdit = useCallback((session: WorkoutSession) => {
    setEditSession(session);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async (data: Omit<WorkoutSession, 'id'>) => {
    if (editSession) {
      await appData.updateSession(editSession.id, data);
    } else {
      await appData.addSession(data);
    }
    setEditSession(undefined);
    onRefresh();
  }, [editSession, appData, onRefresh]);

  const handleAddNew = () => {
    setEditSession(undefined);
    setDialogOpen(true);
  };

  return (
    <>
      <Sheet open={!!dateKey} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="capitalize">{dateLabel}</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 pb-4">
            {sessions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">
                Ingen økter denne dagen.
              </p>
            ) : (
              sessions.map(s => (
                <SessionCard key={s.id} session={s} onEdit={handleEdit} onDelete={handleDelete} />
              ))
            )}

            <Button onClick={handleAddNew} className="w-full" variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Legg til økt
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <WorkoutDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditSession(undefined); }}
        onSave={handleSave}
        session={editSession}
        defaultDate={dateKey || undefined}
      />
    </>
  );
};

export default DayDrawer;
