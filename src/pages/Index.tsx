import { useState, useCallback, useMemo } from 'react';
import { WorkoutSession, ExtraGoal } from '@/types/workout';
import { workoutService } from '@/services/workoutService';
import { primaryGoalService } from '@/services/primaryGoalService';
import { goalService } from '@/services/goalService';
import { healthEventService } from '@/services/healthEventService';
import { computeMonthWheelData, computeYearWheelData } from '@/utils/goalWheelData';

import BottomNav, { TabId } from '@/components/BottomNav';
import StatsOverview from '@/components/StatsOverview';
import SessionCard from '@/components/SessionCard';
import WorkoutDialog from '@/components/WorkoutDialog';
import HealthEventDialog from '@/components/HealthEventDialog';
import GoalForm from '@/components/GoalForm';
import CalendarPage from '@/pages/CalendarPage';
import TrainingPage from '@/pages/TrainingPage';
import CommunityPage from '@/pages/CommunityPage';
import SettingsPage from '@/pages/SettingsPage';
import ProgressWheel from '@/components/ProgressWheel';
import WeeklySessionIcons from '@/components/WeeklySessionIcons';
import MiniCalendar from '@/components/MiniCalendar';
import DraggableGoalGrid from '@/components/DraggableGoalGrid';
import { Plus, Sun, Moon, Dumbbell, Ambulance } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HealthEvent } from '@/types/workout';

