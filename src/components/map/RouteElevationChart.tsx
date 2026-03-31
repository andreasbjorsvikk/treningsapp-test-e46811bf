import { useEffect, useState } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';

interface RouteElevationChartProps {
  geojson: any;
  onElevationGain?: (gain: number) => void;
}

export const RouteElevationChart = ({ geojson, onElevationGain }: RouteElevationChartProps) => {
  const [data, setData] = useState<{ distance: number; elevation: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!geojson || !geojson.coordinates || geojson.coordinates.length === 0) {
      setLoading(false);
      return;
    }

    const fetchElevation = async () => {
      setLoading(true);
      setError(false);
      try {
        const coords = geojson.coordinates;
        // Sample max 100 points to keep API request reasonable (API limit is 100)
        const maxPoints = 100;
        const sampleRate = Math.max(1, Math.ceil(coords.length / maxPoints));
        let sampledCoords = coords.filter((_: any, i: number) => i % sampleRate === 0);
        // Ensure we never exceed 100 points
        if (sampledCoords.length > maxPoints) {
          sampledCoords = sampledCoords.slice(0, maxPoints);
        }
        
        // Open-Meteo expects comma separated lats and lngs
        const lats = sampledCoords.map((c: [number, number]) => c[1].toFixed(5)).join(',');
        const lngs = sampledCoords.map((c: [number, number]) => c[0].toFixed(5)).join(',');

        const res = await fetch(`https://api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`);
        if (!res.ok) throw new Error('Failed to fetch elevation');
        
        const json = await res.json();
        const elevations = json.elevation;

        if (elevations && elevations.length > 0) {
          // Calculate elevation gain
          let totalGain = 0;
          for (let i = 1; i < elevations.length; i++) {
            const diff = elevations[i] - elevations[i - 1];
            if (diff > 0) totalGain += diff;
          }
          onElevationGain?.(Math.round(totalGain));

          // Calculate distance along the path for X-axis
          let currentDist = 0;
          const chartData = elevations.map((elev: number, idx: number) => {
            if (idx > 0) {
              const prev = sampledCoords[idx - 1];
              const curr = sampledCoords[idx];
              // Rough distance calculation in meters (Haversine formula approximation)
              const R = 6371e3; // metres
              const φ1 = prev[1] * Math.PI/180;
              const φ2 = curr[1] * Math.PI/180;
              const Δφ = (curr[1]-prev[1]) * Math.PI/180;
              const Δλ = (curr[0]-prev[0]) * Math.PI/180;
              const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                        Math.cos(φ1) * Math.cos(φ2) *
                        Math.sin(Δλ/2) * Math.sin(Δλ/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              currentDist += R * c;
            }
            return {
              distance: currentDist / 1000, // convert to km
              elevation: Math.round(elev)
            };
          });
          setData(chartData);
        } else {
          setError(true);
        }
      } catch (e) {
        console.error('Error fetching elevation', e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchElevation();
  }, [geojson]);

  if (loading) {
    return (
      <div className="h-32 w-full flex items-center justify-center bg-muted/20 rounded-xl border border-border/50">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || data.length === 0) {
    return null;
  }

  const minElev = Math.min(...data.map(d => d.elevation));
  const maxElev = Math.max(...data.map(d => d.elevation));
  const yMin = Math.floor(minElev / 100) * 100;
  const yMax = Math.ceil(maxElev / 100) * 100;
  const yDomain = [Math.max(0, yMin), yMax];
  const step = yMax - yMin <= 400 ? 100 : 200;
  const yTicks: number[] = [];
  for (let v = yDomain[0]; v <= yDomain[1]; v += step) yTicks.push(v);

  return (
    <div className="h-32 w-full mt-3">
      <p className="text-xs text-muted-foreground mb-2 font-medium">Høydeprofil</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
          <defs>
            <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="distance" 
            type="number"
            tickFormatter={(val) => `${val.toFixed(1)}km`}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            domain={['dataMin', 'dataMax']}
          />
          <YAxis 
            domain={yDomain}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `${val}m`}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-background/95 backdrop-blur-sm border border-border p-2 rounded-lg shadow-sm text-xs">
                    <p className="font-semibold text-foreground">{payload[0].payload.elevation} moh</p>
                    <p className="text-muted-foreground">{payload[0].payload.distance.toFixed(2)} km</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area 
            type="monotone" 
            dataKey="elevation" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorElev)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
