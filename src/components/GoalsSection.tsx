import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, Home, Pencil, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import TargetIcon from '@/components/TargetIcon';
import { ExtraGoal, PrimaryGoalPeriod, GoalPeriod } from '@/types/workout';
import { goalService } from '@/services/goalService';
import { primaryGoalService, convertGoalValue, getMonthTarget, getActiveGoalForDate } from '@/services/primaryGoalService';
import { workoutService } from '@/services/workoutService';
import { Button } from '@/components/ui/button';
import GoalForm from '@/components/GoalForm';
import PrimaryGoalForm from '@/components/PrimaryGoalForm';
import DraggableGoalGrid from '@/components/DraggableGoalGrid';
import ProgressWheel from '@/components/ProgressWheel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';
import { computeMonthWheelData, computeYearWheelData } from '@/utils/goalWheelData';

const GoalsSection = () => {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [showPrimaryForm, setShowPrimaryForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeletePrimaryConfirm, setShowDeletePrimaryConfirm] = useState(false);
  const [editGoal, setEditGoal] = useState<ExtraGoal | undefined>();
  const [, setRefresh] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Edit period dialog state
  const [editingPeriod, setEditingPeriod] = useState<(PrimaryGoalPeriod & { toDate: string | null }) | null>(null);
  const [editPeriodTarget, setEditPeriodTarget] = useState('');
  const [editPeriodType, setEditPeriodType] = useState<GoalPeriod>('month');
  const [editPeriodFrom, setEditPeriodFrom] = useState('');
  
  // Delete current goal dialog state
  const [deleteCurrentMode, setDeleteCurrentMode] = useState<'ask' | 'confirm-only' | null>(null);

  // Collapsible state
  const [primaryOpen, setPrimaryOpen] = useState(true);
  const [extraOpen, setExtraOpen] = useState(true);

  const now = new Date();
  const [wheelMonth, setWheelMonth] = useState(now.getMonth());
  const [wheelYear, setWheelYear] = useState(now.getFullYear());

  const allPeriods = primaryGoalService.getAll();
  const currentGoal = primaryGoalService.get();
  const extraGoals = goalService.getAll();
  const sessions = workoutService.getAll();

  // Get the active goal for the navigated month
  const viewedMonthEnd = new Date(wheelYear, wheelMonth + 1, 0);
  const viewedGoal = useMemo(() => getActiveGoalForDate(allPeriods, viewedMonthEnd), [allPeriods, wheelMonth, wheelYear]);

  const weekTarget = viewedGoal ? convertGoalValue(viewedGoal.inputTarget, viewedGoal.inputPeriod, 'week') : 0;
  const monthTargetVal = viewedGoal ? convertGoalValue(viewedGoal.inputTarget, viewedGoal.inputPeriod, 'month') : 0;
  const yearTarget = viewedGoal ? convertGoalValue(viewedGoal.inputTarget, viewedGoal.inputPeriod, 'year') : 0;
  const periodLabel = viewedGoal ? t(`goals.period.${viewedGoal.inputPeriod}`) : '';

  const monthData = useMemo(() =>
    computeMonthWheelData(allPeriods, sessions, wheelMonth, wheelYear, now, t('metric.sessions')),
    [allPeriods, sessions, wheelMonth, wheelYear, t]
  );

  const yearData = useMemo(() =>
    computeYearWheelData(allPeriods, sessions, wheelYear, now, t('metric.sessions')),
    [allPeriods, sessions, wheelYear, t]
  );

  const handlePrevMonth = () => {
    if (wheelMonth === 0) { setWheelMonth(11); setWheelYear(y => y - 1); }
    else setWheelMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (wheelMonth === 11) { setWheelMonth(0); setWheelYear(y => y + 1); }
    else setWheelMonth(m => m + 1);
  };
  const handlePrevYear = () => setWheelYear(y => y - 1);
  const handleNextYear = () => setWheelYear(y => y + 1);
  const handleGoToday = () => {
    setWheelMonth(now.getMonth());
    setWheelYear(now.getFullYear());
  };

  const isToday = wheelMonth === now.getMonth() && wheelYear === now.getFullYear();

  // --- Extra goals handlers ---
  const handleSaveExtra = (data: Omit<ExtraGoal, 'id' | 'createdAt'>) => {
    if (editGoal) goalService.update(editGoal.id, data);
    else goalService.add(data);
    setEditGoal(undefined);
    setShowExtraForm(false);
    setRefresh(r => r + 1);
  };

  const handleEditExtra = (goal: ExtraGoal) => {
    setEditGoal(goal);
    setShowEditDialog(true);
  };

  const handleDeleteExtra = (id: string) => {
    goalService.delete(id);
    setRefresh(r => r + 1);
  };

  const handleToggleHome = (id: string) => {
    const goal = extraGoals.find(g => g.id === id);
    if (goal) {
      goalService.update(id, { showOnHome: !goal.showOnHome });
      setRefresh(r => r + 1);
    }
  };

  const handleCancelExtra = () => {
    setEditGoal(undefined);
    setShowExtraForm(false);
    setShowEditDialog(false);
  };

  const handleEditSave = (data: Omit<ExtraGoal, 'id' | 'createdAt'>) => {
    if (editGoal) goalService.update(editGoal.id, data);
    setEditGoal(undefined);
    setShowEditDialog(false);
    setRefresh(r => r + 1);
  };

  const handleSavePrimary = () => {
    setShowPrimaryForm(false);
    setRefresh(r => r + 1);
  };

  // Delete a specific period - smart: extend previous period to fill gap
  const handleDeletePeriod = (id: string) => {
    primaryGoalService.delete(id);
    setRefresh(r => r + 1);
  };

  // Handle deleting the current (active) goal
  const handleDeleteCurrentGoal = () => {
    if (allPeriods.length <= 1) {
      // No previous goal to fall back to
      setDeleteCurrentMode('confirm-only');
    } else {
      setDeleteCurrentMode('ask');
    }
  };

  const handleConfirmDeleteCurrent = (action: 'revert' | 'new' | 'delete') => {
    if (action === 'revert' && currentGoal) {
      // Just delete the current period, previous one becomes active
      primaryGoalService.delete(currentGoal.id);
      setRefresh(r => r + 1);
    } else if (action === 'new' && currentGoal) {
      primaryGoalService.delete(currentGoal.id);
      setRefresh(r => r + 1);
      setShowPrimaryForm(true);
    } else if (action === 'delete' && currentGoal) {
      primaryGoalService.delete(currentGoal.id);
      setRefresh(r => r + 1);
    }
    setDeleteCurrentMode(null);
  };

  const handleTogglePrimaryWheelsHome = () => {
    updateSettings({ showPrimaryWheelsOnHome: !settings.showPrimaryWheelsOnHome });
  };

  // Edit period handlers
  const openEditPeriod = (item: PrimaryGoalPeriod & { toDate: string | null }) => {
    setEditingPeriod(item);
    setEditPeriodTarget(String(item.inputTarget));
    setEditPeriodType(item.inputPeriod);
    setEditPeriodFrom(item.validFrom);
  };

  const saveEditPeriod = () => {
    if (!editingPeriod) return;
    const targetNum = parseFloat(editPeriodTarget);
    if (!targetNum || targetNum <= 0) return;
    primaryGoalService.update(editingPeriod.id, {
      inputTarget: targetNum,
      inputPeriod: editPeriodType,
      validFrom: editPeriodFrom,
    });
    setEditingPeriod(null);
    setRefresh(r => r + 1);
  };

  // Build history list with derived "to" dates
  const historyItems = useMemo(() => {
    const sorted = [...allPeriods].sort((a, b) => a.validFrom.localeCompare(b.validFrom));
    return sorted.map((p, i) => {
      const nextFrom = i < sorted.length - 1 ? sorted[i + 1].validFrom : null;
      const toDate = nextFrom
        ? new Date(new Date(nextFrom).getTime() - 86400000).toISOString().slice(0, 10)
        : null;
      return { ...p, toDate };
    });
  }, [allPeriods]);

  const SectionHeader = ({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className="w-full flex items-center gap-1.5 group cursor-pointer">
      <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">{label}</h3>
      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
    </button>
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(t('date.locale'), { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const periodTypeLabel = (p: PrimaryGoalPeriod) =>
    `${p.inputTarget} ${t('goals.sessionsPer')} ${t(`goals.period.${p.inputPeriod}`)}`;

  const periodOptions: { id: GoalPeriod; labelKey: string }[] = [
    { id: 'week', labelKey: 'goalForm.week' },
    { id: 'month', labelKey: 'goalForm.month' },
    { id: 'year', labelKey: 'goalForm.year' },
  ];

  return (
    <div className="space-y-6">
      {/* Primary Goal */}
      <div className="space-y-3">
        <SectionHeader label={t('goals.generalGoal')} open={primaryOpen} onToggle={() => setPrimaryOpen(o => !o)} />

        {primaryOpen && (
          <>
            {showPrimaryForm ? (
              <PrimaryGoalForm
                existing={currentGoal}
                onSave={handleSavePrimary}
                onCancel={() => setShowPrimaryForm(false)}
              />
            ) : currentGoal ? (
              <div className="glass-card rounded-lg p-4 relative">
                {/* Pin-to-home button */}
                <button
                  onClick={handleTogglePrimaryWheelsHome}
                  className={`absolute bottom-2 left-2 p-1 rounded-md transition-colors z-10 ${
                    settings.showPrimaryWheelsOnHome
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground/40 hover:text-muted-foreground'
                  }`}
                  title={settings.showPrimaryWheelsOnHome ? t('goals.removeFromHome') : t('goals.showOnHome')}
                >
                  <Home className="w-3.5 h-3.5" />
                </button>

                {/* Desktop/Tablet: wheels flanking the text info */}
                <div className="hidden md:flex md:items-center md:justify-center md:gap-4">
                  <div className="flex-shrink-0">
                    <ProgressWheel
                      percent={monthData.percent}
                      current={monthData.current}
                      target={monthData.target}
                      unit={monthData.unit}
                      title=""
                      hasGoal={true}
                      expectedFraction={monthData.expectedFraction}
                      paceDiff={monthData.diff}
                      naked
                    />
                  </div>

                  <div className="flex flex-col items-center text-center justify-center py-1">
                    <div className="flex items-center gap-1">
                      <button onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                      </button>
                      <span className="text-lg font-bold text-foreground min-w-[120px] text-center">
                        {t(`month.${wheelMonth}`)}
                      </span>
                      <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 -mt-0.5">
                      <button onClick={handlePrevYear} className="p-1 rounded-lg hover:bg-secondary/60 transition-colors">
                        <ChevronLeft className="w-4 h-4 text-muted-foreground/60" />
                      </button>
                      <span className="text-sm font-semibold text-muted-foreground min-w-[50px] text-center">
                        {wheelYear}
                      </span>
                      <button onClick={handleNextYear} className="p-1 rounded-lg hover:bg-secondary/60 transition-colors">
                        <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                      </button>
                    </div>
                    <div className="h-5 flex items-center">
                      {!isToday && (
                        <button onClick={handleGoToday} className="px-3 py-0.5 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                          {t('common.today')}
                        </button>
                      )}
                    </div>
                    <TargetIcon className="w-5 h-5 mb-1.5" />
                    <p className="text-xl font-bold text-foreground">
                      {viewedGoal ? viewedGoal.inputTarget : currentGoal.inputTarget} {t('goals.sessionsPer')} {viewedGoal ? t(`goals.period.${viewedGoal.inputPeriod}`) : periodLabel}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                      <span><span className="font-semibold text-foreground text-base">{Math.round(weekTarget * 10) / 10}</span> {t('goals.perWeek')}</span>
                      <span className="text-border">·</span>
                      <span><span className="font-semibold text-foreground text-base">{Math.round(monthTargetVal * 10) / 10}</span> {t('goals.perMonth')}</span>
                      <span className="text-border">·</span>
                      <span><span className="font-semibold text-foreground text-base">{Math.round(yearTarget)}</span> {t('goals.perYear')}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setShowPrimaryForm(true)} className="px-3 py-1 rounded-md hover:bg-secondary transition-colors text-xs text-muted-foreground">
                        {t('goals.edit')}
                      </button>
                      <button onClick={handleDeleteCurrentGoal} className="px-3 py-1 rounded-md hover:bg-destructive/10 transition-colors text-xs text-destructive">
                        {t('goals.delete')}
                      </button>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <ProgressWheel
                      percent={yearData.percent}
                      current={yearData.current}
                      target={yearData.target}
                      unit={yearData.unit}
                      title=""
                      hasGoal={true}
                      expectedFraction={yearData.expectedFraction}
                      paceDiff={yearData.diff}
                      naked
                    />
                  </div>
                </div>

                {/* Mobile: wheels first, then nav below */}
                <div className="md:hidden space-y-2">
                  <div className="grid grid-cols-2 gap-1">
                    <ProgressWheel
                      percent={monthData.percent}
                      current={monthData.current}
                      target={monthData.target}
                      unit={monthData.unit}
                      title=""
                      hasGoal={true}
                      expectedFraction={monthData.expectedFraction}
                      paceDiff={monthData.diff}
                      naked
                      compact
                    />
                    <ProgressWheel
                      percent={yearData.percent}
                      current={yearData.current}
                      target={yearData.target}
                      unit={yearData.unit}
                      title=""
                      hasGoal={true}
                      expectedFraction={yearData.expectedFraction}
                      paceDiff={yearData.diff}
                      naked
                      compact
                    />
                  </div>

                  <div className="flex flex-col items-center -mt-1">
                    <div className="flex items-center gap-1">
                      <button onClick={handlePrevMonth} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
                        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                      </button>
                      <span className="text-xl font-bold text-foreground min-w-[120px] text-center">
                        {t(`month.${wheelMonth}`)}
                      </span>
                      <button onClick={handleNextMonth} className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={handlePrevYear} className="p-1 rounded-lg hover:bg-secondary/60 transition-colors">
                        <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/60" />
                      </button>
                      <span className="text-base font-semibold text-muted-foreground min-w-[45px] text-center">
                        {wheelYear}
                      </span>
                      <button onClick={handleNextYear} className="p-1 rounded-lg hover:bg-secondary/60 transition-colors">
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                      </button>
                    </div>
                    <div className="h-5 flex items-center">
                      {!isToday && (
                        <button onClick={handleGoToday} className="px-3 py-0.5 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                          {t('common.today')}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-center text-center pt-2 border-t border-border/30">
                    <TargetIcon className="w-5 h-5 mb-1" />
                    <p className="text-xl font-bold text-foreground">
                      {viewedGoal ? viewedGoal.inputTarget : currentGoal.inputTarget} {t('goals.sessionsPer')} {viewedGoal ? t(`goals.period.${viewedGoal.inputPeriod}`) : periodLabel}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <span><span className="font-semibold text-foreground text-base">{Math.round(weekTarget * 10) / 10}</span> {t('goals.perWeek')}</span>
                      <span className="text-border">·</span>
                      <span><span className="font-semibold text-foreground text-base">{Math.round(monthTargetVal * 10) / 10}</span> {t('goals.perMonth')}</span>
                      <span className="text-border">·</span>
                      <span><span className="font-semibold text-foreground text-base">{Math.round(yearTarget)}</span> {t('goals.perYear')}</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button onClick={() => setShowPrimaryForm(true)} className="px-3 py-1 rounded-md hover:bg-secondary transition-colors text-xs text-muted-foreground">
                        {t('goals.edit')}
                      </button>
                      <button onClick={handleDeleteCurrentGoal} className="px-3 py-1 rounded-md hover:bg-destructive/10 transition-colors text-xs text-destructive">
                        {t('goals.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowPrimaryForm(true)} className="w-full gradient-energy text-primary-foreground">
                <TargetIcon className="w-4 h-4 mr-1" />
                {t('goals.setGoal')}
              </Button>
            )}

            {/* Goal history - show when there are any periods */}
            {allPeriods.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setHistoryOpen(o => !o)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${historyOpen ? '' : '-rotate-90'}`} />
                  {t('goals.previousGoals')}
                </button>
                {historyOpen && (
                  <div className="mt-2 space-y-1">
                    {historyItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs bg-secondary/40 rounded-md px-3 py-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">{periodTypeLabel(item)}</span>
                          <span className="text-muted-foreground">
                            {formatDate(item.validFrom)}
                            {item.toDate ? ` → ${formatDate(item.toDate)}` : ` → ${t('goals.ongoing')}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditPeriod(item)}
                            className="text-muted-foreground/60 hover:text-foreground p-1 rounded hover:bg-secondary transition-colors"
                            title={t('common.edit')}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (!item.toDate) {
                                // This is the current goal
                                handleDeleteCurrentGoal();
                              } else {
                                handleDeletePeriod(item.id);
                              }
                            }}
                            className="text-destructive/60 hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Extra Goals */}
      <div className="space-y-3">
        <SectionHeader label={t('goals.otherGoals')} open={extraOpen} onToggle={() => setExtraOpen(o => !o)} />

        {extraOpen && (
          <>
            {!showExtraForm && (
              <Button variant="outline" onClick={() => setShowExtraForm(true)} className="w-full">
                <Plus className="w-4 h-4 mr-1" />
                {t('goals.addGoal')}
              </Button>
            )}

            {showExtraForm && (
              <GoalForm goal={editGoal} onSave={handleSaveExtra} onCancel={handleCancelExtra} />
            )}

            {extraGoals.length === 0 && !showExtraForm ? (
              <p className="text-center py-6 text-sm text-muted-foreground">{t('goals.noGoalsYet')}</p>
            ) : (
              <DraggableGoalGrid
                goals={extraGoals}
                sessions={sessions}
                onEdit={handleEditExtra}
                onDelete={handleDeleteExtra}
                onToggleHome={handleToggleHome}
                onReorder={() => setRefresh(r => r + 1)}
              />
            )}
          </>
        )}
      </div>

      {/* Edit Extra Goal Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditGoal(undefined); } }}>
        <DialogContent className="max-w-[min(calc(100vw-2rem),26rem)] p-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('goalForm.editGoal')}</DialogTitle>
          </DialogHeader>
          {editGoal && (
            <GoalForm
              goal={editGoal}
              onSave={handleEditSave}
              onCancel={() => { setShowEditDialog(false); setEditGoal(undefined); }}
              embedded
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Period Dialog */}
      <Dialog open={!!editingPeriod} onOpenChange={(open) => { if (!open) setEditingPeriod(null); }}>
        <DialogContent className="max-w-[min(calc(100vw-2rem),22rem)] p-4">
          <DialogHeader>
            <DialogTitle>{t('goalForm.editGoal')}</DialogTitle>
          </DialogHeader>
          {editingPeriod && (
            <div className="space-y-3">
              <div className="flex rounded-lg bg-muted p-1">
                {periodOptions.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setEditPeriodType(p.id)}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                      editPeriodType === p.id
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {t(p.labelKey)}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('goalForm.target')}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editPeriodTarget}
                  onChange={e => setEditPeriodTarget(e.target.value)}
                  className="w-full bg-secondary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('goals.validFrom')}
                </label>
                <input
                  type="date"
                  value={editPeriodFrom}
                  onChange={e => setEditPeriodFrom(e.target.value)}
                  className="w-full bg-secondary rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setEditingPeriod(null)}>
                  {t('common.cancel')}
                </Button>
                <Button className="flex-1" onClick={saveEditPeriod}>
                  {t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Current Goal - with previous goal available */}
      <AlertDialog open={deleteCurrentMode === 'ask'} onOpenChange={(open) => { if (!open) setDeleteCurrentMode(null); }}>
        <AlertDialogContent className="max-w-[min(calc(100vw-2rem),22rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goals.deleteCurrentTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('goals.deleteCurrentDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            <AlertDialogAction onClick={() => handleConfirmDeleteCurrent('revert')} className="w-full">
              {t('goals.revertToPrevious')}
            </AlertDialogAction>
            <AlertDialogAction onClick={() => handleConfirmDeleteCurrent('new')} className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {t('goals.setNewGoal')}
            </AlertDialogAction>
            <AlertDialogCancel className="w-full">{t('common.cancel')}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Current Goal - no previous goal */}
      <AlertDialog open={deleteCurrentMode === 'confirm-only'} onOpenChange={(open) => { if (!open) setDeleteCurrentMode(null); }}>
        <AlertDialogContent className="max-w-[min(calc(100vw-2rem),20rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goals.deleteGoalTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('goals.deleteGoalDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConfirmDeleteCurrent('delete')} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Legacy delete confirm - no longer used but kept for safety */}
      <AlertDialog open={showDeletePrimaryConfirm} onOpenChange={setShowDeletePrimaryConfirm}>
        <AlertDialogContent className="max-w-[min(calc(100vw-2rem),20rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goals.deleteGoalTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('goals.deleteGoalDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { primaryGoalService.clear(); setRefresh(r => r + 1); setShowDeletePrimaryConfirm(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoalsSection;
