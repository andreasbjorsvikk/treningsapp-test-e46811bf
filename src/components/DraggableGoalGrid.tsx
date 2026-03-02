import { useState, useRef, useCallback, useEffect } from 'react';
import { ExtraGoal, WorkoutSession } from '@/types/workout';
import GoalCard from '@/components/GoalCard';

interface DraggableGoalGridProps {
  goals: ExtraGoal[];
  sessions: WorkoutSession[];
  onEdit: (goal: ExtraGoal) => void;
  onDelete: (id: string) => void | Promise<void>;
  onToggleHome: (id: string) => void | Promise<void>;
  onReorder: (orderedIds?: string[]) => void | Promise<void>;
}

const DraggableGoalGrid = ({ goals, sessions, onEdit, onDelete, onToggleHome, onReorder }: DraggableGoalGridProps) => {
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchDragActive = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Prevent text selection during drag
  useEffect(() => {
    if (dragId) {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    } else {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    }
    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [dragId]);

  const handleDrop = useCallback((targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const ids = goals.map(g => g.id);
    const fromIdx = ids.indexOf(dragId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, dragId);
    setDragId(null);
    setDragOverId(null);
    onReorder(ids);
  }, [dragId, goals, onReorder]);

  // Desktop drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, id: string) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchDragActive.current = false;

    longPressTimer.current = setTimeout(() => {
      touchDragActive.current = true;
      setDragId(id);
      if (navigator.vibrate) navigator.vibrate(30);
    }, 400);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);

    if (!touchDragActive.current && (dx > 10 || dy > 10)) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      return;
    }
    if (!touchDragActive.current) return;

    e.preventDefault();
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const card = el?.closest('[data-goal-id]');
    if (card) {
      const overId = card.getAttribute('data-goal-id');
      if (overId) setDragOverId(overId);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (touchDragActive.current && dragOverId) {
      handleDrop(dragOverId);
    }
    touchDragActive.current = false;
    setDragId(null);
    setDragOverId(null);
  }, [dragOverId, handleDrop]);

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
      onTouchMove={handleTouchMove as any}
      onTouchEnd={handleTouchEnd}
    >
      {goals.map(goal => (
        <div
          key={goal.id}
          data-goal-id={goal.id}
          draggable
          onDragStart={(e) => handleDragStart(e, goal.id)}
          onDragOver={(e) => handleDragOver(e, goal.id)}
          onDrop={() => handleDrop(goal.id)}
          onDragEnd={handleDragEnd}
          onTouchStart={(e) => handleTouchStart(e, goal.id)}
          style={{ touchAction: 'auto', WebkitUserSelect: 'none', userSelect: 'none' } as React.CSSProperties}
          className={`transition-all duration-200 cursor-grab active:cursor-grabbing ${
            dragId === goal.id ? 'opacity-50 scale-95' : ''
          } ${dragOverId === goal.id && dragId !== goal.id ? 'ring-2 ring-primary/50 scale-[1.02]' : ''}`}
        >
          <GoalCard
            goal={goal}
            sessions={sessions}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleHome={onToggleHome}
          />
        </div>
      ))}
    </div>
  );
};

export default DraggableGoalGrid;
