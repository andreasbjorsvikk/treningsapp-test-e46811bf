import { useState, useCallback, useMemo } from 'react';
import { WorkoutSession, ExtraGoal } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import { primaryGoalService, convertGoalValue, getProratedTarget } from '@/services/primaryGoalService';
import { goalService } from '@/services/goalService';

import BottomNav, { TabId } from '@/components/BottomNav';
import StatsOverview from '@/components/StatsOverview';
import SessionCard from '@/components/SessionCard';
import WorkoutDialog from '@/components/WorkoutDialog';
import GoalForm from '@/components/GoalForm';
import CalendarPage from '@/pages/CalendarPage';
import TrainingPage from '@/pages/TrainingPage';
import CommunityPage from '@/pages/CommunityPage';
import SettingsPage from '@/pages/SettingsPage';
import ProgressWheel from '@/components/ProgressWheel';
import WeeklySessionIcons from '@/components/WeeklySessionIcons';
import GoalCard from '@/components/GoalCard';
import { Plus, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';



const Index = () => {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<TabId>('hjem');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [, setRefresh] = useState(0);
  const [initialStatPeriod, setInitialStatPeriod] = useState<'month' | 'year' | undefined>();
  const [editGoal, setEditGoal] = useState<ExtraGoal | undefined>();
  const [showGoalEditDialog, setShowGoalEditDialog] = useState(false);

  const stats = workoutService.getWeeklyStats();
  const allSessions = workoutService.getAll();
  const recentSessions = allSessions.slice(0, 5);

  const primaryGoal = primaryGoalService.get();

  const monthData = useMemo(() => {
    const now = new Date();
    const target = primaryGoal ? getProratedTarget(primaryGoal, 'month') : 0;
    const goalStart = primaryGoal ? new Date(primaryGoal.startDate) : null;
    // Only count sessions from goal start date onwards, within current month
    const current = allSessions.filter(s => {
      const d = new Date(s.date);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      if (goalStart && d < goalStart) return false;
      return true;
    }).length;
    const percent = target === 0 ? 0 : (current / target) * 100;
    return { current, target: Math.round(target * 10) / 10, percent, unit: 'økter' };
  }, [allSessions, primaryGoal]);

  const yearData = useMemo(() => {
    const now = new Date();
    const goalStart = primaryGoal ? new Date(primaryGoal.startDate) : null;
    // Total target = prorated year target (accounts for start date)
    const target = primaryGoal ? getProratedTarget(primaryGoal, 'year') : 0;
    // Only count sessions from goal start date onwards, within current year
    const current = allSessions.filter(s => {
      const d = new Date(s.date);
      if (d.getFullYear() !== now.getFullYear()) return false;
      if (goalStart && d < goalStart) return false;
      return true;
    }).length;
    // Expected: fraction of time elapsed since goal start (or year start) to year end
    const effectiveStart = goalStart && goalStart.getFullYear() === now.getFullYear()
      ? Math.max(goalStart.getTime(), new Date(now.getFullYear(), 0, 1).getTime())
      : new Date(now.getFullYear(), 0, 1).getTime();
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1).getTime();
    const totalSpan = yearEnd - effectiveStart;
    const elapsedSpan = now.getTime() - effectiveStart;
    const fractionElapsed = totalSpan > 0 ? Math.max(0, elapsedSpan / totalSpan) : 1;
    const expected = target * fractionElapsed;
    const diff = current - expected;
    return { current, target: Math.round(target), diff, expected, unit: 'økter' };
  }, [allSessions, primaryGoal]);

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

  const navigateToGoals = () => {
    setInitialStatPeriod(undefined);
    (window as any).__navigateToGoals = true;
    setActiveTab('trening');
    window.scrollTo({ top: 0 });
    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-goals')), 50);
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 lg:pt-16">

      <main className="container py-6 space-y-6">
        {activeTab === 'hjem' && (
          <>
            {/* Desktop: 2-column layout with wheels left, stats right */}
            <section className="lg:grid lg:grid-cols-2 lg:gap-6 space-y-6 lg:space-y-0">
              {/* Left: Progress wheels */}
              <div className="grid grid-cols-2 gap-3">
                <ProgressWheel
                  percent={monthData.percent}
                  current={monthData.current}
                  target={monthData.target}
                  unit={monthData.unit}
                  title={new Date().toLocaleString('nb-NO', { month: 'long' }).replace(/^./, c => c.toUpperCase())}
                  hasGoal={!!primaryGoal}
                  onClick={navigateToGoals}
                />
                <ProgressWheel
                  percent={0}
                  current={yearData.current}
                  target={yearData.target}
                  unit={yearData.unit}
                  title={String(new Date().getFullYear())}
                  label="I år"
                  hasGoal={!!primaryGoal}
                  paceMode={{ diff: yearData.diff, expected: yearData.expected }}
                  onClick={navigateToGoals}
                />
              </div>

              {/* Right: Last 7 days */}
              <div>
                <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                  Siste 7 dager
                </h2>
                <WeeklySessionIcons sessions={allSessions} />
                <div className="mt-2">
                  <StatsOverview stats={stats} />
                </div>
              </div>
            </section>

            {/* Home-pinned extra goals */}
            {(() => {
              const homeGoals = goalService.getAll().filter(g => g.showOnHome);
              if (homeGoals.length === 0) return null;
              return (
                <section>
                  <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    Mål
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {homeGoals.map(goal => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        sessions={allSessions}
                        onEdit={(g) => {
                          setEditGoal(g);
                          setShowGoalEditDialog(true);
                        }}
                        onDelete={() => {}}
                        onToggleHome={(id) => {
                          goalService.update(id, { showOnHome: false });
                          setRefresh(r => r + 1);
                        }}
                      />
                    ))}
                  </div>
                </section>
              );
            })()}

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

      <button
        onClick={() => updateSettings({ darkMode: !settings.darkMode })}
        className="fixed bottom-20 right-4 z-40 glass-card rounded-full p-3.5 shadow-lg hover:shadow-xl transition-all border border-border/50"
      >
        {settings.darkMode
          ? <Sun className="w-5 h-5 text-foreground" />
          : <Moon className="w-5 h-5 text-foreground" />
        }
      </button>

      <BottomNav
        active={activeTab}
        onNavigate={(tab) => { setInitialStatPeriod(undefined); setActiveTab(tab); window.scrollTo({ top: 0 }); }}
      />

      <WorkoutDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditSession(undefined); }}
        onSave={handleSave}
        session={editSession}
      />

      {/* Edit Goal Dialog (for home-pinned goals) */}
      <Dialog open={showGoalEditDialog} onOpenChange={(open) => { if (!open) { setShowGoalEditDialog(false); setEditGoal(undefined); } }}>
        <DialogContent className="max-w-[min(calc(100vw-2rem),26rem)] p-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Rediger mål</DialogTitle>
          </DialogHeader>
          {editGoal && (
            <GoalForm
              goal={editGoal}
              embedded
              onSave={(data) => {
                goalService.update(editGoal.id, data);
                setEditGoal(undefined);
                setShowGoalEditDialog(false);
                setRefresh(r => r + 1);
              }}
              onCancel={() => { setShowGoalEditDialog(false); setEditGoal(undefined); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
