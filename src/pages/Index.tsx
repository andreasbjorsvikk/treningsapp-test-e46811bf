import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkoutSession, ExtraGoal } from '@/types/workout';
import { AppDataProvider, useAppDataContext } from '@/contexts/AppDataContext';
import { computeMonthWheelData, computeYearWheelData } from '@/utils/goalWheelData';
import { useAuth } from '@/hooks/useAuth';
import { stravaService } from '@/services/stravaService';
import { mockChallenges, Challenge } from '@/data/mockCommunity';
import { toast } from 'sonner';

import BottomNav, { TabId } from '@/components/BottomNav';
import StatsOverview from '@/components/StatsOverview';
import SessionCard from '@/components/SessionCard';
import WorkoutDialog from '@/components/WorkoutDialog';
import WorkoutDetailDrawer from '@/components/WorkoutDetailDrawer';
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
import ChallengeCard from '@/components/community/ChallengeCard';
import ChallengeDetail from '@/components/community/ChallengeDetail';
import { Plus, Sun, Moon, Dumbbell, Ambulance, LogIn, RefreshCw, Loader2, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HealthEvent } from '@/types/workout';

const Index = () => {
  return (
    <AppDataProvider>
      <IndexContent />
    </AppDataProvider>
  );
};

const ALL_SECTION_IDS = ['wheels', 'activity', 'stats', 'challenges', 'extraGoals'] as const;

