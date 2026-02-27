import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { WorkoutSession } from '@/types/workout';
import { Period } from '@/components/PeriodSelector';

interface TrendChartProps {
  sessions: WorkoutSession[];
  period: Period;
  month: number;
  year: number;
}

const dayLabels = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];
const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

const TrendChart = ({ sessions, period, month, year }: TrendChartProps) => {
  const data = useMemo(() => {
    if (period === '7d') {
      // Last 7 days
      const today = new Date();
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().slice(0, 10);
        const daySessions = sessions.filter((s) => s.date.startsWith(dateStr));
        return {
          label: dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1],
          Økter: daySessions.length,
          Minutter: daySessions.reduce((sum, s) => sum + s.durationMinutes, 0)
        };
      });
    }

    if (period === 'month') {
      // Days in month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const daySessions = sessions.filter((s) => s.date.startsWith(dateStr));
        return {
          label: day.toString(),
          Økter: daySessions.length,
          Minutter: daySessions.reduce((sum, s) => sum + s.durationMinutes, 0)
        };
      });
    }

    // Year: per month
    return Array.from({ length: 12 }, (_, i) => {
      const monthStr = `${year}-${String(i + 1).padStart(2, '0')}`;
      const monthSessions = sessions.filter((s) => s.date.startsWith(monthStr));
      return {
        label: monthLabels[i],
        Økter: monthSessions.length,
        Minutter: monthSessions.reduce((sum, s) => sum + s.durationMinutes, 0)
      };
    });
  }, [sessions, period, month, year]);

  const hasData = data.some((d) => d.Minutter > 0);

  return (
    <div className="glass-card rounded-lg p-4">
      <h4 className="text-sm font-medium text-muted-foreground mb-4">Treningstid</h4>
      {!hasData ?
      <p className="text-center py-8 text-sm text-muted-foreground">Ingen data for denne perioden.</p> :

      <div className="h-48">
          <ResponsiveContainer width="100%" height="100%" className="mx-0 shadow-md px-0">
            <BarChart data={data} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
              dataKey="label"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              interval={period === 'month' ? 4 : 0}
              tickLine={false}
              axisLine={false} />

              <YAxis
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={35}
              tickFormatter={(v) => `${v}m`} />

              <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                fontSize: '0.75rem'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`${value} min`, 'Tid']} />

              <Bar
              dataKey="Minutter"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]} />

            </BarChart>
          </ResponsiveContainer>
        </div>
      }
    </div>);

};

export default TrendChart;