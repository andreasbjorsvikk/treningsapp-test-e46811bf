import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { WorkoutSession, SessionType } from '@/types/workout';
import { Period } from '@/components/PeriodSelector';
import { ChartMetric } from '@/components/MetricSelector';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface TrendChartProps {
  sessions: WorkoutSession[];
  period: Period;
  month: number;
  year: number;
  metric: ChartMetric;
}

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

function getMetricValueForType(sessions: WorkoutSession[], metric: ChartMetric): number {
  switch (metric) {
    case 'sessions': return sessions.length;
    case 'distance': return Math.round(sessions.reduce((s, w) => s + (w.distance || 0), 0) * 10) / 10;
    case 'elevation': return Math.round(sessions.reduce((s, w) => s + (w.elevationGain || 0), 0));
    case 'minutes': return sessions.reduce((s, w) => s + w.durationMinutes, 0);
  }
}

const metricSuffix: Record<ChartMetric, string> = {
  sessions: '',
  distance: ' km',
  elevation: ' m',
  minutes: ' min',
};

const metricTooltipLabel: Record<ChartMetric, string> = {
  sessions: 'Økter',
  distance: 'Distanse',
  elevation: 'Høydemeter',
  minutes: 'Tid',
};

const TrendChart = ({ sessions, period, month, year, metric }: TrendChartProps) => {
  const { getTypeColor } = useSettings();
  const isMobile = useIsMobile();
  const suffix = metricSuffix[metric];

  // Compute total per type across ALL sessions to determine stacking order
  const typeOrder = useMemo(() => {
    const totals: { type: SessionType; total: number }[] = allSessionTypes.map(type => ({
      type,
      total: getMetricValueForType(sessions.filter(s => s.type === type), metric),
    }));
    // Sort descending — largest total first (will be at bottom of stack)
    totals.sort((a, b) => b.total - a.total);
    return totals.filter(t => t.total > 0).map(t => t.type);
  }, [sessions, metric]);

  const data = useMemo(() => {
    const buildEntry = (label: string, bucketSessions: WorkoutSession[]) => {
      const entry: Record<string, string | number> = { label };
      for (const type of typeOrder) {
        const val = getMetricValueForType(bucketSessions.filter(s => s.type === type), metric);
        entry[type] = val;
      }
      return entry;
    };

    if (period === 'month') {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return buildEntry(day.toString(), sessions.filter(s => s.date.startsWith(dateStr)));
      });
    }

    if (period === 'year') {
      return Array.from({ length: 12 }, (_, i) => {
        const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
        return buildEntry(monthLabels[i], sessions.filter(s => s.date.startsWith(monthStr)));
      });
    }

    // Total: group by year
    const allYears = new Set(sessions.map(s => new Date(s.date).getFullYear()));
    if (allYears.size === 0) return [];
    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears);
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
      const y = minYear + i;
      return buildEntry(y.toString(), sessions.filter(s => new Date(s.date).getFullYear() === y));
    });
  }, [sessions, period, month, year, metric, typeOrder]);

  const hasData = data.some(d => typeOrder.some(t => (d[t] as number) > 0));

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const items = payload.filter((p: any) => p.value > 0);
    if (items.length === 0) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-lg">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {items.map((item: any) => (
          <div key={item.dataKey} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
            <span className="text-muted-foreground">{sessionTypeConfig[item.dataKey as SessionType]?.label}:</span>
            <span className="font-medium">{item.value}{suffix}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="glass-card rounded-lg p-4 flex flex-col h-full">
      <h4 className="text-sm font-medium text-muted-foreground mb-4">{metricTooltipLabel[metric]}</h4>
      {!hasData ? (
        <p className="text-center py-8 text-sm text-muted-foreground flex-1 flex items-center justify-center">Ingen data for denne perioden.</p>
      ) : (
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                interval={isMobile && period === 'month' ? 4 : 0}
                tickLine={false}
                axisLine={false}
                angle={period === 'month' && !isMobile ? -45 : 0}
                textAnchor={period === 'month' && !isMobile ? 'end' : 'middle'}
                height={period === 'month' && !isMobile ? 35 : 25}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={45}
                tickFormatter={(v) => `${v}${suffix}`}
              />
              <Tooltip content={<CustomTooltip />} />
              {typeOrder.map((type) => (
                <Bar
                  key={type}
                  dataKey={type}
                  stackId="stack"
                  fill={getTypeColor(type)}
                  radius={0}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
