import { useState, useEffect } from 'react';
import { Cloud, Droplets, Wind, Thermometer } from 'lucide-react';

interface PeakWeatherProps {
  latitude: number;
  longitude: number;
}

interface WeatherData {
  temperature: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  symbolCode: string;
}

const WEATHER_ICON_BASE = 'https://raw.githubusercontent.com/metno/weathericons/main/weather/svg/';

const PeakWeather = ({ latitude, longitude }: PeakWeatherProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`,
          { headers: { 'User-Agent': 'Treningsappen/1.0 github.com/treningsappen' } }
        );
        if (!res.ok) throw new Error('Weather fetch failed');
        const data = await res.json();
        const ts = data?.properties?.timeseries?.[0];
        if (!ts || cancelled) return;
        const instant = ts.data.instant.details;
        const next1h = ts.data.next_1_hours;
        setWeather({
          temperature: Math.round(instant.air_temperature),
          windSpeed: Math.round(instant.wind_speed),
          windDirection: instant.wind_from_direction,
          precipitation: next1h?.details?.precipitation_amount ?? 0,
          symbolCode: next1h?.summary?.symbol_code ?? 'cloudy',
        });
      } catch {
        // silent
      }
      if (!cancelled) setLoading(false);
    };
    fetchWeather();
    return () => { cancelled = true; };
  }, [latitude, longitude]);

  if (loading || !weather) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/30">
      <img
        src={`${WEATHER_ICON_BASE}${weather.symbolCode}.svg`}
        alt=""
        className="w-8 h-8"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1 font-medium text-foreground">
          <Thermometer className="w-3.5 h-3.5" />
          {weather.temperature}°
        </span>
        <span className="flex items-center gap-1">
          <Wind className="w-3.5 h-3.5" />
          {weather.windSpeed} m/s
        </span>
        {weather.precipitation > 0 && (
          <span className="flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5" />
            {weather.precipitation} mm
          </span>
        )}
      </div>
      <span className="text-[9px] text-muted-foreground/60 ml-auto">yr.no</span>
    </div>
  );
};

export default PeakWeather;
