import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { WorkoutSession } from '@/types/workout';
import { Period } from '@/components/PeriodSelector';
import { ChartMetric } from '@/components/MetricSelector';

interface TrendChartProps {
  sessions: WorkoutSession[];
  period: Period;
  month: number;
  year: number;
  metric: ChartMetric;
}

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

const metricConfig: Record<ChartMetric, { dataKey: string; suffix: string; tooltipLabel: string }> = {
  sessions: { dataKey: 'Økter', suffix: '', tooltipLabel: 'Økter' },
  distance: { dataKey: 'Distanse', suffix: ' km', tooltipLabel: 'Distanse' },
  elevation: { dataKey: 'Høydemeter', suffix: ' m', tooltipLabel: 'Høydemeter' },
  minutes: { dataKey: 'Minutter', suffix: ' min', tooltipLabel: 'Tid' },
};

function getMetricValue(sessions: WorkoutSession[], metric: ChartMetric): number {
  switch (metric) {
    case 'sessions': return sessions.length;
    case 'distance': return Math.round(sessions.reduce((s, w) => s + (w.distance || 0), 0) * 10) / 10;
    case 'elevation': return Math.round(sessions.reduce((s, w) => s + (w.elevationGain || 0), 0));
    case 'minutes': return sessions.reduce((s, w) => s + w.durationMinutes, 0);
  }
}

const TrendChart = ({ sessions, period, month, year, metric }: TrendChartProps) => {
  const config = metricConfig[metric];

  const data = useMemo(() => {
    if (period === 'month') {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const daySessions = sessions.filter(s => s.date.startsWith(dateStr));
        return { label: day.toString(), value: getMetricValue(daySessions, metric) };
      });
    }

    if (period === 'year') {
      return Array.from({ length: 12 }, (_, i) => {
        const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
        const monthSessions = sessions.filter(s => s.date.startsWith(monthStr));
        return { label: monthLabels[i], value: getMetricValue(monthSessions, metric) };
      });
    }

    // Total: group by year
    const allYears = new Set(sessions.map(s => new Date(s.date).getFullYear()));
    const minYear = Math.min(...allYears);
    const maxYear = Math.max(...allYears);
    if (allYears.size === 0) return [];
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => {
      const y = minYear + i;
      const yearSessions = sessions.filter(s => new Date(s.date).getFullYear() === y);
      return { label: y.toString(), value: getMetricValue(yearSessions, metric) };
    });
  }, [sessions, period, month, year, metric]);

  const hasData = data.some(d => d.value > 0);

  return (
    <div className="glass-card rounded-lg p-4">
      <h4 className="text-sm font-medium text-muted-foreground mb-4">{config.tooltipLabel}</h4>
      {!hasData ? (
        <p className="text-center py-8 text-sm text-muted-foreground">Ingen data for denne perioden.</p>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                interval={period === 'month' ? 4 : 0}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                width={35}
                tickFormatter={(v) => `${v}${config.suffix}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [`${value}${config.suffix}`, config.tooltipLabel]}
              />
              <Bar
                dataKey="value"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
