import { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { ExtraGoal, PrimaryGoal } from '@/types/workout';
import { goalService } from '@/services/goalService';
import { primaryGoalService, convertGoalValue } from '@/services/primaryGoalService';
import { workoutService } from '@/services/workoutService';
import { Button } from '@/components/ui/button';
import GoalForm from '@/components/GoalForm';
import GoalCard from '@/components/GoalCard';
import PrimaryGoalForm from '@/components/PrimaryGoalForm';
import { Progress } from '@/components/ui/progress';
import { getSessionsInPeriod, computeProgress, getDaysRemainingInPeriod, getPeriodFractionElapsed } from '@/utils/goalUtils';

const GoalsSection = () => {
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [showPrimaryForm, setShowPrimaryForm] = useState(false);
  const [editGoal, setEditGoal] = useState<ExtraGoal | undefined>();
  const [, setRefresh] = useState(0);

  const primaryGoal = primaryGoalService.get();
  const extraGoals = goalService.getAll();
  const sessions = workoutService.getAll();

  // Primary goal progress (monthly view)
  const primaryMonthTarget = primaryGoal ? convertGoalValue(primaryGoal.inputTarget, primaryGoal.inputPeriod, 'month') : 0;
  const primaryMonthSessions = getSessionsInPeriod(sessions, 'month', 'all');
  const primaryMonthCurrent = primaryMonthSessions.length;
  const primaryMonthPct = primaryMonthTarget > 0 ? Math.min((primaryMonthCurrent / primaryMonthTarget) * 100, 100) : 0;
  const primaryMonthRemaining = Math.max(0, Math.round(primaryMonthTarget) - primaryMonthCurrent);
  const monthDaysLeft = getDaysRemainingInPeriod('month');
  const monthFraction = getPeriodFractionElapsed('month');
  const expectedMonth = primaryMonthTarget * monthFraction;
  const aheadOfSchedule = primaryMonthCurrent >= expectedMonth;

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
    setShowExtraForm(true);
  };

  const handleDeleteExtra = (id: string) => {
    goalService.delete(id);
    setRefresh(r => r + 1);
  };

  const handleCancelExtra = () => {
    setEditGoal(undefined);
    setShowExtraForm(false);
  };

  const handleSavePrimary = () => {
    setShowPrimaryForm(false);
    setRefresh(r => r + 1);
  };

  const handleDeletePrimary = () => {
    primaryGoalService.clear();
    setRefresh(r => r + 1);
  };

  return (
    <div className="space-y-6">
      {/* Primary Goal */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Hovedmål
        </h3>

        {showPrimaryForm ? (
          <PrimaryGoalForm
            existing={primaryGoal}
            onSave={handleSavePrimary}
            onCancel={() => setShowPrimaryForm(false)}
          />
        ) : primaryGoal ? (
          <div className="glass-card rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Target className={`w-5 h-5 ${primaryMonthCurrent >= primaryMonthTarget && primaryMonthTarget > 0 ? 'text-success' : 'text-primary'}`} />
                <div>
                  <p className="text-sm font-semibold">
                    {primaryMonthCurrent} / {Math.round(primaryMonthTarget)} økter denne måneden
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {primaryGoal.inputTarget} økter per {primaryGoal.inputPeriod === 'week' ? 'uke' : primaryGoal.inputPeriod === 'month' ? 'måned' : 'år'}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setShowPrimaryForm(true)} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-xs text-muted-foreground">
                  Endre
                </button>
                <button onClick={handleDeletePrimary} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-xs text-destructive">
                  Slett
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Progress value={primaryMonthPct} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {primaryMonthRemaining > 0 ? `${primaryMonthRemaining} igjen` : '✓ Nådd!'}{' '}
                  · {monthDaysLeft} dager igjen
                </span>
                <span className={aheadOfSchedule ? 'text-success font-medium' : 'text-warning font-medium'}>
                  {aheadOfSchedule ? 'Foran skjema' : 'Bak skjema'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowPrimaryForm(true)}
            className="w-full gradient-energy text-primary-foreground"
          >
            <Target className="w-4 h-4 mr-1" />
            Sett ditt treningsmål
          </Button>
        )}
      </div>

      {/* Extra Goals */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Ekstra mål
        </h3>

        {!showExtraForm && (
          <Button
            variant="outline"
            onClick={() => setShowExtraForm(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Legg til ekstra mål
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
            Ingen ekstra mål ennå.
          </p>
        ) : (
          <div className="space-y-3">
            {extraGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                sessions={sessions}
                onEdit={handleEditExtra}
                onDelete={handleDeleteExtra}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalsSection;
