import { useState, useCallback, useMemo } from 'react';
import { WorkoutSession } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import { goalService } from '@/services/goalService';
import { findGoalForPeriod, getSessionsInPeriod, computeProgress, metricLabels } from '@/utils/goalUtils';
import AppHeader from '@/components/AppHeader';
import BottomNav, { TabId } from '@/components/BottomNav';
import StatsOverview from '@/components/StatsOverview';
import SessionCard from '@/components/SessionCard';
import WorkoutDialog from '@/components/WorkoutDialog';
import CalendarPage from '@/pages/CalendarPage';
import TrainingPage from '@/pages/TrainingPage';
import CommunityPage from '@/pages/CommunityPage';
import SettingsPage from '@/pages/SettingsPage';
import ProgressWheel from '@/components/ProgressWheel';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>('hjem');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [, setRefresh] = useState(0);
  // For navigating to statistikk with a specific period
  const [initialStatPeriod, setInitialStatPeriod] = useState<'month' | 'year' | undefined>();

  const stats = workoutService.getWeeklyStats();
  const allSessions = workoutService.getAll();
  const recentSessions = allSessions.slice(0, 5);
  const allGoals = goalService.getAll();

  // Monthly wheel
  const monthGoal = useMemo(() => findGoalForPeriod(allGoals, 'month'), [allGoals]);
  const monthData = useMemo(() => {
    if (!monthGoal) return { current: 0, target: 0, percent: 0, unit: '' };
    const sessions = getSessionsInPeriod(allSessions, 'month', monthGoal.activityType);
    const current = computeProgress(sessions, monthGoal.metric);
    const target = monthGoal.target;
    const percent = target === 0 ? 0 : (current / target) * 100;
    return { current: Math.round(current * 10) / 10, target, percent, unit: metricLabels[monthGoal.metric] };
  }, [allSessions, monthGoal]);

  // Yearly wheel — pace mode
  const yearGoal = useMemo(() => findGoalForPeriod(allGoals, 'year'), [allGoals]);
  const yearData = useMemo(() => {
    if (!yearGoal) return { current: 0, target: 0, diff: 0, expected: 0, unit: '' };
    const sessions = getSessionsInPeriod(allSessions, 'year', yearGoal.activityType);
    const current = computeProgress(sessions, yearGoal.metric);
    const target = yearGoal.target;

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
    const yearFraction = (now.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime());
    const expected = target * yearFraction;
    const diff = current - expected;

    return { current: Math.round(current * 10) / 10, target, diff, expected, unit: metricLabels[yearGoal.metric] };
  }, [allSessions, yearGoal]);

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

  const navigateToStats = (period: 'month' | 'year') => {
    setInitialStatPeriod(period);
    setActiveTab('trening');
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 lg:pt-16">
      <AppHeader className="lg:hidden" />

      <main className="container py-6 space-y-6">
        {activeTab === 'hjem' && (
          <>
            {/* Progress Wheels */}
            <section>
              <div className="grid grid-cols-2 gap-3">
                <ProgressWheel
                  percent={monthData.percent}
                  current={monthData.current}
                  target={monthData.target}
                  unit={monthData.unit}
                  title={new Date().toLocaleString('nb-NO', { month: 'long' }).replace(/^./, c => c.toUpperCase())}
                  hasGoal={!!monthGoal}
                  onClick={() => navigateToStats('month')}
                />
                <ProgressWheel
                  percent={0}
                  current={yearData.current}
                  target={yearData.target}
                  unit={yearData.unit}
                  title={String(new Date().getFullYear())}
                  label="I år"
                  hasGoal={!!yearGoal}
                  paceMode={{ diff: yearData.diff, expected: yearData.expected }}
                  onClick={() => navigateToStats('year')}
                />
              </div>
            </section>

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
        {activeTab === 'trening' && <TrainingPage initialStatPeriod={initialStatPeriod} />}
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

      <BottomNav active={activeTab} onNavigate={(tab) => { setInitialStatPeriod(undefined); setActiveTab(tab); }} />

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
