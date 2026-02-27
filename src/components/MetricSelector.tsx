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
    <div className="flex gap-1 flex-wrap">
      {metrics.map((m) => (
        <button
          key={m.id}
          onClick={() => onSelect(m.id)}
          className={`py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
            selected === m.id
              ? 'bg-muted text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
};

export default MetricSelector;