const Index = () => {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('hjem');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [, setRefresh] = useState(0);
  const [initialStatPeriod, setInitialStatPeriod] = useState<'month' | 'year' | undefined>();
  const [editGoal, setEditGoal] = useState<ExtraGoal | undefined>();
  const [showGoalEditDialog, setShowGoalEditDialog] = useState(false);
  const [homeStatMode, setHomeStatMode] = useState<'week' | 'month'>('week');

  const weekStats = workoutService.getWeeklyStats();
  const monthStats = workoutService.getMonthlyStats();
  const stats = homeStatMode === 'week' ? weekStats : monthStats;
  const allSessions = workoutService.getAll();
  const recentSessions = allSessions.slice(0, 5);

  const primaryGoal = primaryGoalService.get();
  const allPeriods = primaryGoalService.getAll();

  const monthData = useMemo(() => {
    const now = new Date();
    return computeMonthWheelData(allPeriods, allSessions, now.getMonth(), now.getFullYear(), now, t('metric.sessions'));
  }, [allSessions, allPeriods, t]);

  const yearData = useMemo(() => {
    const now = new Date();
    return computeYearWheelData(allPeriods, allSessions, now.getFullYear(), now, t('metric.sessions'));
  }, [allSessions, allPeriods, t]);

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

  const handleHealthSave = useCallback((data: Omit<HealthEvent, 'id'>) => {
    healthEventService.add(data);
    setRefresh(r => r + 1);
  }, []);

  const navigateToGoals = () => {
    setInitialStatPeriod(undefined);
    (window as any).__navigateToGoals = true;
    setActiveTab('trening');
    window.scrollTo({ top: 0 });
    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-goals')), 50);
  };

  const navigateToStats = () => {
    setInitialStatPeriod(undefined);
    setActiveTab('trening');
    window.scrollTo({ top: 0 });
  };

  const navigateToCalendar = () => {
    setActiveTab('kalender');
    window.scrollTo({ top: 0 });
  };

  const navigateToHistory = () => {
    setInitialStatPeriod(undefined);
    (window as any).__navigateToHistory = true;
    setActiveTab('trening');
    window.scrollTo({ top: 0 });
    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-history')), 50);
  };

  const StatModeToggle = () => (
    <div className="flex items-center gap-1 mb-1">
      <button
        onClick={() => setHomeStatMode('week')}
        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full transition-all ${
          homeStatMode === 'week'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {t('home.thisWeek')}
      </button>
      <button
        onClick={() => setHomeStatMode('month')}
        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full transition-all ${
          homeStatMode === 'month'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {t('home.thisMonth')}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 lg:pt-16">

      <main className="container py-6 space-y-6">
        {activeTab === 'hjem' && (
          <>
            {/* Top-right + button */}
            <div className="flex justify-end -mb-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="rounded-full h-9 w-9">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditSession(undefined); setDialogOpen(true); }}>
                    <Dumbbell className="w-4 h-4 mr-2" />
                    {t('home.newSession')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHealthDialogOpen(true)}>
                    <Ambulance className="w-4 h-4 mr-2" />
                    {t('health.newEvent')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* ===== DESKTOP (lg+): 4-column ===== */}
            <section className="hidden lg:grid lg:grid-cols-4 lg:gap-3">
              <ProgressWheel
                percent={monthData.percent} current={monthData.current} target={monthData.target}
                unit={monthData.unit} title={t(`month.${new Date().getMonth()}`)}
                hasGoal={!!primaryGoal} expectedFraction={monthData.expectedFraction}
                paceDiff={monthData.diff} showPaceLabel onClick={navigateToGoals}
              />
              <ProgressWheel
                percent={yearData.percent} current={yearData.current} target={yearData.target}
                unit={yearData.unit} title={String(new Date().getFullYear())}
                hasGoal={!!primaryGoal} expectedFraction={yearData.expectedFraction}
                paceDiff={yearData.diff} showPaceLabel onClick={navigateToGoals}
              />
              <MiniCalendar sessions={allSessions} onClick={navigateToCalendar} />
              <div className="glass-card rounded-2xl p-3 flex flex-col">
                <h2 className="font-display font-semibold text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                  {t('home.last7days')}
                </h2>
                <WeeklySessionIcons sessions={allSessions} onClick={navigateToHistory} />
                <div className="mt-auto pt-2">
                  <StatModeToggle />
                  <StatsOverview stats={stats} compact onClick={navigateToStats} />
                </div>
              </div>
            </section>

            {/* ===== TABLET (md, not lg) ===== */}
            <section className="hidden md:grid md:grid-cols-3 md:gap-3 lg:hidden">
              <ProgressWheel
                percent={monthData.percent} current={monthData.current} target={monthData.target}
                unit={monthData.unit} title={t(`month.${new Date().getMonth()}`)}
                hasGoal={!!primaryGoal} expectedFraction={monthData.expectedFraction}
                paceDiff={monthData.diff} showPaceLabel onClick={navigateToGoals}
              />
              <ProgressWheel
                percent={yearData.percent} current={yearData.current} target={yearData.target}
                unit={yearData.unit} title={String(new Date().getFullYear())}
                hasGoal={!!primaryGoal} expectedFraction={yearData.expectedFraction}
                paceDiff={yearData.diff} showPaceLabel onClick={navigateToGoals}
              />
              <MiniCalendar sessions={allSessions} onClick={navigateToCalendar} />
            </section>

            <section className="hidden md:block lg:hidden space-y-3">
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {t('home.last7days')}
              </h2>
              <WeeklySessionIcons sessions={allSessions} onClick={navigateToHistory} />
              <StatModeToggle />
              <StatsOverview stats={stats} onClick={navigateToStats} />
            </section>

            {/* ===== MOBILE ===== */}
            <section className="md:hidden space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ProgressWheel
                  percent={monthData.percent} current={monthData.current} target={monthData.target}
                  unit={monthData.unit} title={t(`month.${new Date().getMonth()}`)}
                  hasGoal={!!primaryGoal} expectedFraction={monthData.expectedFraction}
                  paceDiff={monthData.diff} showPaceLabel onClick={navigateToGoals}
                />
                <ProgressWheel
                  percent={yearData.percent} current={yearData.current} target={yearData.target}
                  unit={yearData.unit} title={String(new Date().getFullYear())}
                  hasGoal={!!primaryGoal} expectedFraction={yearData.expectedFraction}
                  paceDiff={yearData.diff} showPaceLabel onClick={navigateToGoals}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <h2 className="font-display font-semibold text-[10px] text-muted-foreground uppercase tracking-wide">
                    {t('home.last7days')}
                  </h2>
                  <WeeklySessionIcons sessions={allSessions} onClick={navigateToHistory} />
                </div>
                <MiniCalendar sessions={allSessions} onClick={navigateToCalendar} />
              </div>

              <StatModeToggle />
              <StatsOverview stats={stats} compact onClick={navigateToStats} />
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
                    onEdit={(g) => { setEditGoal(g); setShowGoalEditDialog(true); }}
                    onDelete={() => {}}
                    onToggleHome={(id) => { goalService.update(id, { showOnHome: false }); setRefresh(r => r + 1); }}
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

      <HealthEventDialog
        open={healthDialogOpen}
        onClose={() => setHealthDialogOpen(false)}
        onSave={handleHealthSave}
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
