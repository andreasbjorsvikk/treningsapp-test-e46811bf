import { useCallback, useState } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { hapticsService } from '@/services/hapticsService';
import { SessionType, WorkoutSession } from '@/types/workout';
import { Period } from '@/components/PeriodSelector';
import { ChartMetric } from '@/components/MetricSelector';
import { useSwipe } from '@/hooks/use-swipe';
import PeriodSelector from '@/components/PeriodSelector';
import StatsTiles from '@/components/StatsTiles';
import ActivityTypeFilter from '@/components/ActivityTypeFilter';
import MetricSelector from '@/components/MetricSelector';
import TrendChart from '@/components/TrendChart';
import ProgressWheel from '@/components/ProgressWheel';
import { PrimaryGoalPeriod } from '@/types/workout';

interface StatistikkContentProps {
  period: Period;
  setPeriod: (p: Period) => void;
  statMonth: number;
  setStatMonth: (m: number) => void;
  statYear: number;
  setStatYear: (y: number) => void;
  statSessions: WorkoutSession[];
  selectedTypes: SessionType[];
  handleToggleType: (type: SessionType) => void;
  chartMetric: ChartMetric;
  setChartMetric: (m: ChartMetric) => void;
  monthData: { percent: number; current: number; target: number; unit: string; expectedFraction: number; diff: number };
  yearData: { percent: number; current: number; target: number; unit: string; expectedFraction: number; diff: number };
  monthNames: string[];
  primaryGoal: PrimaryGoalPeriod | null;
  onGoToGoals: () => void;
}

const StatistikkContent = ({
  period, setPeriod,
  statMonth, setStatMonth,
  statYear, setStatYear,
  statSessions,
  selectedTypes, handleToggleType,
  chartMetric, setChartMetric,
  monthData, yearData,
  monthNames, primaryGoal,
  onGoToGoals,
}: StatistikkContentProps) => {
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const handlePrev = useCallback(() => {
    if (period === 'month') {
      if (statMonth === 0) { setStatMonth(11); setStatYear(statYear - 1); }
      else setStatMonth(statMonth - 1);
    } else if (period === 'year') {
      setStatYear(statYear - 1);
    }
  }, [period, statMonth, statYear, setStatMonth, setStatYear]);

  const handleNext = useCallback(() => {
    if (period === 'month') {
      if (statMonth === 11) { setStatMonth(0); setStatYear(statYear + 1); }
      else setStatMonth(statMonth + 1);
    } else if (period === 'year') {
      setStatYear(statYear + 1);
    }
  }, [period, statMonth, statYear, setStatMonth, setStatYear]);

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrev,
  });

  return (
    <div className="space-y-4" style={{ touchAction: 'pan-y' }} {...swipeHandlers}>
      {/* Desktop: wheels left, chart+stats right */}
      <div className="lg:grid lg:grid-cols-[auto_1fr] lg:gap-6 space-y-4 lg:space-y-0">
        {/* Left column: wheels stacked - desktop only */}
        <div className="hidden lg:grid lg:grid-cols-1 lg:w-64 lg:gap-3">
          <ProgressWheel
            percent={monthData.percent}
            current={monthData.current}
            target={monthData.target}
            unit={monthData.unit}
            title={`${monthNames[statMonth]} ${statYear}`}
            hasGoal={!!primaryGoal}
            expectedFraction={monthData.expectedFraction}
            paceDiff={monthData.diff}
            onClick={onGoToGoals}
          />
          <ProgressWheel
            percent={yearData.percent}
            current={yearData.current}
            target={yearData.target}
            unit={yearData.unit}
            title={String(statYear)}
            hasGoal={!!primaryGoal}
            expectedFraction={yearData.expectedFraction}
            paceDiff={yearData.diff}
            onClick={onGoToGoals}
          />
        </div>

        {/* Right column: period, tiles, filter, chart */}
        <div className="space-y-4">
          <PeriodSelector
            period={period}
            onPeriodChange={setPeriod}
            month={statMonth}
            year={statYear}
            onMonthChange={setStatMonth}
            onYearChange={setStatYear}
          />

          <StatsTiles sessions={statSessions} />
          <div className={chartMetric === 'steps' ? 'opacity-40 pointer-events-none' : ''}>
            <ActivityTypeFilter selected={selectedTypes} onToggle={handleToggleType} chartType={chartType} />
          </div>
          <MetricSelector selected={chartMetric} onSelect={setChartMetric} />

          <div className="h-[280px] lg:h-[360px]">
            <TrendChart sessions={statSessions} period={period} month={statMonth} year={statYear} metric={chartMetric} chartType={chartType} selectedTypes={selectedTypes} />
          </div>

          {/* Chart type toggle */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setChartType('bar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                chartType === 'bar'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Stolpe
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                chartType === 'line'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Linje
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatistikkContent;
