import { useState, useRef, useCallback } from 'react';
import { Plus } from 'lucide-react';
import TargetIcon from '@/components/TargetIcon';
import { ExtraGoal, PrimaryGoal } from '@/types/workout';
import { goalService } from '@/services/goalService';
import { primaryGoalService, convertGoalValue, getProratedTarget } from '@/services/primaryGoalService';
import { workoutService } from '@/services/workoutService';
import { Button } from '@/components/ui/button';
import GoalForm from '@/components/GoalForm';
import GoalCard from '@/components/GoalCard';
import PrimaryGoalForm from '@/components/PrimaryGoalForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';


const GoalsSection = () => {
  const [showExtraForm, setShowExtraForm] = useState(false);
  const [showPrimaryForm, setShowPrimaryForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editGoal, setEditGoal] = useState<ExtraGoal | undefined>();
  const [, setRefresh] = useState(0);

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Drag handlers
  const handleDragStart = useCallback((id: string) => {
    setDragId(id);
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverId(id);
  }, []);

  const handleDrop = useCallback((targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      setIsDragging(false);
      return;
    }
    const ids = extraGoals.map(g => g.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, dragId);
    goalService.reorder(ids);
    setDragId(null);
    setDragOverId(null);
    setIsDragging(false);
    setRefresh(r => r + 1);
  }, [dragId, extraGoals]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
    setIsDragging(false);
  }, []);

  // Touch-based drag
  const touchDragId = useRef<string | null>(null);
  const touchClone = useRef<HTMLElement | null>(null);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      touchDragId.current = id;
      setDragId(id);
      setIsDragging(true);
      // Haptic feedback if available
      if (navigator.vibrate) navigator.vibrate(30);
    }, 400);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    // Cancel long press if moved too much before timer
    if (!touchDragId.current && (dx > 10 || dy > 10)) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      return;
    }
    if (!touchDragId.current) return;
    e.preventDefault();
    // Find element under touch
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = el?.closest('[data-goal-id]');
    if (card) {
      const overId = card.getAttribute('data-goal-id');
      if (overId) setDragOverId(overId);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (touchDragId.current && dragOverId) {
      handleDrop(dragOverId);
    }
    touchDragId.current = null;
    setDragId(null);
    setDragOverId(null);
    setIsDragging(false);
  }, [dragOverId, handleDrop]);

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
                <button onClick={handleDeletePrimary} className="px-3 py-1 rounded-md hover:bg-destructive/10 transition-colors text-xs text-destructive">
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
          <div
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
            onTouchMove={handleTouchMove as any}
            onTouchEnd={handleTouchEnd}
          >
            {extraGoals.map(goal => (
              <div
                key={goal.id}
                data-goal-id={goal.id}
                draggable
                onDragStart={() => handleDragStart(goal.id)}
                onDragOver={(e) => handleDragOver(e, goal.id)}
                onDrop={() => handleDrop(goal.id)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, goal.id)}
                className={`transition-all duration-200 ${
                  dragId === goal.id ? 'opacity-50 scale-95' : ''
                } ${dragOverId === goal.id && dragId !== goal.id ? 'ring-2 ring-primary/50 scale-[1.02]' : ''}`}
              >
                <GoalCard
                  goal={goal}
                  sessions={sessions}
                  onEdit={handleEditExtra}
                  onDelete={handleDeleteExtra}
                  onToggleHome={handleToggleHome}
                />
              </div>
            ))}
          </div>
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
    </div>
  );
};

export default GoalsSection;
