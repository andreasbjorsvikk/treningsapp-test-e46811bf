import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkoutSession, ExtraGoal } from '@/types/workout';
import { AppDataProvider, useAppDataContext } from '@/contexts/AppDataContext';
import { computeMonthWheelData, computeYearWheelData } from '@/utils/goalWheelData';
import { useAuth } from '@/hooks/useAuth';
import { stravaService } from '@/services/stravaService';
import { getChallenges, getChallengeParticipants, getChallengeProgress, getUnreadNotificationCount, ChallengeRow } from '@/services/communityService';
import { ChallengeWithParticipants } from '@/pages/CommunityPage';
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
import { Plus, Sun, Moon, Dumbbell, Ambulance, LogIn, RefreshCw, Loader2, GripVertical, Check, User, TrendingUp, Flame, Target } from 'lucide-react';
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

// Desktop: only bottom sections are reorderable
const DESKTOP_REORDERABLE_IDS = ['challenges', 'extraGoals', 'recentSessions'] as const;
// Mobile: all sections reorderable
const MOBILE_REORDERABLE_IDS = ['trainingGoals', 'last7dCalendar', 'statistics', 'challenges', 'extraGoals', 'recentSessions'] as const;
const MOBILE_SECTION_LABELS_KEYS: Record<string, string> = {
  trainingGoals: 'home.trainingGoals',
  last7dCalendar: 'home.last7dCalendar',
  statistics: 'home.statistics',
  challenges: 'home.challenges',
  extraGoals: 'home.goals',
  recentSessions: 'home.recentSessions',
};
const MOBILE_REORDER_LABELS_KEYS: Record<string, string> = {
  ...MOBILE_SECTION_LABELS_KEYS,
  last7dCalendar: 'home.last7dCalendar',
};

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
  const [challengeDetail, setChallengeDetail] = useState<ChallengeWithParticipants | null>(null);

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
  const longPressStartPos = useRef<{ x: number; y: number } | null>(null);
  const initialOrderRef = useRef<string[]>([]);
  const dragJustActivated = useRef(false);
  // Track if a scroll event happened during long press
  const scrolledDuringLongPress = useRef(false);

  const reorderableIds = isMobile ? MOBILE_REORDERABLE_IDS : DESKTOP_REORDERABLE_IDS;
  const sectionOrder = settings.homeSectionOrder?.length === reorderableIds.length
    ? settings.homeSectionOrder
    : [...reorderableIds];

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

  // Cancel long press on ANY scroll event
  useEffect(() => {
    const onScroll = () => {
      scrolledDuringLongPress.current = true;
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
        longPressStartPos.current = null;
      }
    };
    window.addEventListener('scroll', onScroll, true); // capture phase
    return () => window.removeEventListener('scroll', onScroll, true);
  }, []);

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
        toast.success(t('sync.newSessions', { n: result.synced }));
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
        toast.info(t('sync.notConnected'));
        setStravaSyncing(false);
        return;
      }
      lastSyncRef.current = Date.now();
      const result = await stravaService.sync();
      if (result.synced > 0) {
        toast.success(t('sync.newSessions', { n: result.synced }));
        appData.reload();
      } else {
        toast.info(t('sync.noNew'));
      }
    } catch {
      toast.error(t('sync.failed'));
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
  const pinnedChallenges: ChallengeWithParticipants[] = [];
  const unreadNotifications = 0;

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
  const sectionLabels: Record<string, string> = {};
  const labelKeys = isMobile
    ? (isDragging ? MOBILE_REORDER_LABELS_KEYS : MOBILE_SECTION_LABELS_KEYS)
    : {
        challenges: 'home.challenges',
        extraGoals: 'home.goals',
        recentSessions: 'home.recentSessions',
      };
  for (const [k, v] of Object.entries(labelKeys)) {
    sectionLabels[k] = t(v);
  }

  // === Direct drag handlers ===
  const startDrag = (id: string) => {
    // If a scroll happened during the long press, cancel
    if (scrolledDuringLongPress.current) {
      scrolledDuringLongPress.current = false;
      return;
    }
    const order = [...sectionOrder];
    initialOrderRef.current = [...order];
    setDragOrder(order);
    setDragId(id);
    dragJustActivated.current = true;
    setIsDragging(true);
    if (navigator.vibrate) navigator.vibrate(30);

    // On desktop, auto-scroll to bottom so confirm button is visible
    if (!isMobile) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      });
    }

    requestAnimationFrame(() => {
      dragJustActivated.current = false;
    });
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressStartPos.current = null;
  };

  const handleLongPressStart = (id: string, e?: React.TouchEvent) => {
    scrolledDuringLongPress.current = false;
    if (e && e.touches.length > 0) {
      longPressStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else {
      longPressStartPos.current = null;
    }
    longPressTimer.current = setTimeout(() => {
      if (!scrolledDuringLongPress.current) {
        startDrag(id);
      }
    }, 700);
  };

  const handleLongPressEnd = () => {
    cancelLongPress();
  };

  const handleLongPressMove = (e: React.TouchEvent) => {
    if (!longPressStartPos.current || !longPressTimer.current) return;
    const touch = e.touches[0];
    if (!touch) return;
    const dx = Math.abs(touch.clientX - longPressStartPos.current.x);
    const dy = Math.abs(touch.clientY - longPressStartPos.current.y);
    // Cancel on ANY movement > 5px
    if (dx > 5 || dy > 5) {
      cancelLongPress();
    }
  };

  // Desktop HTML5 drag
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!isDragging) {
      // Start reorder mode via drag on desktop
      const order = [...sectionOrder];
      initialOrderRef.current = [...order];
      setDragOrder(order);
      setDragId(id);
      setIsDragging(true);
      if (navigator.vibrate) navigator.vibrate(30);
    }
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
        if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
          next[fromIdx] = overId;
          next[toIdx] = dragId!;
        }
        return next;
      });
    }
  };
  const handleDragEnd = () => {
    setDragId(null);
  };

  // Streak / motivational data
  const currentStreak = useMemo(() => {
    if (allSessions.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayMs = 86400000;
    for (let d = 0; d < 365; d++) {
      const checkDate = new Date(today.getTime() - d * dayMs);
      const dateStr = checkDate.toISOString().split('T')[0];
      if (allSessions.some(s => s.date === dateStr)) {
        streak++;
      } else if (d > 0) {
        break;
      }
    }
    return streak;
  }, [allSessions]);

  const totalThisWeek = appData.weekStats.totalSessions;

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
      case 'trainingGoals':
        return (
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
        );
      case 'last7dCalendar':
        return (
          <div className="grid grid-cols-2 gap-3">
            <WeeklySessionIcons sessions={allSessions} onClick={navigateToHistory} />
            <MiniCalendar sessions={allSessions} onClick={navigateToCalendar} />
          </div>
        );
      case 'statistics':
        return (
          <>
            <StatModeToggle />
            <StatsOverview stats={stats} compact onClick={navigateToStats} />
          </>
        );
      case 'challenges':
        if (pinnedChallenges.length === 0) return null;
        return (
          <div className="space-y-2">
            {pinnedChallenges.map(c => (
              <ChallengeCard key={c.challenge.id} challenge={c} onClick={() => setChallengeDetail(c)} />
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
              <Button size="sm" onClick={() => { setEditSession(undefined); setDialogOpen(true); }} className="gradient-energy text-primary-foreground border-0 shadow-md">
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
      onClick={() => { setActiveTab('settings'); setTimeout(() => window.dispatchEvent(new CustomEvent('navigate-to-profile')), 50); }}
      className={`rounded-full transition-all hover:ring-2 hover:ring-energy/30 ${className || ''}`}
    >
      <Avatar className="w-9 h-9 ring-2 ring-energy/40">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profil" /> : null}
        <AvatarFallback className="text-xs font-bold bg-energy/20 text-foreground">
          {(username || user?.email?.charAt(0) || 'U').charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </button>
  );

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return t('greeting.goodNight');
    if (h < 12) return t('greeting.goodMorning');
    if (h < 18) return t('greeting.hello');
    return t('greeting.goodEvening');
  }, [t]);
  const displayName = username || user?.email?.split('@')[0] || '';

  // Section gradient styles - subtle gradients
  const sectionGradients: Record<string, string> = {
    trainingGoals: 'bg-gradient-to-br from-energy/5 via-transparent to-accent/3',
    last7dCalendar: 'bg-gradient-to-br from-accent/5 via-transparent to-energy/3',
    statistics: 'bg-gradient-to-br from-primary/4 via-transparent to-energy/3',
    challenges: 'bg-gradient-to-br from-warning/5 via-transparent to-accent/3',
    extraGoals: 'bg-gradient-to-br from-success/5 via-transparent to-primary/3',
    recentSessions: 'bg-gradient-to-br from-accent/5 via-transparent to-success/3',
  };

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0 lg:pt-16">
      <main className="container py-4 space-y-5">
        {activeTab === 'hjem' && (
          <>
            {/* ===== HERO HEADER ===== */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-energy/10 via-background to-accent/5 border border-border/30 px-5 py-5">
              {/* Decorative shapes */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-energy/10 blur-2xl" />
              <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-accent/10 blur-2xl" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {user && <ProfileButton />}
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">{greeting}</p>
                    <h1 className="font-display font-bold text-lg text-foreground truncate">{displayName}</h1>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {currentStreak > 0 && (
                    <div className="flex items-center gap-1 bg-energy/15 text-energy rounded-full px-2.5 py-1 mr-1">
                      <Flame className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{currentStreak}</span>
                    </div>
                  )}
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

              {/* Quick stats bar */}
              <div className="relative flex items-center gap-4 mt-4 pt-3 border-t border-border/30">
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-energy" />
                   <span className="text-xs text-muted-foreground">{t('home.thisWeekSessions')}</span>
                   <span className="text-sm font-bold text-foreground">{totalThisWeek} {t('home.sessions')}</span>
                </div>
                {primaryGoal && (
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-accent" />
                    <span className="text-xs text-muted-foreground">{t('home.goal')}</span>
                    <span className="text-sm font-bold text-foreground">{monthData.current}/{monthData.target}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ===== FIXED TOP SECTION (not reorderable) ===== */}
            <div className="space-y-5">
              {/* Desktop: 4-column layout */}
              {!isMobile && (
                <div className="grid grid-cols-4 gap-3 items-stretch">
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
                  <div className="space-y-3">
                    <div>
                      <StatModeToggle />
                      <StatsOverview stats={stats} compact onClick={navigateToStats} />
                    </div>
                    <div>
                     <h2 className="font-display font-semibold text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                       {t('home.last7dCalendar')}
                     </h2>
                      <WeeklySessionIcons sessions={allSessions} onClick={navigateToHistory} />
                    </div>
                  </div>
                  <div>
                    <MiniCalendar sessions={allSessions} onClick={navigateToCalendar} />
                  </div>
                </div>
              )}
            </div>

            {/* ===== REORDERABLE SECTIONS ===== */}
            <div
              ref={containerRef}
              className="space-y-4"
              style={isDragging ? { touchAction: 'none', overflowX: 'hidden' } : undefined}
              onTouchMove={(e) => {
                if (isDragging && dragId) {
                  if (dragJustActivated.current) return;
                  e.preventDefault();
                  e.stopPropagation();
                  const touch = e.touches[0];
                  const el = document.elementFromPoint(touch.clientX, touch.clientY);
                  const target = el?.closest('[data-section-id]');
                  if (target) {
                    const overId = target.getAttribute('data-section-id');
                    if (overId && overId !== dragId) {
                      setDragOrder(prev => {
                        const fromIdx = prev.indexOf(dragId!);
                        const toIdx = prev.indexOf(overId);
                        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev;
                        const next = [...prev];
                        next[fromIdx] = overId;
                        next[toIdx] = dragId!;
                        return next;
                      });
                      if (navigator.vibrate) navigator.vibrate(10);
                    }
                  }
                }
              }}
              onTouchEnd={() => {
                handleLongPressEnd();
                if (isDragging) {
                  setDragId(null);
                }
              }}
            >
              {isDragging && (
                <p className="text-xs text-muted-foreground text-center animate-pulse">{t('home.dragToReorder')}</p>
              )}
              {currentOrder.map(id => {
                // Skip empty sections when not dragging
                if (!isDragging) {
                  if (id === 'challenges' && pinnedChallenges.length === 0) return null;
                  if (id === 'extraGoals' && homeGoals.length === 0) return null;
                }
                const gradient = sectionGradients[id] || '';
                return (
                  <section
                    key={id}
                    data-section-id={id}
                    onDragOver={(e) => handleDragOver(e, id)}
                    onDrop={() => { if (dragId) { /* swap handled in dragOver */ } }}
                    onDragEnd={handleDragEnd}
                    className={`transition-all duration-200 ease-in-out rounded-2xl border border-border/30 px-4 py-4 ${gradient} ${
                      isDragging
                        ? `${dragId === id ? 'scale-[1.02] shadow-md ring-2 ring-energy/30' : 'opacity-80'}`
                        : ''
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 select-none ${isDragging ? 'cursor-grab active:cursor-grabbing' : 'cursor-grab'}`}
                      draggable
                      onDragStart={(e) => {
                        handleDragStart(e, id);
                      }}
                      onTouchStart={(e) => {
                        if (isDragging) {
                          setDragId(id);
                          if (navigator.vibrate) navigator.vibrate(15);
                        } else {
                          handleLongPressStart(id, e);
                        }
                      }}
                      onTouchMove={handleLongPressMove}
                      onTouchEnd={handleLongPressEnd}
                      onMouseDown={(e) => {
                        // Desktop: initiate drag mode on header mousedown
                        if (!isDragging && !isMobile) {
                          e.preventDefault();
                        }
                      }}
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
                <Button onClick={() => { updateSettings({ homeSectionOrder: dragOrder }); setDragId(null); setIsDragging(false); }} className="w-full gradient-energy text-primary-foreground border-0" size="sm">
                  <Check className="w-4 h-4 mr-1" /> {t('common.done')}
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
        onNavigate={(tab) => {
          setInitialStatPeriod(undefined);
          if (isDragging) {
            setIsDragging(false);
            setDragId(null);
            setDragOrder([]);
          }
          setActiveTab(tab);
          window.scrollTo({ top: 0 });
        }}
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
