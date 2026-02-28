import { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';


const GoalsSection = () => {
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [showPrimaryForm, setShowPrimaryForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeletePrimaryConfirm, setShowDeletePrimaryConfirm] = useState(false);
  const [editGoal, setEditGoal] = useState<ExtraGoal | undefined>();
  const [, setRefresh] = useState(0);


  const primaryGoal = primaryGoalService.get();
  const extraGoals = goalService.getAll();
  const sessions = workoutService.getAll();

  const weekTarget = primaryGoal ? getProratedTarget(primaryGoal, 'week') : 0;
  const monthTarget = primaryGoal ? getProratedTarget(primaryGoal, 'month') : 0;
  const yearTarget = primaryGoal ? getProratedTarget(primaryGoal, 'year') : 0;

  const periodLabel = primaryGoal
    ? primaryGoal.inputPeriod === 'week' ? 'uke' : primaryGoal.inputPeriod === 'month' ? 'måned' : 'år'
    : '';

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

  return (
    <div className="space-y-6">
      {/* Primary Goal */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Generelt treningsmål
        </h3>

        {showPrimaryForm ? (
          <PrimaryGoalForm
            existing={primaryGoal}
            onSave={handleSavePrimary}
            onCancel={() => setShowPrimaryForm(false)}
          />
        ) : primaryGoal ? (
          <div className="glass-card rounded-lg p-6 flex flex-col items-center text-center">
              <TargetIcon className="w-6 h-6 mb-2" />
              <p className="text-2xl font-bold text-foreground">
                {primaryGoal.inputTarget} økter per {periodLabel}
              </p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-3">
                <span><span className="font-semibold text-foreground text-base">{Math.round(weekTarget * 10) / 10}</span> /uke</span>
                <span className="text-border">·</span>
                <span><span className="font-semibold text-foreground text-base">{Math.round(monthTarget * 10) / 10}</span> /mnd</span>
                <span className="text-border">·</span>
                <span><span className="font-semibold text-foreground text-base">{Math.round(yearTarget)}</span> /år</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setShowPrimaryForm(true)} className="px-3 py-1 rounded-md hover:bg-secondary transition-colors text-xs text-muted-foreground">
                  Endre
                </button>
                <button onClick={() => setShowDeletePrimaryConfirm(true)} className="px-3 py-1 rounded-md hover:bg-destructive/10 transition-colors text-xs text-destructive">
                  Slett
                </button>
              </div>
          </div>
        ) : (
          <Button
            onClick={() => setShowPrimaryForm(true)}
            className="w-full gradient-energy text-primary-foreground"
          >
            <TargetIcon className="w-4 h-4 mr-1" />
            Sett ditt treningsmål
          </Button>
        )}
      </div>

      {/* Extra Goals */}
      <div className="space-y-3">
        <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Andre mål
        </h3>

        {!showExtraForm && (
          <Button
            variant="outline"
            onClick={() => setShowExtraForm(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-1" />
            Legg til mål
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
            Ingen andre mål ennå.
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
      </div>

      {/* Edit Goal Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) { setShowEditDialog(false); setEditGoal(undefined); } }}>
        <DialogContent className="max-w-[min(calc(100vw-2rem),26rem)] p-4 overflow-hidden">
          <DialogHeader>
            <DialogTitle>Rediger mål</DialogTitle>
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
            <AlertDialogTitle>Slett treningsmål</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette det generelle treningsmålet? Denne handlingen kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={() => { handleDeletePrimary(); setShowDeletePrimaryConfirm(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GoalsSection;
