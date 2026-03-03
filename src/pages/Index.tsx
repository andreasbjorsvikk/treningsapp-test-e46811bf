import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkoutSession, ExtraGoal } from '@/types/workout';
import { AppDataProvider, useAppDataContext } from '@/contexts/AppDataContext';
import { computeMonthWheelData, computeYearWheelData } from '@/utils/goalWheelData';
import { useAuth } from '@/hooks/useAuth';
import { stravaService } from '@/services/stravaService';
import { mockChallenges, Challenge, mockNotifications } from '@/data/mockCommunity';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

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
import { Plus, Sun, Moon, Dumbbell, Ambulance, LogIn, RefreshCw, Loader2, GripVertical, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { HealthEvent } from '@/types/workout';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  return (
    <AppDataProvider>
      <IndexContent />
    </AppDataProvider>
  );
};

// Only bottom sections are reorderable
const REORDERABLE_IDS = ['challenges', 'extraGoals', 'recentSessions'] as const;

const IndexContent = () => {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const appData = useAppDataContext();
  const isMobile = useIsMobile();

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

  // Profile info
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('username, avatar_url').eq('id', user.id).single()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username);
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [user]);

  // Direct drag-and-drop reordering
  const [isDragging, setIsDragging] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOrder, setDragOrder] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sectionOrder = settings.homeSectionOrder?.length === REORDERABLE_IDS.length
    ? settings.homeSectionOrder
    : [...REORDERABLE_IDS];

  // Lock body scroll when dragging
  useEffect(() => {
    if (isDragging) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isDragging]);

  // Auto-sync Strava
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

  // Notification count for community tab
  const unreadNotifications = mockNotifications.filter(n => !n.read).length;

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

  // === Section labels ===
  const sectionLabels: Record<string, string> = {
    challenges: 'Utfordringer',
    extraGoals: t('home.goals'),
    recentSessions: t('home.recentSessions'),
  };

  // === Direct drag handlers ===
  const startDrag = (id: string) => {
    setDragOrder([...sectionOrder]);
    setDragId(id);
    setIsDragging(true);
    if (navigator.vibrate) navigator.vibrate(30);
  };

  const handleLongPressStart = (id: string) => {
    longPressTimer.current = setTimeout(() => startDrag(id), 500);
  };
  const handleLongPressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  // Desktop HTML5 drag
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isDragging) startDrag(id);
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  };
  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    if (dragId && dragId !== overId) {
      setDragOrder(prev => {
        const next = [...prev];
        const fromIdx = next.indexOf(dragId!);
        const toIdx = next.indexOf(overId);
        if (fromIdx !== -1 && toIdx !== -1) {
          next.splice(fromIdx, 1);
          next.splice(toIdx, 0, dragId!);
        }
        return next;
      });
    }
  };
  const handleDragEnd = () => {
    if (isDragging) {
      updateSettings({ homeSectionOrder: dragOrder });
    }
    setDragId(null);
    setIsDragging(false);
  };

  // Touch drag
  const handleTouchStart = (id: string) => {
    handleLongPressStart(id);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    handleLongPressEnd();
    if (!isDragging || !dragId) return;
    e.preventDefault();
    e.stopPropagation();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = el?.closest('[data-section-id]');
    if (target) {
      const overId = target.getAttribute('data-section-id');
      if (overId && overId !== dragId) {
        setDragOrder(prev => {
          const next = [...prev];
          const fromIdx = next.indexOf(dragId!);
          const toIdx = next.indexOf(overId);
          if (fromIdx !== -1 && toIdx !== -1) {
            next.splice(fromIdx, 1);
            next.splice(toIdx, 0, dragId!);
          }
          return next;
        });
        if (navigator.vibrate) navigator.vibrate(10);
      }
    }
  };
  const handleTouchEnd = () => {
    handleLongPressEnd();
    if (isDragging) {
      updateSettings({ homeSectionOrder: dragOrder });
      setDragId(null);
      setIsDragging(false);
    }
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

  // === Render section content (collapsed when dragging) ===
  const renderSection = (id: string, collapsed: boolean) => {
    if (collapsed) return null;
    switch (id) {
      case 'challenges':
        if (pinnedChallenges.length === 0) return null;
        return (
          <div className="space-y-2">
            {pinnedChallenges.map(c => (
              <ChallengeCard key={c.id} challenge={c} onClick={setChallengeDetail} />
            ))}
          </div>
        );
      case 'extraGoals':
        if (homeGoals.length === 0) return null;
        return (
          <DraggableGoalGrid
            goals={homeGoals}
            sessions={allSessions}
            onEdit={(g) => { setEditGoal(g); setShowGoalEditDialog(true); }}
            onDelete={() => {}}
            onToggleHome={(id) => { appData.updateGoal(id, { showOnHome: false }); }}
            onReorder={(ids) => { if (ids) appData.reorderGoals(ids); }}
          />
        );
      case 'recentSessions':
        return (
          <>
            <div className="flex items-center justify-end mb-3 -mt-1">
              <Button size="sm" onClick={() => { setEditSession(undefined); setDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" /> {t('home.newSession')}
              </Button>
            </div>
            <div className="space-y-3">
              {recentSessions.map(s => (
                <SessionCard key={s.id} session={s} onClick={setDetailSession} />
              ))}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const currentOrder = isDragging ? dragOrder : sectionOrder;

  // Profile button component
  const ProfileButton = ({ className }: { className?: string }) => (
    <button
      onClick={() => setActiveTab('settings')}
      className={`rounded-full transition-all hover:ring-2 hover:ring-primary/30 ${className || ''}`}
    >
      <Avatar className="w-8 h-8">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profil" /> : null}
        <AvatarFallback className="text-xs font-bold">
          {(username || user?.email?.charAt(0) || 'U').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </button>
  );

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
            {/* Top header row with profile + actions */}
            <div className="flex items-center justify-between -mb-4">
              {/* Left: profile (mobile only) */}
              <div className="lg:hidden">
                {user && <ProfileButton />}
              </div>
              {/* Right: actions */}
              <div className="flex items-center gap-1 ml-auto">
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
            </div>

            {/* ===== FIXED TOP SECTION (not reorderable) ===== */}
            <div className="space-y-5">
              {/* Desktop: 4-column layout */}
              {!isMobile ? (
                <div className="grid grid-cols-4 gap-3 items-start">
                  {/* Col 1: Month wheel */}
                  <ProgressWheel
                    percent={monthData.percent} current={monthData.current} target={monthData.target}
                    unit={monthData.unit} title={t(`month.${new Date().getMonth()}`)}
                    hasGoal={!!primaryGoal} expectedFraction={monthData.expectedFraction}
                    paceDiff={monthData.diff} showPaceLabel onClick={navigateToGoals}
                  />
                  {/* Col 2: Year wheel */}
                  <ProgressWheel
                    percent={yearData.percent} current={yearData.current} target={yearData.target}
                    unit={yearData.unit} title={String(new Date().getFullYear())}
                    hasGoal={!!primaryGoal} expectedFraction={yearData.expectedFraction}
                    paceDiff={yearData.diff} showPaceLabel onClick={navigateToGoals}
                  />
                  {/* Col 3: Stats + Last 7 days stacked */}
                  <div className="space-y-3">
                    <div>
                      <StatModeToggle />
                      <StatsOverview stats={stats} compact onClick={navigateToStats} />
                    </div>
                    <div>
                      <h2 className="font-display font-semibold text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                        Siste 7 dager
                      </h2>
                      <WeeklySessionIcons sessions={allSessions} onClick={navigateToHistory} />
                    </div>
                  </div>
                  {/* Col 4: Mini calendar (constrained height) */}
                  <div className="max-h-[240px] overflow-hidden">
                    <MiniCalendar sessions={allSessions} onClick={navigateToCalendar} />
                  </div>
                </div>
              ) : (
                /* Mobile: stacked sections */
                <>
                  <section className="space-y-2">
                    <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 select-none">
                      Treningsmål
                    </h2>
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
                  <section className="space-y-2">
                    <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 select-none">
                      {t('home.last7days')}
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      <WeeklySessionIcons sessions={allSessions} onClick={navigateToHistory} />
                      <MiniCalendar sessions={allSessions} onClick={navigateToCalendar} />
                    </div>
                  </section>
                  <section className="space-y-1">
                    <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 select-none">
                      Statistikk
                    </h2>
                    <StatModeToggle />
                    <StatsOverview stats={stats} compact onClick={navigateToStats} />
                  </section>
                </>
              )}
            </div>

            {/* ===== REORDERABLE BOTTOM SECTIONS with direct drag ===== */}
            <div
              ref={containerRef}
              className="space-y-5"
              style={isDragging ? { touchAction: 'none' } : undefined}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {isDragging && (
                <p className="text-xs text-muted-foreground text-center animate-pulse">Dra for å endre rekkefølge · Slipp for å lagre</p>
              )}
              {currentOrder.map(id => {
                // Skip empty sections when not dragging
                if (!isDragging) {
                  if (id === 'challenges' && pinnedChallenges.length === 0) return null;
                  if (id === 'extraGoals' && homeGoals.length === 0) return null;
                }
                return (
                  <section
                    key={id}
                    data-section-id={id}
                    draggable={isDragging}
                    onDragStart={(e) => handleDragStart(e, id)}
                    onDragOver={(e) => handleDragOver(e, id)}
                    onDragEnd={handleDragEnd}
                    className={`transition-all ${
                      isDragging
                        ? `rounded-xl p-3 ${dragId === id ? 'bg-primary/10 scale-[1.02] shadow-md ring-2 ring-primary/30' : 'bg-secondary/30'}`
                        : ''
                    }`}
                  >
                    <div
                      className="flex items-center gap-2 select-none"
                      onPointerDown={() => handleLongPressStart(id)}
                      onPointerUp={handleLongPressEnd}
                      onPointerLeave={handleLongPressEnd}
                      onTouchStart={() => handleTouchStart(id)}
                    >
                      {isDragging && <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-2 flex-1">
                        {sectionLabels[id]}
                      </h2>
                    </div>
                    {renderSection(id, isDragging)}
                  </section>
                );
              })}
              {isDragging && (
                <Button onClick={() => { updateSettings({ homeSectionOrder: dragOrder }); setDragId(null); setIsDragging(false); }} className="w-full" size="sm">
                  <Check className="w-4 h-4 mr-1" /> Ferdig
                </Button>
              )}
            </div>
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
        notificationCount={unreadNotifications}
        profileButton={
          !isMobile && user ? (
            <ProfileButton className="ml-1" />
          ) : undefined
        }
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

      <ChallengeDetail
        challenge={challengeDetail}
        open={!!challengeDetail}
        onClose={() => setChallengeDetail(null)}
      />

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
