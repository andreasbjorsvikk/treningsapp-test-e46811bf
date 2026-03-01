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

const metricUnitLabel: Record<ChartMetric, string> = {
  sessions: 'Økter',
  distance: 'Km',
  elevation: 'Meter',
  minutes: 'Min',
};

// Lighten a hex color by a percentage
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round((255 - (num >> 16)) * percent));
  const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round((255 - ((num >> 8) & 0x00FF)) * percent));
  const b = Math.min(255, (num & 0x0000FF) + Math.round((255 - (num & 0x0000FF)) * percent));
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}


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
      <div className="bg-card/95 backdrop-blur-md border border-border/40 rounded-2xl p-3.5 text-xs shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
        <p className="font-display font-bold text-foreground mb-2 text-sm">{label}</p>
        {items.map((item: any) => {
          const baseColor = getTypeColor(item.dataKey as SessionType);
          return (
            <div key={item.dataKey} className="flex items-center gap-2.5 py-0.5">
              <span 
                className="w-3 h-3 rounded-md" 
                style={{ 
                  background: `linear-gradient(135deg, ${lightenColor(baseColor, 0.2)}, ${baseColor})`,
                  boxShadow: `0 2px 6px ${baseColor}50`
                }} 
              />
              <span className="text-muted-foreground">{sessionTypeConfig[item.dataKey as SessionType]?.label}</span>
              <span className="font-bold ml-auto text-foreground">{item.value}{suffix}</span>
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

  return (
    <div className="rounded-2xl p-4 flex flex-col h-full relative overflow-hidden bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-xl border border-border/30 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      {/* Unit label rendered outside the chart for reliable positioning */}
      <div className="absolute top-2.5 left-4 z-10">
        <span className="text-[10px] font-semibold text-muted-foreground">{metricUnitLabel[metric]}</span>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={hasData ? data : safeData}
            barCategoryGap={isMobile ? '12%' : '20%'}
            margin={{ top: 20, right: 4, left: isMobile ? 2 : 4, bottom: 0 }}
          >
            <defs />
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              strokeOpacity={0.25}
              horizontal={true}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: isMobile ? 9 : 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
              interval={isMobile && period === 'month' ? 4 : 0}
              tickLine={false}
              axisLine={false}
              angle={0}
              textAnchor="middle"
              height={25}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              width={isMobile ? 30 : 42}
              tickFormatter={(v) => `${v}`}
            />
            {hasData && (
              <Tooltip 
                content={<CustomTooltip />} 
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2, radius: 6 }} 
              />
            )}
            {hasData && typeOrder.map((type, i) => {
              const baseColor = getTypeColor(type);
              return (
                <Bar
                  key={type}
                  dataKey={type}
                  stackId="stack"
                  fill={baseColor}
                  radius={i === typeOrder.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                />
              );
            })}
          </BarChart>
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
