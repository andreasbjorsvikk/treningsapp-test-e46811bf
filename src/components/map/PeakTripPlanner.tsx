import { useState, useEffect, useMemo } from 'react';
import { format, addDays } from 'date-fns';
import { nb, enUS } from 'date-fns/locale';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Bar, ComposedChart, Area, Line } from 'recharts';
import { Sun, Sunrise, Sunset, Snowflake, Loader2, Wind } from 'lucide-react';
import { useTranslation } from '@/i18n/useTranslation';

interface PeakTripPlannerProps {
  latitude: number;
  longitude: number;
  peakName: string;
}

interface HourlyData {
  hour: string;
  hourNum: number;
  temp: number;
  precip: number;
  weatherCode: number;
  windSpeed: number;
  windDir: number;
}

interface DayForecast {
  date: string;
  label: string;
  hourly: HourlyData[];
  sunrise: string;
  sunset: string;
  snowDepth?: number;
  snowSource?: 'metno' | 'openmeteo';
}

const WEATHER_ICON_BASE = 'https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/';

const mapCodeToSymbol = (code: number): string => {
  if ([0].includes(code)) return 'clearsky_day';
  if ([1, 2].includes(code)) return 'fair_day';
  if ([3].includes(code)) return 'cloudy';
  if ([45, 48].includes(code)) return 'fog';
  if ([51, 53, 55, 56, 57].includes(code)) return 'lightrain';
  if ([61, 63, 65, 66, 67].includes(code)) return 'rain';
  if ([71, 73, 75, 77].includes(code)) return 'snow';
  if ([80, 81, 82].includes(code)) return 'rainshowers_day';
  if ([85, 86].includes(code)) return 'snowshowers_day';
  if ([95, 96, 99].includes(code)) return 'heavyrainandthunder';
  return 'cloudy';
};

// Wind arrow component for top of chart
const WindArrow = (props: any) => {
  const { cx, payload, viewBox } = props;
  if (!payload || payload.hourNum % 3 !== 0) return null;
  const topY = viewBox?.y ?? 0;
  const dir = payload.windDir ?? 0;
  const speed = Math.round(payload.windSpeed ?? 0);
  return (
    <g>
      <g transform={`translate(${cx}, ${topY + 10}) rotate(${dir})`}>
        <line x1={0} y1={-5} x2={0} y2={5} stroke="hsl(var(--muted-foreground))" strokeWidth={1.2} strokeLinecap="round" />
        <polygon points="0,-6 -2.5,-2 2.5,-2" fill="hsl(var(--muted-foreground))" />
      </g>
      <text x={cx} y={topY + 22} textAnchor="middle" fontSize={7} fill="hsl(var(--muted-foreground))">
        {speed}
      </text>
    </g>
  );
};

// Weather icon + temp label on the temp line
const WeatherAnnotation = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload || payload.hourNum % 3 !== 0) return null;
  const symbol = mapCodeToSymbol(payload.weatherCode);
  return (
    <g>
      <image
        href={`${WEATHER_ICON_BASE}${symbol}.svg`}
        width={22}
        height={22}
        x={cx - 11}
        y={cy - 36}
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        fontSize={9}
        fontWeight={600}
        fill="hsl(var(--foreground))"
      >
        {payload.temp}°
      </text>
    </g>
  );
};

import React from 'react';

