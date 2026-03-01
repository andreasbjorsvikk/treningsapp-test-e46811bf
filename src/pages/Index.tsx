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
import MiniCalendar from '@/components/MiniCalendar';
import GoalCard from '@/components/GoalCard';
import DraggableGoalGrid from '@/components/DraggableGoalGrid';
import { Plus, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Index = () => {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
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
    const current = allSessions.filter(s => {
      const d = new Date(s.date);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
      if (goalStart && d < goalStart) return false;
      return true;
    }).length;
    const percent = target === 0 ? 0 : (current / target) * 100;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const expectedFraction = now.getDate() / daysInMonth;
    const expected = target * expectedFraction;
    const diff = current - expected;
    return { current, target: Math.round(target * 10) / 10, percent, unit: 'økter', expectedFraction, diff };
  }, [allSessions, primaryGoal]);

  const yearData = useMemo(() => {
    const now = new Date();
    const goalStart = primaryGoal ? new Date(primaryGoal.startDate) : null;
    const target = primaryGoal ? getProratedTarget(primaryGoal, 'year') : 0;
    const current = allSessions.filter(s => {
      const d = new Date(s.date);
      if (d.getFullYear() !== now.getFullYear()) return false;
      if (goalStart && d < goalStart) return false;
      return true;
    }).length;
    const effectiveStart = goalStart && goalStart.getFullYear() === now.getFullYear()
      ? Math.max(goalStart.getTime(), new Date(now.getFullYear(), 0, 1).getTime())
      : new Date(now.getFullYear(), 0, 1).getTime();
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1).getTime();
    const totalSpan = yearEnd - effectiveStart;
    const elapsedSpan = now.getTime() - effectiveStart;
    const fractionElapsed = totalSpan > 0 ? Math.max(0, elapsedSpan / totalSpan) : 1;
    const expected = target * fractionElapsed;
    const diff = current - expected;
    const percent = target === 0 ? 0 : (current / target) * 100;
    return { current, target: Math.round(target), diff, expected, unit: 'økter', expectedFraction: fractionElapsed, percent };
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
            {/* ===== DESKTOP (lg+): 4-column — month | year | calendar | last 7 days ===== */}
            <section className="hidden lg:grid lg:grid-cols-4 lg:gap-3">
              <ProgressWheel
                percent={monthData.percent}
                current={monthData.current}
                target={monthData.target}
                unit={monthData.unit}
                title={t(`month.${new Date().getMonth()}`)}
                hasGoal={!!primaryGoal}
                expectedFraction={monthData.expectedFraction}
                paceDiff={monthData.diff}
                showPaceLabel
                onClick={navigateToGoals}
              />
              <ProgressWheel
                percent={yearData.percent}
                current={yearData.current}
                target={yearData.target}
                unit={yearData.unit}
                title={String(new Date().getFullYear())}
                hasGoal={!!primaryGoal}
                expectedFraction={yearData.expectedFraction}
                paceDiff={yearData.diff}
                showPaceLabel
                onClick={navigateToGoals}
              />
              <MiniCalendar sessions={allSessions} />
              <div className="glass-card rounded-2xl p-3 flex flex-col">
                <h2 className="font-display font-semibold text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                  {t('home.last7days')}
                </h2>
                <WeeklySessionIcons sessions={allSessions} />
                <div className="mt-auto pt-2">
                  <StatsOverview stats={stats} compact />
                </div>
              </div>
            </section>

            {/* ===== TABLET (md, not lg): 3-col wheels + calendar ===== */}
            <section className="hidden md:grid md:grid-cols-3 md:gap-3 lg:hidden">
              <div className="px-0">
                <ProgressWheel
                  percent={monthData.percent}
                  current={monthData.current}
                  target={monthData.target}
                  unit={monthData.unit}
                  title={t(`month.${new Date().getMonth()}`)}
                  hasGoal={!!primaryGoal}
                  expectedFraction={monthData.expectedFraction}
                  paceDiff={monthData.diff}
                  showPaceLabel
                  onClick={navigateToGoals}
                />
              </div>
              <div className="px-0">
                <ProgressWheel
                  percent={yearData.percent}
                  current={yearData.current}
                  target={yearData.target}
                  unit={yearData.unit}
                  title={String(new Date().getFullYear())}
                  hasGoal={!!primaryGoal}
                  expectedFraction={yearData.expectedFraction}
                  paceDiff={yearData.diff}
                  showPaceLabel
                  onClick={navigateToGoals}
                />
              </div>
              <MiniCalendar sessions={allSessions} />
            </section>

            {/* Tablet: Siste 7 dager + stats below */}
            <section className="hidden md:block lg:hidden space-y-3">
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {t('home.last7days')}
              </h2>
              <WeeklySessionIcons sessions={allSessions} />
              <StatsOverview stats={stats} />
            </section>

            {/* ===== MOBILE (below md): wheels, then weekly + calendar side by side ===== */}
            <section className="md:hidden space-y-4">
              {/* Wheels */}
              <div className="grid grid-cols-2 gap-3">
                <ProgressWheel
                  percent={monthData.percent}
                  current={monthData.current}
                  target={monthData.target}
                  unit={monthData.unit}
                  title={t(`month.${new Date().getMonth()}`)}
                  hasGoal={!!primaryGoal}
                  expectedFraction={monthData.expectedFraction}
                  paceDiff={monthData.diff}
                  showPaceLabel
                  onClick={navigateToGoals}
                />
                <ProgressWheel
                  percent={yearData.percent}
                  current={yearData.current}
                  target={yearData.target}
                  unit={yearData.unit}
                  title={String(new Date().getFullYear())}
                  hasGoal={!!primaryGoal}
                  expectedFraction={yearData.expectedFraction}
                  paceDiff={yearData.diff}
                  showPaceLabel
                  onClick={navigateToGoals}
                />
              </div>

              {/* Weekly icons (left) + Mini calendar (right) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <h2 className="font-display font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
                    {t('home.last7days')}
                  </h2>
                  <WeeklySessionIcons sessions={allSessions} />
                </div>
                <MiniCalendar sessions={allSessions} />
              </div>

              {/* Stats 2x2 compact */}
              <StatsOverview stats={stats} compact />
            </section>

            {/* Home-pinned extra goals */}
            {(() => {
              const homeGoals = goalService.getAll().filter(g => g.showOnHome);
              if (homeGoals.length === 0) return null;
              return (
                <section>
                  <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">
                    {t('home.goals')}
                  </h2>
                  <DraggableGoalGrid
                    goals={homeGoals}
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
                    onReorder={() => setRefresh(r => r + 1)}
                  />
                </section>
              );
            })()}

            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {t('home.recentSessions')}
                </h2>
                <Button size="sm" onClick={() => { setEditSession(undefined); setDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-1" /> {t('home.newSession')}
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
            <DialogTitle>{t('home.editGoal')}</DialogTitle>
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
