import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, AreaChart, Area, LineChart, Line } from 'recharts';
import { WorkoutSession, SessionType } from '@/types/workout';
import { Period } from '@/components/PeriodSelector';
import { ChartMetric } from '@/components/MetricSelector';
import { allSessionTypes, sessionTypeConfig } from '@/utils/workoutUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { getActivityColors } from '@/utils/activityColors';

interface TrendChartProps {
  sessions: WorkoutSession[];
  period: Period;
  month: number;
  year: number;
  metric: ChartMetric;
  chartType?: 'bar' | 'line';
  selectedTypes?: SessionType[];
}

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

function getMetricValueForType(sessions: WorkoutSession[], metric: ChartMetric): number {
  switch (metric) {
    case 'sessions': return sessions.length;
    case 'distance': return Math.round(sessions.reduce((s, w) => s + (w.distance || 0), 0) * 10) / 10;
    case 'elevation': return Math.round(sessions.reduce((s, w) => s + (w.elevationGain || 0), 0));
    case 'minutes': return sessions.reduce((s, w) => s + w.durationMinutes, 0);
    case 'steps': return 0;
  }
}

const metricSuffix: Record<ChartMetric, string> = {
  sessions: '',
  distance: ' km',
  elevation: ' m',
  minutes: ' t',
  steps: '',
};

const metricUnitLabel: Record<ChartMetric, string> = {
  sessions: 'Økter',
  distance: 'Km',
  elevation: 'Meter',
  minutes: 'Timer',
  steps: 'Skritt',
};

