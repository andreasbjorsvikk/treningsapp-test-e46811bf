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

const mapOpenMeteoCodeToSymbol = (code: number): string => {
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

const PeakWeather = ({ latitude, longitude }: PeakWeatherProps) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const fetchMetNo = async (): Promise<WeatherData | null> => {
      const res = await fetch(
        `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}`,
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        }
      );

      if (!res.ok) return null;
      const data = await res.json();
      const ts = data?.properties?.timeseries?.[0];
      if (!ts) return null;

      const instant = ts.data?.instant?.details;
      if (!instant) return null;

      const next1h = ts.data?.next_1_hours;

      return {
        temperature: Math.round(instant.air_temperature),
        windSpeed: Math.round(instant.wind_speed),
        windDirection: instant.wind_from_direction,
        precipitation: Number(next1h?.details?.precipitation_amount ?? 0),
        symbolCode: next1h?.summary?.symbol_code ?? 'cloudy',
      };
    };

    const fetchOpenMeteo = async (): Promise<WeatherData | null> => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&hourly=precipitation&forecast_days=1`,
        {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        }
      );

      if (!res.ok) return null;
      const data = await res.json();
      const current = data?.current;
      if (!current) return null;

      const precipitation = Number(data?.hourly?.precipitation?.[0] ?? 0);

      return {
        temperature: Math.round(Number(current.temperature_2m ?? 0)),
        windSpeed: Math.round(Number(current.wind_speed_10m ?? 0)),
        windDirection: Number(current.wind_direction_10m ?? 0),
        precipitation,
        symbolCode: mapOpenMeteoCodeToSymbol(Number(current.weather_code ?? 3)),
      };
    };

    const fetchWeather = async () => {
      setLoading(true);

      try {
        const primary = await fetchMetNo();
        if (!cancelled && primary) {
          setWeather(primary);
          return;
        }

        const fallback = await fetchOpenMeteo();
        if (!cancelled) setWeather(fallback);
      } catch {
        if (!cancelled) setWeather(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchWeather();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [latitude, longitude]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/30 text-xs text-muted-foreground">
        <Cloud className="w-4 h-4" />
        Laster vær...
      </div>
    );
  }

  if (!weather) {
    return (
      <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/30 text-xs text-muted-foreground">
        <Cloud className="w-4 h-4" />
        Værdata utilgjengelig akkurat nå
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3 px-3 py-2 rounded-lg bg-muted/40 border border-border/30">
      <img
        src={`${WEATHER_ICON_BASE}${weather.symbolCode}.svg`}
        alt="Værikon"
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
            {weather.precipitation.toFixed(1).replace('.', ',')} mm
          </span>
        )}
      </div>
    </div>
  );
};

export default PeakWeather;
