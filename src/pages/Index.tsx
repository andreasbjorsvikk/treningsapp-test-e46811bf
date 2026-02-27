import { useState, useCallback } from 'react';
import { WorkoutSession } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import AppHeader from '@/components/AppHeader';
import BottomNav, { TabId } from '@/components/BottomNav';
import StatsOverview from '@/components/StatsOverview';
import SessionCard from '@/components/SessionCard';
import WorkoutDialog from '@/components/WorkoutDialog';
import CalendarPage from '@/pages/CalendarPage';
import TrainingPage from '@/pages/TrainingPage';
import CommunityPage from '@/pages/CommunityPage';
import SettingsPage from '@/pages/SettingsPage';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>('hjem');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [, setRefresh] = useState(0);

  const stats = workoutService.getWeeklyStats();
  const recentSessions = workoutService.getAll().slice(0, 5);

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
    <div className="min-h-screen bg-background pb-20">
      <AppHeader />

      <main className="container py-6 space-y-6">
        {activeTab === 'hjem' && (
          <>
            <section>
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                Siste 7 dager
              </h2>
              <StatsOverview stats={stats} />
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Siste økter
                </h2>
                <Button size="sm" onClick={() => { setEditSession(undefined); setDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> Ny økt
                </Button>
              </div>

              <div className="space-y-3">
                {recentSessions.map(s => (
                  <SessionCard key={s.id} session={s} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            </section>
          </>
        )}

        {activeTab === 'kalender' && <CalendarPage />}
        {activeTab === 'trening' && <TrainingPage />}
        {activeTab === 'fellesskap' && <CommunityPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </main>

      {/* FAB for adding workout */}
      {activeTab !== 'settings' && activeTab !== 'fellesskap' && (
        <button
          onClick={() => { setEditSession(undefined); setDialogOpen(true); }}
          className="fixed bottom-20 right-4 z-40 gradient-energy rounded-full p-4 shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </button>
      )}

      <BottomNav active={activeTab} onNavigate={setActiveTab} />

      <WorkoutDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditSession(undefined); }}
        onSave={handleSave}
        session={editSession}
      />
    </div>
  );
};

export default Index;
