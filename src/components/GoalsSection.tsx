import { useState } from 'react';
import { Plus } from 'lucide-react';
import { GoalMetric, GoalPeriod, SessionType, WorkoutGoal } from '@/types/workout';
import { goalService } from '@/services/goalService';
import { workoutService } from '@/services/workoutService';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import { Button } from '@/components/ui/button';
import GoalForm from '@/components/GoalForm';
import GoalCard from '@/components/GoalCard';

const GoalsSection = () => {
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState<WorkoutGoal | undefined>();
  const [, setRefresh] = useState(0);

  const goals = goalService.getAll();
  const sessions = workoutService.getAll();

  const handleSave = (data: Omit<WorkoutGoal, 'id' | 'createdAt'>) => {
    if (editGoal) {
      goalService.update(editGoal.id, data);
    } else {
      goalService.add(data);
    }
    setEditGoal(undefined);
    setShowForm(false);
    setRefresh(r => r + 1);
  };

  const handleEdit = (goal: WorkoutGoal) => {
    setEditGoal(goal);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    goalService.delete(id);
    setRefresh(r => r + 1);
  };

  const handleCancel = () => {
    setEditGoal(undefined);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {!showForm && (
        <Button
          onClick={() => setShowForm(true)}
          className="w-full gradient-energy text-primary-foreground"
        >
          <Plus className="w-4 h-4 mr-1" />
          Opprett nytt mål
        </Button>
      )}

      {showForm && (
        <GoalForm
          goal={editGoal}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}

      {goals.length === 0 && !showForm ? (
        <p className="text-center py-12 text-sm text-muted-foreground">
          Du har ingen mål ennå. Opprett et for å komme i gang! 🎯
        </p>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              sessions={sessions}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GoalsSection;
