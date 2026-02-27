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

const TrendChart = ({ sessions, period, month, year, metric }: TrendChartProps) => {
  const { getTypeColor } = useSettings();
  const isMobile = useIsMobile();
  const suffix = metricSuffix[metric];

  const typeOrder = useMemo(() => {
    const totals: { type: SessionType; total: number }[] = allSessionTypes.map(type => ({
      type,
      total: getMetricValueForType(sessions.filter(s => s.type === type), metric),
    }));
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const items = payload.filter((p: any) => p.value > 0);
    if (items.length === 0) return null;
    return (
      <div className="bg-card/95 backdrop-blur-sm border border-border/50 rounded-xl p-3 text-xs shadow-2xl">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {items.map((item: any) => (
          <div key={item.dataKey} className="flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.fill }} />
            <span className="text-muted-foreground">{sessionTypeConfig[item.dataKey as SessionType]?.label}</span>
            <span className="font-semibold ml-auto">{item.value}{suffix}</span>
          </div>
        ))}
      </div>
    );
  };

  const safeData = useMemo(() => {
    if (data.length > 0) return data;
    return [{ label: '' }];
  }, [data]);

  return (
    <div className="glass-card rounded-2xl p-4 flex flex-col h-full relative overflow-hidden">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={hasData ? data : safeData}
            barCategoryGap={isMobile ? '10%' : '15%'}
            margin={{ top: 8, right: 4, left: -4, bottom: 0 }}
          >
            <defs>
              <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--border))" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(var(--border))" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="none"
              stroke="url(#gridGrad)"
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: isMobile ? 9 : 10, fill: 'hsl(var(--muted-foreground))' }}
              interval={isMobile && period === 'month' ? 4 : 0}
              tickLine={false}
              axisLine={false}
              angle={period === 'month' && !isMobile ? -45 : 0}
              textAnchor={period === 'month' && !isMobile ? 'end' : 'middle'}
              height={period === 'month' && !isMobile ? 35 : 25}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickLine={false}
              axisLine={false}
              width={isMobile ? 28 : 42}
              tickFormatter={(v) => `${v}`}
            />
            {hasData && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3, radius: 4 }} />}
            {hasData && typeOrder.map((type, i) => (
              <Bar
                key={type}
                dataKey={type}
                stackId="stack"
                fill={getTypeColor(type)}
                radius={i === typeOrder.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                style={{ filter: 'brightness(1.05)' }}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px] rounded-2xl">
          <p className="text-sm text-muted-foreground">Ingen data for denne perioden.</p>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
