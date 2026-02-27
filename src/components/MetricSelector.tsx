export type ChartMetric = 'sessions' | 'distance' | 'elevation' | 'minutes';

interface MetricSelectorProps {
  selected: ChartMetric;
  onSelect: (m: ChartMetric) => void;
}

const metrics: { id: ChartMetric; label: string }[] = [
  { id: 'sessions', label: 'Økter' },
  { id: 'distance', label: 'Distanse' },
  { id: 'elevation', label: 'Høydemeter' },
  { id: 'minutes', label: 'Total tid' },
];

const MetricSelector = ({ selected, onSelect }: MetricSelectorProps) => {
  return (
    <div className="flex gap-1 flex-wrap justify-center">
      {metrics.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors border ${
            selected === m.id
              ? 'bg-primary/15 text-primary border-primary/40 shadow-sm'
              : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};

export default MetricSelector;
