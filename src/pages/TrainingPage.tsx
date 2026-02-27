import { useState, useCallback } from 'react';
import { SessionType, WorkoutSession } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import StatsOverview from '@/components/StatsOverview';
import SessionCard from '@/components/SessionCard';
import TypeFilter from '@/components/TypeFilter';
import WorkoutDialog from '@/components/WorkoutDialog';

type SubTab = 'statistikk' | 'historikk' | 'mål';

const TrainingPage = () => {
  const [subTab, setSubTab] = useState<SubTab>('historikk');
  const [filterType, setFilterType] = useState<SessionType | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [, setRefresh] = useState(0);

  const stats = workoutService.getWeeklyStats();
  const allSessions = workoutService.getAll();
  const filtered = filterType === 'all' ? allSessions : allSessions.filter(s => s.type === filterType);

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

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'statistikk', label: 'Statistikk' },
    { id: 'historikk', label: 'Historikk' },
    { id: 'mål', label: 'Mål' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Trening
      </h2>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {subTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              subTab === t.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'statistikk' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Siste 7 dager</h3>
          <StatsOverview stats={stats} />
        </div>
      )}

      {subTab === 'historikk' && (
        <div className="space-y-4">
          <TypeFilter selected={filterType} onSelect={setFilterType} />
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Ingen økter funnet.</p>
            ) : (
              filtered.map(s => (
                <SessionCard key={s.id} session={s} onEdit={handleEdit} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      )}

      {subTab === 'mål' && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Mål-funksjonen kommer snart! 🎯</p>
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

export default TrainingPage;