const PeakTripPlanner = React.forwardRef<HTMLDivElement, PeakTripPlannerProps>(({ latitude, longitude, peakName }, ref) => {
  const { t, language } = useTranslation();
  const locale = language === 'no' ? nb : enUS;
  const [forecasts, setForecasts] = useState<DayForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(0);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        // Use MET Norway Nordic model (1km resolution) for better snow data in Norway
        // Falls back to best_match if metno_nordic doesn't cover the area
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation,snow_depth,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&timezone=auto&forecast_days=10&models=metno_nordic,best_match`
        );
        const data = await res.json();

        // Determine which model provided data
        const hasMetNo = !!data.hourly?.temperature_2m;
        
        const days: DayForecast[] = [];
        for (let d = 0; d < 10; d++) {
          const date = data.daily.time[d];
          const dayDate = addDays(new Date(), d);
          const label = d === 0 
            ? (language === 'no' ? 'I dag' : 'Today')
            : d === 1 
              ? (language === 'no' ? 'I morgen' : 'Tomorrow')
              : format(dayDate, 'EEE d. MMM', { locale });
          
          const hourly: HourlyData[] = [];
          for (let h = 0; h < 24; h++) {
            const idx = d * 24 + h;
            hourly.push({
              hour: `${String(h).padStart(2, '0')}`,
              hourNum: h,
              temp: Math.round(data.hourly.temperature_2m[idx]),
              precip: Math.round(data.hourly.precipitation[idx] * 10) / 10,
              weatherCode: data.hourly.weather_code?.[idx] ?? 3,
              windSpeed: data.hourly.wind_speed_10m?.[idx] ?? 0,
              windDir: data.hourly.wind_direction_10m?.[idx] ?? 0,
            });
          }

          const snowIdx = d * 24 + 12;
          const snowDepth = data.hourly.snow_depth?.[snowIdx];

          const sunriseTime = data.daily.sunrise[d];
          const sunsetTime = data.daily.sunset[d];

          days.push({
            date,
            label,
            hourly,
            sunrise: format(new Date(sunriseTime), 'HH:mm'),
            sunset: format(new Date(sunsetTime), 'HH:mm'),
            snowDepth: snowDepth != null ? Math.round(snowDepth * 100) / 100 : undefined,
            snowSource: hasMetNo ? 'metno' : 'openmeteo',
          });
        }
        setForecasts(days);
      } catch {
        // silent
      }
      setLoading(false);
    };
    fetchForecast();
  }, [latitude, longitude, language]);

  const selected = forecasts[selectedDay];

  const tempDomain = useMemo(() => {
    if (!selected) return [0, 10];
    const temps = selected.hourly.map(h => h.temp);
    const min = Math.floor(Math.min(...temps)) - 2;
    const max = Math.ceil(Math.max(...temps)) + 4;
    return [min, max];
  }, [selected]);

  const tempTicks = useMemo(() => {
    const [min, max] = tempDomain;
    const ticks: number[] = [];
    for (let i = min; i <= max; i++) ticks.push(i);
    if (ticks.length > 10) return ticks.filter((_, idx) => idx % 2 === 0);
    return ticks;
  }, [tempDomain]);

  const precipDomain = useMemo(() => {
    if (!selected) return [0, 5];
    const maxPrecip = Math.max(...selected.hourly.map(h => h.precip), 1);
    return [0, Math.ceil(maxPrecip)];
  }, [selected]);

  const precipTicks = useMemo(() => {
    const [, max] = precipDomain;
    const ticks: number[] = [];
    for (let i = 0; i <= max; i++) ticks.push(i);
    if (ticks.length > 8) return ticks.filter((_, idx) => idx % 2 === 0);
    return ticks;
  }, [precipDomain]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!selected) return null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const windData = selected.hourly.find(h => h.hour === label);
    return (
      <div className="bg-card/95 backdrop-blur-md border border-border/40 rounded-xl p-2.5 text-xs shadow-lg">
        <p className="font-bold text-foreground mb-1">{label}:00</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">
              {p.dataKey === 'temp' ? `${p.value}°C` : `${p.value} mm`}
            </span>
          </div>
        ))}
        {windData && (
          <div className="flex items-center gap-2 mt-0.5">
            <Wind className="w-2 h-2 text-muted-foreground" />
            <span className="text-muted-foreground">{Math.round(windData.windSpeed)} m/s</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {forecasts.map((day, i) => (
          <button
            key={day.date}
            onClick={() => setSelectedDay(i)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              i === selectedDay
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {/* Weather chart */}
      <div className="rounded-xl border border-border/30 bg-card/50 p-3">
        {/* Wind row */}
        <div className="flex items-center gap-1 mb-1 px-1">
          <Wind className="w-3 h-3 text-muted-foreground" />
          <span className="text-[8px] text-muted-foreground">m/s</span>
        </div>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={selected.hourly} margin={{ top: 38, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} 
                tickLine={false} 
                axisLine={false}
                interval={2}
              />
              <YAxis 
                yAxisId="temp"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(v) => `${v}°`}
                domain={tempDomain}
                ticks={tempTicks}
                allowDecimals={false}
              />
              <YAxis 
                yAxisId="precip"
                orientation="right"
                tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} 
                tickLine={false} 
                axisLine={false}
                tickFormatter={(v) => `${v}`}
                domain={precipDomain}
                ticks={precipTicks}
                allowDecimals={false}
                width={25}
                label={{ value: 'mm', position: 'insideTopRight', offset: -20, fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="precip"
                dataKey="precip"
                fill="hsl(210, 80%, 60%)"
                fillOpacity={0.2}
                stroke="hsl(210, 80%, 60%)"
                strokeWidth={0}
                type="stepAfter"
              />
              <Bar
                yAxisId="precip"
                dataKey="precip"
                fill="hsl(210, 80%, 60%)"
                fillOpacity={0.4}
                radius={[2, 2, 0, 0]}
                barSize={8}
              />
              <Line
                yAxisId="temp"
                dataKey="temp"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={<WeatherAnnotation />}
                activeDot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }}
                type="monotone"
              />
              {/* Wind arrows at top */}
              <Line
                yAxisId="temp"
                dataKey="temp"
                stroke="none"
                dot={<WindArrow />}
                activeDot={false}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-primary rounded" /> {language === 'no' ? 'Temperatur' : 'Temperature'}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 bg-[hsl(210,80%,60%)]/40 rounded-sm" /> {language === 'no' ? 'Nedbør' : 'Precipitation'}
          </span>
        </div>
      </div>

      {/* Sunrise/sunset */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg bg-muted/30 border border-border/30">
          <Sunrise className="w-4 h-4 text-amber-500" />
          <p className="text-[10px] text-muted-foreground">{language === 'no' ? 'Soloppgang' : 'Sunrise'}</p>
          <p className="text-sm font-semibold">{selected.sunrise}</p>
        </div>
        <div className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg bg-muted/30 border border-border/30">
          <Sunset className="w-4 h-4 text-orange-500" />
          <p className="text-[10px] text-muted-foreground">{language === 'no' ? 'Solnedgang' : 'Sunset'}</p>
          <p className="text-sm font-semibold">{selected.sunset}</p>
        </div>
      </div>

      {/* Snow conditions */}
      {selected.snowDepth != null && selected.snowDepth > 0 && (
        <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200/30 dark:border-blue-800/30">
          <Snowflake className="w-5 h-5 text-blue-400" />
          <p className="text-[10px] text-muted-foreground">
            {language === 'no' ? 'Snødybde' : 'Snow depth'}
            {selected.snowSource === 'metno' && (
              <span className="ml-1 text-[8px] opacity-60">(MET Nordic 1km)</span>
            )}
          </p>
          <p className="text-sm font-semibold">{selected.snowDepth > 100 ? `${(selected.snowDepth / 100).toFixed(1)} m` : `${Math.round(selected.snowDepth)} cm`}</p>
        </div>
      )}
      {selected.snowDepth != null && selected.snowDepth === 0 && (
        <div className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg bg-muted/20 border border-border/30">
          <Sun className="w-5 h-5 text-green-500" />
          <p className="text-xs text-muted-foreground">{language === 'no' ? 'Ingen snø meldt' : 'No snow reported'}</p>
        </div>
      )}
    </div>
  );
};

export default PeakTripPlanner;
