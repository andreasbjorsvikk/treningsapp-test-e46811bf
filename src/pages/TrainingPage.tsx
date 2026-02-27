import { useState, useCallback, useMemo } from 'react';
import { SessionType, WorkoutSession } from '@/types/workout';
import GoalsSection from '@/components/GoalsSection';
import { workoutService } from '@/services/workoutService';
import { goalService } from '@/services/goalService';
import { allSessionTypes } from '@/utils/workoutUtils';
import { findGoalForPeriod, computeProgress, metricLabels } from '@/utils/goalUtils';
import SessionCard from '@/components/SessionCard';
import TypeFilter from '@/components/TypeFilter';
import WorkoutDialog from '@/components/WorkoutDialog';
import PeriodSelector, { Period } from '@/components/PeriodSelector';
import ActivityTypeFilter from '@/components/ActivityTypeFilter';
import StatsTiles from '@/components/StatsTiles';
import TrendChart from '@/components/TrendChart';
import ProgressWheel from '@/components/ProgressWheel';
import MetricSelector, { ChartMetric } from '@/components/MetricSelector';
import { TrainingSubTab } from '@/components/BottomNav';

interface TrainingPageProps {
  initialStatPeriod?: 'month' | 'year';
  subTab: TrainingSubTab;
}

const monthNames = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember',
];

const TrainingPage = ({ initialStatPeriod, subTab }: TrainingPageProps) => {
  const [filterType, setFilterType] = useState<SessionType | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<WorkoutSession | undefined>();
  const [, setRefresh] = useState(0);

  const now = new Date();
  const [period, setPeriod] = useState<Period>(initialStatPeriod || 'month');
  const [statMonth, setStatMonth] = useState(now.getMonth());
  const [statYear, setStatYear] = useState(now.getFullYear());
  const [selectedTypes, setSelectedTypes] = useState<SessionType[]>([...allSessionTypes]);
  const [chartMetric, setChartMetric] = useState<ChartMetric>('minutes');

  const allSessions = workoutService.getAll();
  const allGoals = goalService.getAll();
  const filtered = filterType === 'all' ? allSessions : allSessions.filter(s => s.type === filterType);

  // Progress wheel data
  const monthGoal = useMemo(() => findGoalForPeriod(allGoals, 'month'), [allGoals]);
  const monthData = useMemo(() => {
    if (!monthGoal) return { current: 0, target: 0, percent: 0, unit: '' };
    const sessions = allSessions.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === statMonth && d.getFullYear() === statYear &&
        (monthGoal.activityType === 'all' || s.type === monthGoal.activityType);
    });
    const current = computeProgress(sessions, monthGoal.metric);
    const target = monthGoal.target;
    const percent = target === 0 ? 0 : (current / target) * 100;
    return { current: Math.round(current * 10) / 10, target, percent, unit: metricLabels[monthGoal.metric] };
  }, [allSessions, monthGoal, statMonth, statYear]);

  const yearGoal = useMemo(() => findGoalForPeriod(allGoals, 'year'), [allGoals]);
  const yearData = useMemo(() => {
    if (!yearGoal) return { current: 0, target: 0, diff: 0, expected: 0, unit: '' };
    const sessions = allSessions.filter(s => {
      const d = new Date(s.date);
      return d.getFullYear() === statYear &&
        (yearGoal.activityType === 'all' || s.type === yearGoal.activityType);
    });
    const current = computeProgress(sessions, yearGoal.metric);
    const target = yearGoal.target;
    const startOfYear = new Date(statYear, 0, 1);
    const endOfYear = new Date(statYear + 1, 0, 1);
    const refDate = statYear === now.getFullYear() ? now : endOfYear;
    const yearFraction = (refDate.getTime() - startOfYear.getTime()) / (endOfYear.getTime() - startOfYear.getTime());
    const expected = target * yearFraction;
    const diff = current - expected;
    return { current: Math.round(current * 10) / 10, target, diff, expected, unit: metricLabels[yearGoal.metric] };
  }, [allSessions, yearGoal, statYear]);

  const statSessions = useMemo(() => {
    let sessions = allSessions.filter(s => selectedTypes.includes(s.type));
    if (period === 'month') {
      sessions = sessions.filter(s => {
        const d = new Date(s.date);
        return d.getMonth() === statMonth && d.getFullYear() === statYear;
      });
    } else if (period === 'year') {
      sessions = sessions.filter(s => new Date(s.date).getFullYear() === statYear);
    }
    return sessions;
  }, [allSessions, selectedTypes, period, statMonth, statYear]);

  const handleToggleType = useCallback((type: SessionType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    workoutService.delete(id);
    setRefresh(r => r + 1);
  }, []);

  const handleEdit = useCallback((session: WorkoutSession) => {
    setEditSession(session);
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback((data: Omit<WorkoutSession, 'id'>) => {
    if (editSession) {
      workoutService.update(editSession.id, data);
    } else {
      workoutService.add(data);
    }
    setEditSession(undefined);
    setRefresh(r => r + 1);
  }, [editSession]);

  return (
    <div className="space-y-4">
      {subTab === 'statistikk' && (
        <div className="space-y-4">
          {/* Wheels on top */}
          <div className="flex gap-2">
            <ProgressWheel
              percent={monthData.percent}
              current={monthData.current}
              target={monthData.target}
              unit={monthData.unit}
              title={`${monthNames[statMonth]} ${statYear}`}
              hasGoal={!!monthGoal}
            />
            <ProgressWheel
              percent={0}
              current={yearData.current}
              target={yearData.target}
              unit={yearData.unit}
              title={String(statYear)}
              hasGoal={!!yearGoal}
              paceMode={{ diff: yearData.diff, expected: yearData.expected }}
            />
          </div>

          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            month={statMonth}
            year={statYear}
            onMonthChange={setStatMonth}
            onYearChange={setStatYear}
          />

          <StatsTiles sessions={statSessions} />
          <ActivityTypeFilter selected={selectedTypes} onToggle={handleToggleType} />
          <MetricSelector selected={chartMetric} onSelect={setChartMetric} />
          
          <div className="h-[280px] lg:h-[360px]">
            <TrendChart sessions={statSessions} period={period} month={statMonth} year={statYear} metric={chartMetric} />
          </div>
        </div>
      )}

      {subTab === 'historikk' && (
        <div className="space-y-4">
          <TypeFilter selected={filterType} onSelect={setFilterType} />
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Ingen økter funnet.</p>
            ) : (
              filtered.map(s => (
                <SessionCard key={s.id} session={s} onEdit={handleEdit} onDelete={handleDelete} />
              ))
            )}
          </div>
        </div>
      )}

      {subTab === 'mål' && <GoalsSection />}

      <WorkoutDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditSession(undefined); }}
        onSave={handleSave}
        session={editSession}
      />
    </div>
  );
};

export default TrainingPage;
