import { ChevronLeft, ChevronRight } from 'lucide-react';

export type Period = '7d' | 'month' | 'year';

interface PeriodSelectorProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
  /** For month: 0-11, for year: full year */
  month: number;
  year: number;
  onMonthChange: (m: number) => void;
  onYearChange: (y: number) => void;
}

const monthNames = [
  'Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Desember',
];

const periods: { id: Period; label: string }[] = [
  { id: '7d', label: '7 dager' },
  { id: 'month', label: 'Måned' },
  { id: 'year', label: 'År' },
];

const PeriodSelector = ({ period, onPeriodChange, month, year, onMonthChange, onYearChange }: PeriodSelectorProps) => {
  const handlePrev = () => {
    if (period === 'month') {
      if (month === 0) { onMonthChange(11); onYearChange(year - 1); }
      else onMonthChange(month - 1);
    } else if (period === 'year') {
      onYearChange(year - 1);
    }
  };

  const handleNext = () => {
    if (period === 'month') {
      if (month === 11) { onMonthChange(0); onYearChange(year + 1); }
      else onMonthChange(month + 1);
    } else if (period === 'year') {
      onYearChange(year + 1);
    }
  };

  return (
    <div className="space-y-3">
      {/* Period tabs */}
      <div className="flex gap-1 bg-secondary rounded-lg p-1">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              period === p.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Month/Year navigator */}
      {period !== '7d' && (
        <div className="flex items-center justify-between">
          <button onClick={handlePrev} className="p-2 rounded-md hover:bg-secondary transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium">
            {period === 'month' ? `${monthNames[month]} ${year}` : year}
          </span>
          <button onClick={handleNext} className="p-2 rounded-md hover:bg-secondary transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default PeriodSelector;
