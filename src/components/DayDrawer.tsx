import { useState, useCallback } from 'react';
import { WorkoutSession, HealthEvent } from '@/types/workout';
import { useAppDataContext } from '@/contexts/AppDataContext';
import SessionCard from '@/components/SessionCard';
import WorkoutDialog from '@/components/WorkoutDialog';
import WorkoutDetailDrawer from '@/components/WorkoutDetailDrawer';
import HealthEventDialog from '@/components/HealthEventDialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Plus, Ambulance, Cross } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface DayDrawerProps {
  dateKey: string | null;
  sessions: WorkoutSession[];
  healthEvents?: HealthEvent[];
  onClose: () => void;
  onRefresh: () => void;
  onNavigateToCalendar?: () => void;
}

const DayDrawer = ({ dateKey, sessions, healthEvents = [], onClose, onRefresh, onNavigateToCalendar }: DayDrawerProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [editHealthEvent, setEditHealthEvent] = useState<HealthEvent | undefined>();
  const appData = useAppDataContext();
  const { t, locale } = useTranslation();

  const dateLabel = dateKey
    ? new Date(dateKey + 'T00:00:00').toLocaleDateString(locale, {
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
    if (!editSession && onNavigateToCalendar) {
      onClose();
      onNavigateToCalendar();
    }
  }, [editSession, appData, onRefresh, onNavigateToCalendar, onClose]);

  const handleAddNew = () => {
    setEditSession(undefined);
    setDialogOpen(true);
  };

  const handleHealthSave = async (data: Omit<HealthEvent, 'id'>) => {
    if (editHealthEvent) {
      await appData.updateHealthEvent(editHealthEvent.id, data);
    } else {
      await appData.addHealthEvent(data);
    }
    setEditHealthEvent(undefined);
    onRefresh();
  };

  // Health events for this specific day
  const dayHealthEvents = healthEvents;

  return (
    <>
      <Sheet open={!!dateKey} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="capitalize">{dateLabel}</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 pb-4">
            {/* Health events for this day */}
            {dayHealthEvents.map(he => (
              <div key={he.id} className="glass-card rounded-xl p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  {he.type === 'sickness' ? (
                    <Ambulance className="w-4 h-4 text-destructive" />
                  ) : (
                    <Cross className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {he.type === 'sickness' ? t('health.sickness') : t('health.injury')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(he.dateFrom).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                    {he.dateTo && ` – ${new Date(he.dateTo).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`}
                  </p>
                  {he.notes && <p className="text-xs text-muted-foreground mt-0.5">{he.notes}</p>}
                </div>
              </div>
            ))}

            {sessions.length === 0 && dayHealthEvents.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">
                {t('common.noSessions')}
              </p>
            ) : (
              sessions.map(s => (
                <SessionCard key={s.id} session={s} onClick={setDetailSession} onEdit={handleEdit} />
              ))
            )}

            <div className="flex gap-2">
              <Button onClick={handleAddNew} className="flex-1" variant="outline">
                <Plus className="w-4 h-4 mr-2" /> {t('common.addSession')}
              </Button>
              <Button onClick={() => { setEditHealthEvent(undefined); setHealthDialogOpen(true); }} variant="outline" className="flex-1">
                <Ambulance className="w-4 h-4 mr-2" /> {t('health.newEvent')}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <WorkoutDetailDrawer
        session={detailSession}
        open={!!detailSession}
        onClose={() => setDetailSession(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <WorkoutDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditSession(undefined); }}
        onSave={handleSave}
        session={editSession}
        defaultDate={dateKey || undefined}
      />

      <HealthEventDialog
        open={healthDialogOpen}
        onClose={() => { setHealthDialogOpen(false); setEditHealthEvent(undefined); }}
        onSave={handleHealthSave}
        event={editHealthEvent}
      />
    </>
  );
};

export default DayDrawer;