const IndexContent = () => {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const appData = useAppDataContext();

  const [activeTab, setActiveTab] = useState<TabId>('hjem');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [healthDialogOpen, setHealthDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [initialStatPeriod, setInitialStatPeriod] = useState<'month' | 'year' | undefined>();
  const [editGoal, setEditGoal] = useState<ExtraGoal | undefined>();
  const [showGoalEditDialog, setShowGoalEditDialog] = useState(false);
  const [homeStatMode, setHomeStatMode] = useState<'week' | 'month'>('week');
  const [stravaSyncing, setStravaSyncing] = useState(false);
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(null);
  const [challengeDetail, setChallengeDetail] = useState<Challenge | null>(null);

  // Section reordering
  const [isReordering, setIsReordering] = useState(false);
  const [reorderItems, setReorderItems] = useState<string[]>([]);
  const [dragSection, setDragSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const reorderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sectionOrder = settings.homeSectionOrder?.length === ALL_SECTION_IDS.length
    ? settings.homeSectionOrder
    : [...ALL_SECTION_IDS];

  // Auto-sync Strava on app open and when returning from background
  const lastSyncRef = useRef<number>(0);

  const autoSyncStrava = useCallback(async () => {
    if (!user) return;
    const now = Date.now();
    if (now - lastSyncRef.current < 15 * 60 * 1000) return;
    lastSyncRef.current = now;
    try {
      const status = await stravaService.getStatus();
      if (!status.connected) return;
      const result = await stravaService.sync();
      if (result.synced > 0) {
        toast.success(`${result.synced} nye økter synkronisert fra Strava`);
        appData.reload();
      }
    } catch { }
  }, [user, appData]);

  useEffect(() => { autoSyncStrava(); }, [autoSyncStrava]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') autoSyncStrava();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [autoSyncStrava]);

  const handleManualSync = async () => {
    if (!user) return;
    setStravaSyncing(true);
    try {
      const status = await stravaService.getStatus();
      if (!status.connected) {
        toast.info('Strava er ikke tilkoblet. Gå til Innstillinger → Synkronisering.');
        setStravaSyncing(false);
        return;
      }
      lastSyncRef.current = Date.now();
      const result = await stravaService.sync();
      if (result.synced > 0) {
        toast.success(`${result.synced} nye økter synkronisert fra Strava!`);
        appData.reload();
      } else {
        toast.info('Ingen nye økter å synkronisere.');
      }
    } catch {
      toast.error('Synkronisering feilet');
    }
    setStravaSyncing(false);
  };

  const stats = homeStatMode === 'week' ? appData.weekStats : appData.monthStats;
  const allSessions = appData.sessions;
  const recentSessions = allSessions.slice(0, 5);
  const primaryGoal = appData.currentPrimaryGoal;
  const allPeriods = appData.primaryGoals;

  const monthData = useMemo(() => {
    const now = new Date();
    return computeMonthWheelData(allPeriods, allSessions, now.getMonth(), now.getFullYear(), now, t('metric.sessions'));
  }, [allSessions, allPeriods, t]);

  const yearData = useMemo(() => {
    const now = new Date();
    return computeYearWheelData(allPeriods, allSessions, now.getFullYear(), now, t('metric.sessions'));
  }, [allSessions, allPeriods, t]);

  const homeGoals = appData.goals.filter(g => g.showOnHome);
  const pinnedChallenges = mockChallenges.filter(c => settings.pinnedChallengeIds?.includes(c.id));

  const handleDelete = async (id: string) => { await appData.deleteSession(id); };
  const handleEdit = (session: WorkoutSession) => { setEditSession(session); setDialogOpen(true); };
  const handleSave = async (data: Omit<WorkoutSession, 'id'>) => {
    if (editSession) await appData.updateSession(editSession.id, data);
    else await appData.addSession(data);
    setEditSession(undefined);
  };
  const handleHealthSave = async (data: Omit<HealthEvent, 'id'>) => { await appData.addHealthEvent(data); };

  const navigateToGoals = () => {
    setInitialStatPeriod(undefined);
    (window as any).__navigateToGoals = true;
    setActiveTab('trening');
    window.scrollTo({ top: 0 });
    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-goals')), 50);
  };
  const navigateToStats = () => { setInitialStatPeriod(undefined); setActiveTab('trening'); window.scrollTo({ top: 0 }); };
  const navigateToCalendar = () => { setActiveTab('kalender'); window.scrollTo({ top: 0 }); };
  const navigateToHistory = () => {
    setInitialStatPeriod(undefined);
    (window as any).__navigateToHistory = true;
    setActiveTab('trening');
    window.scrollTo({ top: 0 });
    setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-history')), 50);
  };

  // === Section reorder handlers ===
  const sectionLabels: Record<string, string> = {
    wheels: 'Treningsmål',
    activity: t('home.last7days'),
    stats: 'Statistikk',
    challenges: 'Utfordringer',
    extraGoals: t('home.goals'),
  };

  const enterReorderMode = () => {
    setReorderItems([...sectionOrder]);
    setIsReordering(true);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleReorderDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragSection(id);
  };

  const handleReorderDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (dragSection && dragSection !== id) {
      setDragOverSection(id);
      // Swap positions
      setReorderItems(prev => {
        const next = [...prev];
        const fromIdx = next.indexOf(dragSection!);
        const toIdx = next.indexOf(id);
        if (fromIdx !== -1 && toIdx !== -1) {
          next.splice(fromIdx, 1);
          next.splice(toIdx, 0, dragSection!);
        }
        return next;
      });
    }
  };

  const handleReorderDrop = () => {
    setDragSection(null);
    setDragOverSection(null);
  };

  const saveReorder = () => {
    updateSettings({ homeSectionOrder: reorderItems });
    setIsReordering(false);
    setDragSection(null);
    setDragOverSection(null);
  };

  // Touch reorder
  const handleReorderTouchStart = (id: string) => {
    setDragSection(id);
  };

  const handleReorderTouchMove = (e: React.TouchEvent) => {
    if (!dragSection) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = el?.closest('[data-reorder-id]');
    if (target) {
      const overId = target.getAttribute('data-reorder-id');
      if (overId && overId !== dragSection) {
        setReorderItems(prev => {
          const next = [...prev];
          const fromIdx = next.indexOf(dragSection!);
          const toIdx = next.indexOf(overId);
          if (fromIdx !== -1 && toIdx !== -1) {
            next.splice(fromIdx, 1);
            next.splice(toIdx, 0, dragSection!);
          }
          return next;
        });
        if (navigator.vibrate) navigator.vibrate(15);
      }
    }
  };

  const handleReorderTouchEnd = () => {
    setDragSection(null);
  };

  // === Section Header with long-press ===
  const SectionHeader = ({ label, sectionId }: { label: string; sectionId?: string }) => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const onPointerDown = () => {
      if (!sectionId) return;
      timerRef.current = setTimeout(() => enterReorderMode(), 500);
    };
    const onPointerUp = () => { if (timerRef.current) clearTimeout(timerRef.current); };

    return (
      <h2
        className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {label}
      </h2>
    );
  };

  const StatModeToggle = () => (
    <div className="flex items-center gap-1 mb-1">
      <button
        onClick={() => setHomeStatMode('week')}
        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full transition-all ${
          homeStatMode === 'week' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {t('home.thisWeek')}
      </button>
      <button
        onClick={() => setHomeStatMode('month')}
        className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full transition-all ${
          homeStatMode === 'month' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {t('home.thisMonth')}
      </button>
    </div>
  );

  // === Render individual sections ===
  const renderSection = (id: string) => {
    switch (id) {
      case 'wheels':
        return (
          <section key="wheels" className="space-y-2">
            <SectionHeader label="Treningsmål" sectionId="wheels" />
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
          </section>
        );

      case 'activity':
        return (
          <section key="activity" className="space-y-2">
            <SectionHeader label={t('home.last7days')} sectionId="activity" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <WeeklySessionIcons sessions={allSessions} onClick={navigateToHistory} />
              </div>
              <MiniCalendar sessions={allSessions} onClick={navigateToCalendar} />
            </div>
          </section>
        );

      case 'stats':
        return (
          <section key="stats" className="space-y-1">
            <SectionHeader label="Statistikk" sectionId="stats" />
            <StatModeToggle />
            <StatsOverview stats={stats} compact onClick={navigateToStats} />
          </section>
        );

      case 'challenges':
        if (pinnedChallenges.length === 0) return null;
        return (
          <section key="challenges" className="space-y-2">
            <SectionHeader label="Utfordringer" sectionId="challenges" />
            <div className="space-y-2">
              {pinnedChallenges.map(c => (
                <ChallengeCard key={c.id} challenge={c} onClick={setChallengeDetail} />
              ))}
            </div>
          </section>
        );

      case 'extraGoals':
        if (homeGoals.length === 0) return null;
        return (
          <section key="extraGoals" className="space-y-2">
            <SectionHeader label={t('home.goals')} sectionId="extraGoals" />
            <DraggableGoalGrid
              goals={homeGoals}
              sessions={allSessions}
              onEdit={(g) => { setEditGoal(g); setShowGoalEditDialog(true); }}
              onDelete={() => {}}
              onToggleHome={(id) => { appData.updateGoal(id, { showOnHome: false }); }}
              onReorder={(ids) => { if (ids) appData.reorderGoals(ids); }}
            />
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 lg:pt-16">
      <main className="container py-6 space-y-6">
        {/* Auth banner */}
        {!user && activeTab === 'hjem' && (
          <div className="glass-card rounded-xl p-3 flex items-center justify-between gap-3 border-dashed">
            <p className="text-xs text-muted-foreground">
              Du bruker appen uten innlogging. Data lagres kun lokalt.
            </p>
            <Button size="sm" variant="outline" onClick={() => navigate('/login')} className="shrink-0">
              <LogIn className="w-3.5 h-3.5 mr-1" /> Logg inn
            </Button>
          </div>
        )}

        {activeTab === 'hjem' && (
          <>
            {/* Top-right buttons */}
            <div className="flex justify-end gap-1 -mb-4">
              {user && (
                <Button size="icon" variant="ghost" className="rounded-full h-9 w-9" onClick={handleManualSync} disabled={stravaSyncing}>
                  {stravaSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="rounded-full h-9 w-9">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditSession(undefined); setDialogOpen(true); }}>
                    <Dumbbell className="w-4 h-4 mr-2" /> {t('home.newSession')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setHealthDialogOpen(true)}>
                    <Ambulance className="w-4 h-4 mr-2" /> {t('health.newEvent')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Reorder mode */}
            {isReordering ? (
              <div className="space-y-1.5" onTouchMove={handleReorderTouchMove} onTouchEnd={handleReorderTouchEnd}>
                <p className="text-xs text-muted-foreground text-center mb-2">Dra for å endre rekkefølge</p>
                {reorderItems.map((id) => (
                  <div
                    key={id}
                    data-reorder-id={id}
                    draggable
                    onDragStart={(e) => handleReorderDragStart(e, id)}
                    onDragOver={(e) => handleReorderDragOver(e, id)}
                    onDrop={handleReorderDrop}
                    onTouchStart={() => handleReorderTouchStart(id)}
                    className={`py-3 px-4 rounded-xl flex items-center gap-3 cursor-grab active:cursor-grabbing transition-all select-none ${
                      dragSection === id ? 'bg-primary/10 scale-[1.02] shadow-sm' : 'bg-secondary/50'
                    }`}
                  >
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <span className="font-display font-semibold text-sm uppercase tracking-wide flex-1">{sectionLabels[id]}</span>
                  </div>
                ))}
                <Button onClick={saveReorder} className="w-full mt-2" size="sm">
                  <Check className="w-4 h-4 mr-1" /> Ferdig
                </Button>
              </div>
            ) : (
              /* Normal sections in order */
              <div className="space-y-5">
                {sectionOrder.map(id => renderSection(id))}
              </div>
            )}

            {/* Recent sessions - always at bottom */}
            {!isReordering && (
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
                    <SessionCard key={s.id} session={s} onClick={setDetailSession} />
                  ))}
                </div>
              </section>
            )}
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
        {settings.darkMode ? <Sun className="w-5 h-5 text-foreground" /> : <Moon className="w-5 h-5 text-foreground" />}
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

      <WorkoutDetailDrawer
        session={detailSession}
        open={!!detailSession}
        onClose={() => setDetailSession(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <HealthEventDialog
        open={healthDialogOpen}
        onClose={() => setHealthDialogOpen(false)}
        onSave={handleHealthSave}
      />

      {/* Challenge detail for pinned challenges */}
      <ChallengeDetail
        challenge={challengeDetail}
        open={!!challengeDetail}
        onClose={() => setChallengeDetail(null)}
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
                appData.updateGoal(editGoal.id, data);
                setEditGoal(undefined);
                setShowGoalEditDialog(false);
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
