import { ChevronLeft, ChevronRight } from 'lucide-react';

export type Period = 'month' | 'year' | 'total';

interface PeriodSelectorProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
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
  { id: 'month', label: 'Måned' },
  { id: 'year', label: 'År' },
  { id: 'total', label: 'Total' },
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
      <div className="flex justify-center gap-1">
        {periods.map((p) => (
          <button
            key={p.id}
            onClick={() => onPeriodChange(p.id)}
            className={`py-1.5 px-5 rounded-full text-sm font-medium transition-colors ${
              period === p.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        {period !== 'total' ? (
          <>
            <button onClick={handlePrev} className="p-2 rounded-md hover:bg-secondary transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xl font-display font-bold">
              {period === 'month' ? `${monthNames[month]} ${year}` : year}
            </span>
            <button onClick={handleNext} className="p-2 rounded-md hover:bg-secondary transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <div className="p-2 w-8 h-8" aria-hidden />
            <span className="text-xl font-display font-bold">Total</span>
            <div className="p-2 w-8 h-8" aria-hidden />
          </>
        )}
      </div>
    </div>
  );
};

export default PeriodSelector;