const TrendChart = ({ sessions, period, month, year, metric, chartType = 'bar', selectedTypes }: TrendChartProps) => {
  const { getTypeColor, settings } = useSettings();
  const isMobile = useIsMobile();
  const isDark = settings.darkMode;
  const suffix = metricSuffix[metric];

  const disabledTypes = settings.disabledSessionTypes || [];
  const enabledTypes = allSessionTypes.filter(t => !disabledTypes.includes(t));
  const isAllSelected = selectedTypes ? enabledTypes.every(t => selectedTypes.includes(t)) : true;

  const typeOrder = useMemo(() => {
    const totals: { type: SessionType; total: number }[] = allSessionTypes.map(type => ({
      type,
      total: getMetricValueForType(sessions.filter(s => s.type === type), metric),
    }));
    totals.sort((a, b) => b.total - a.total);
    return totals.filter(t => t.total > 0).map(t => t.type);
  }, [sessions, metric]);

  const typeColors = useMemo(() => {
    const colors: Record<string, string> = {};
    for (const type of typeOrder) {
      colors[type] = getActivityColors(type, isDark).bg;
    }
    return colors;
  }, [typeOrder, isDark]);

  const data = useMemo(() => {
    const buildEntry = (label: string, bucketSessions: WorkoutSession[]) => {
      const entry: Record<string, string | number> = { label };
      let total = 0;
      for (const type of typeOrder) {
        const val = getMetricValueForType(bucketSessions.filter(s => s.type === type), metric);
        entry[type] = val;
        total += val;
      }
      entry._total = total;
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
      <div className="bg-card/95 backdrop-blur-md border border-border/40 rounded-2xl p-3.5 text-xs shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <p className="font-display font-bold text-foreground mb-2 text-sm">{label}</p>
        {items.map((item: any) => {
          const isTotal = item.dataKey === '_total';
          const color = isTotal ? 'hsl(var(--foreground))' : (typeColors[item.dataKey] || getTypeColor(item.dataKey as SessionType));
          return (
            <div key={item.dataKey} className="flex items-center gap-2.5 py-0.5">
              <span className="w-3 h-3 rounded-md" style={{ backgroundColor: color }} />
              <span className="text-muted-foreground">{isTotal ? 'Totalt' : sessionTypeConfig[item.dataKey as SessionType]?.label}</span>
              <span className="font-bold ml-auto text-foreground">{metric === 'minutes' ? `${Math.round(item.value / 60 * 10) / 10}` : item.value}{suffix}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const safeData = useMemo(() => {
    if (data.length > 0) return data;
    return [{ label: '' }];
  }, [data]);

  // Foreground color for "all" combined line
  const foregroundColor = isDark ? 'hsl(0, 0%, 95%)' : 'hsl(0, 0%, 10%)';

  return (
    <div className="rounded-2xl p-4 flex flex-col h-full relative overflow-hidden bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border border-border/30 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="absolute top-2.5 left-4 z-10">
        <span className="text-[10px] font-semibold text-muted-foreground">{metricUnitLabel[metric]}</span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            // LINE CHART MODE
            isAllSelected ? (
              // All selected: single combined line in foreground color
              <AreaChart
                data={hasData ? data : safeData}
                margin={{ top: 20, right: 4, left: isMobile ? 4 : 6, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="gradient-all" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={foregroundColor} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={foregroundColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.25} horizontal={true} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: isMobile ? 9 : 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                  interval={isMobile && period === 'month' ? 4 : 0}
                  tickLine={false}
                  axisLine={false}
                  height={25}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  width={isMobile ? 32 : 42}
                  tickFormatter={(v) => metric === 'minutes' ? `${Math.round(v / 60 * 10) / 10}` : `${v}`}
                />
                {hasData && <Tooltip content={<CustomTooltip />} />}
                {hasData && (
                  <Area
                    dataKey="_total"
                    type="monotone"
                    stroke={foregroundColor}
                    strokeWidth={2}
                    fill="url(#gradient-all)"
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                  />
                )}
              </AreaChart>
            ) : (
              // Individual types: non-stacked lines
              <LineChart
                data={hasData ? data : safeData}
                margin={{ top: 20, right: 4, left: isMobile ? 4 : 6, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.25} horizontal={true} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: isMobile ? 9 : 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                  interval={isMobile && period === 'month' ? 4 : 0}
                  tickLine={false}
                  axisLine={false}
                  height={25}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                  tickLine={false}
                  axisLine={false}
                  width={isMobile ? 32 : 42}
                  tickFormatter={(v) => metric === 'minutes' ? `${Math.round(v / 60 * 10) / 10}` : `${v}`}
                />
                {hasData && <Tooltip content={<CustomTooltip />} />}
                {hasData && typeOrder.map((type) => (
                  <Line
                    key={type}
                    dataKey={type}
                    type="monotone"
                    stroke={typeColors[type]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                  />
                ))}
              </LineChart>
            )
          ) : (
            // BAR CHART MODE (unchanged stacked behavior)
            <BarChart
              data={hasData ? data : safeData}
              barCategoryGap={isMobile ? '12%' : '20%'}
              margin={{ top: 20, right: 4, left: isMobile ? 4 : 6, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.25} horizontal={true} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: isMobile ? 9 : 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                interval={isMobile && period === 'month' ? 4 : 0}
                tickLine={false}
                axisLine={false}
                height={25}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                width={isMobile ? 32 : 42}
                tickFormatter={(v) => metric === 'minutes' ? `${Math.round(v / 60 * 10) / 10}` : `${v}`}
              />
              {hasData && <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2, radius: 6 }} />}
              {hasData && typeOrder.map((type, typeIdx) => {
                const color = typeColors[type];
                const isLastType = typeIdx === typeOrder.length - 1;
                return (
                  <Bar
                    key={type}
                    dataKey={type}
                    stackId="stack"
                    radius={[0, 0, 0, 0]}
                    fill="none"
                    shape={(props: any) => {
                      const { x, y, width, height, fill: cellFill } = props;
                      if (!height || height <= 0) return null;
                      const dataIndex = props.index;
                      const entry = data[dataIndex];
                      let isTop = isLastType;
                      if (!isLastType && entry) {
                        const laterTypes = typeOrder.slice(typeIdx + 1);
                        isTop = laterTypes.every(t => !(entry[t] as number > 0));
                      }
                      const r = isTop ? 4 : 0;
                      if (r === 0) return <rect x={x} y={y} width={width} height={height} fill={cellFill} />;
                      return (
                        <path d={`M${x},${y + r} Q${x},${y} ${x + r},${y} L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} L${x + width},${y + height} L${x},${y + height} Z`} fill={cellFill} />
                      );
                    }}
                  >
                    {data.map((_, index) => (
                      <Cell key={index} fill={color} />
                    ))}
                  </Bar>
                );
              })}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {!hasData && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[2px] rounded-2xl">
          <p className="text-sm text-muted-foreground font-medium">Ingen data for denne perioden.</p>
        </div>
      )}
    </div>
  );
};

export default TrendChart;
