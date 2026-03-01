import { useState, useMemo } from 'react';
import { Plus, ChevronLeft, ChevronRight, ChevronDown, Home } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import TargetIcon from '@/components/TargetIcon';
import { ExtraGoal, PrimaryGoal } from '@/types/workout';
import { goalService } from '@/services/goalService';
import { primaryGoalService, convertGoalValue, getProratedTarget } from '@/services/primaryGoalService';
import { workoutService } from '@/services/workoutService';
import { Button } from '@/components/ui/button';
import GoalForm from '@/components/GoalForm';
import PrimaryGoalForm from '@/components/PrimaryGoalForm';
import DraggableGoalGrid from '@/components/DraggableGoalGrid';
import ProgressWheel from '@/components/ProgressWheel';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettings } from '@/contexts/SettingsContext';
import { useTranslation } from '@/i18n/useTranslation';

const GoalsSection = () => {
  const { settings, updateSettings } = useSettings();
  const { t } = useTranslation();
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [showPrimaryForm, setShowPrimaryForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeletePrimaryConfirm, setShowDeletePrimaryConfirm] = useState(false);
  const [editGoal, setEditGoal] = useState<ExtraGoal | undefined>();
  const [, setRefresh] = useState(0);

  // Collapsible state
  const [primaryOpen, setPrimaryOpen] = useState(true);
  const [extraOpen, setExtraOpen] = useState(true);

  const now = new Date();
  const [wheelMonth, setWheelMonth] = useState(now.getMonth());
  const [wheelYear, setWheelYear] = useState(now.getFullYear());

  const primaryGoal = primaryGoalService.get();
  const extraGoals = goalService.getAll();
  const sessions = workoutService.getAll();
  const allSessions = sessions;

  const weekTarget = primaryGoal ? getProratedTarget(primaryGoal, 'week') : 0;
  const monthTarget = primaryGoal ? getProratedTarget(primaryGoal, 'month') : 0;
  const yearTarget = primaryGoal ? getProratedTarget(primaryGoal, 'year') : 0;

  const periodLabel = primaryGoal
    ? t(`goals.period.${primaryGoal.inputPeriod}`)
    : '';

  // Navigable month data
  const monthData = useMemo(() => {
    const target = primaryGoal ? getProratedTarget(primaryGoal, 'month') : 0;
    const goalStart = primaryGoal ? new Date(primaryGoal.startDate) : null;
    const current = allSessions.filter(s => {
      const d = new Date(s.date);
      if (d.getMonth() !== wheelMonth || d.getFullYear() !== wheelYear) return false;
      if (goalStart && d < goalStart) return false;
      return true;
    }).length;
    const percent = target === 0 ? 0 : (current / target) * 100;
    const daysInMonth = new Date(wheelYear, wheelMonth + 1, 0).getDate();
    const isCurrentMonth = wheelMonth === now.getMonth() && wheelYear === now.getFullYear();
    const expectedFraction = isCurrentMonth ? now.getDate() / daysInMonth : 1;
    const expected = target * expectedFraction;
    const diff = current - expected;
    return { current, target: Math.round(target * 10) / 10, percent, unit: t('metric.sessions'), expectedFraction, diff };
  }, [allSessions, primaryGoal, wheelMonth, wheelYear, t]);

  // Navigable year data
  const yearData = useMemo(() => {
    const goalStart = primaryGoal ? new Date(primaryGoal.startDate) : null;
    const target = primaryGoal ? getProratedTarget(primaryGoal, 'year') : 0;
    const current = allSessions.filter(s => {
      const d = new Date(s.date);
      if (d.getFullYear() !== wheelYear) return false;
      if (goalStart && d < goalStart) return false;
      return true;
    }).length;
    const effectiveStart = goalStart && goalStart.getFullYear() === wheelYear
      ? Math.max(goalStart.getTime(), new Date(wheelYear, 0, 1).getTime())
      : new Date(wheelYear, 0, 1).getTime();
    const yearEnd = new Date(wheelYear + 1, 0, 1).getTime();
    const totalSpan = yearEnd - effectiveStart;
    const refDate = wheelYear === now.getFullYear() ? now : new Date(wheelYear + 1, 0, 1);
    const elapsedSpan = refDate.getTime() - effectiveStart;
    const fractionElapsed = totalSpan > 0 ? Math.max(0, elapsedSpan / totalSpan) : 1;
    const expected = target * fractionElapsed;
    const diff = current - expected;
    const percent = target === 0 ? 0 : (current / target) * 100;
    return { current, target: Math.round(target), diff, expected, unit: t('metric.sessions'), expectedFraction: fractionElapsed, percent };
  }, [allSessions, primaryGoal, wheelYear, t]);

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

  const handleSaveExtra = (data: Omit<ExtraGoal, 'id' | 'createdAt'>) => {
    if (editGoal) {
      goalService.update(editGoal.id, data);
    } else {
      goalService.add(data);
    }
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
    if (editGoal) {
      goalService.update(editGoal.id, data);
    }
    setEditGoal(undefined);
    setShowEditDialog(false);
    setRefresh(r => r + 1);
  };

  const handleSavePrimary = () => {
    setShowPrimaryForm(false);
    setRefresh(r => r + 1);
  };

  const handleDeletePrimary = () => {
    primaryGoalService.clear();
    setRefresh(r => r + 1);
  };

  const handleTogglePrimaryWheelsHome = () => {
    updateSettings({ showPrimaryWheelsOnHome: !settings.showPrimaryWheelsOnHome });
  };

  // Collapsible section header
  const SectionHeader = ({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 group cursor-pointer"
    >
      <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        {label}
      </h3>
      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Primary Goal */}
      <div className="space-y-3">
        <SectionHeader label={t('goals.generalGoal')} open={primaryOpen} onToggle={() => setPrimaryOpen(o => !o)} />

        {primaryOpen && (
          <>
            {showPrimaryForm ? (
              <PrimaryGoalForm
                existing={primaryGoal}
                onSave={handleSavePrimary}
                onCancel={() => setShowPrimaryForm(false)}
              />
            ) : primaryGoal ? (
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

                {/* Centered month/year navigation */}
                <div className="flex flex-col items-center mb-3">
                  {/* Month nav */}
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
                  {/* Year nav */}
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
                  {/* Today button */}
                  {!isToday && (
                    <button
                      onClick={handleGoToday}
                      className="mt-1 px-3 py-0.5 rounded-md text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      {t('common.today')}
                    </button>
                  )}
                </div>

                {/* Desktop/Tablet: wheels flanking the text info */}
                <div className="hidden md:flex md:items-center md:justify-center md:gap-4">
                  {/* Left wheel - month */}
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

                  {/* Center text info */}
                  <div className="flex flex-col items-center text-center justify-center py-2">
                    <TargetIcon className="w-5 h-5 mb-1.5" />
                    <p className="text-xl font-bold text-foreground">
                      {primaryGoal.inputTarget} {t('goals.sessionsPer')} {periodLabel}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                      <span><span className="font-semibold text-foreground text-base">{Math.round(weekTarget * 10) / 10}</span> {t('goals.perWeek')}</span>
                      <span className="text-border">·</span>
                      <span><span className="font-semibold text-foreground text-base">{Math.round(monthTarget * 10) / 10}</span> {t('goals.perMonth')}</span>
                      <span className="text-border">·</span>
                      <span><span className="font-semibold text-foreground text-base">{Math.round(yearTarget)}</span> {t('goals.perYear')}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setShowPrimaryForm(true)} className="px-3 py-1 rounded-md hover:bg-secondary transition-colors text-xs text-muted-foreground">
                        {t('goals.edit')}
                      </button>
                      <button onClick={() => setShowDeletePrimaryConfirm(true)} className="px-3 py-1 rounded-md hover:bg-destructive/10 transition-colors text-xs text-destructive">
                        {t('goals.delete')}
                      </button>
                    </div>
                  </div>

                  {/* Right wheel - year */}
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

                {/* Mobile: wheels side-by-side under nav */}
                <div className="md:hidden space-y-3">
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

                  <div className="flex flex-col items-center text-center pt-2 border-t border-border/30">
                    <TargetIcon className="w-5 h-5 mb-1.5" />
                    <p className="text-xl font-bold text-foreground">
                      {primaryGoal.inputTarget} {t('goals.sessionsPer')} {periodLabel}
                    </p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                      <span><span className="font-semibold text-foreground text-base">{Math.round(weekTarget * 10) / 10}</span> {t('goals.perWeek')}</span>
                      <span className="text-border">·</span>
                      <span><span className="font-semibold text-foreground text-base">{Math.round(monthTarget * 10) / 10}</span> {t('goals.perMonth')}</span>
                      <span className="text-border">·</span>
                      <span><span className="font-semibold text-foreground text-base">{Math.round(yearTarget)}</span> {t('goals.perYear')}</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setShowPrimaryForm(true)} className="px-3 py-1 rounded-md hover:bg-secondary transition-colors text-xs text-muted-foreground">
                        {t('goals.edit')}
                      </button>
                      <button onClick={() => setShowDeletePrimaryConfirm(true)} className="px-3 py-1 rounded-md hover:bg-destructive/10 transition-colors text-xs text-destructive">
                        {t('goals.delete')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                onClick={() => setShowPrimaryForm(true)}
                className="w-full gradient-energy text-primary-foreground"
              >
                <TargetIcon className="w-4 h-4 mr-1" />
                {t('goals.setGoal')}
              </Button>
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
              <Button
                variant="outline"
                onClick={() => setShowExtraForm(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('goals.addGoal')}
              </Button>
            )}

            {showExtraForm && (
              <GoalForm
                goal={editGoal}
                onSave={handleSaveExtra}
                onCancel={handleCancelExtra}
              />
            )}

            {extraGoals.length === 0 && !showExtraForm ? (
              <p className="text-center py-6 text-sm text-muted-foreground">
                {t('goals.noGoalsYet')}
              </p>
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

      {/* Edit Goal Dialog */}
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

      {/* Delete Primary Goal Confirmation */}
      <AlertDialog open={showDeletePrimaryConfirm} onOpenChange={setShowDeletePrimaryConfirm}>
        <AlertDialogContent className="max-w-[min(calc(100vw-2rem),20rem)]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goals.deleteGoalTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('goals.deleteGoalDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleDeletePrimary(); setShowDeletePrimaryConfirm(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoalsSection;
