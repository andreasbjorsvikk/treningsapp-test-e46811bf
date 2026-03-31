import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { WorkoutSession, WorkoutStreams } from '@/types/workout';
import { sessionTypeConfig, formatDuration } from '@/utils/workoutUtils';
import { getActivityColors } from '@/utils/activityColors';
import { decodePolyline } from '@/utils/polyline';
import { useSettings } from '@/contexts/SettingsContext';
import ActivityIcon from '@/components/ActivityIcon';
import MapboxRouteMap, { getBounds, simplifyRoute, MAPBOX_TOKEN } from '@/components/MapboxRouteMap';
import RouteReplay from '@/components/RouteReplay';
import { addEnhancedTerrain } from '@/utils/mapTerrain';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock, MapPin, MountainSnow, Heart, Activity, Pencil, Trash2, ChevronDown, Loader2, ArrowLeft,
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { stravaService } from '@/services/stravaService';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';

function formatDurationHMS(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  session: WorkoutSession | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (session: WorkoutSession) => void;
  onDelete?: (id: string) => void;
  extraFooter?: React.ReactNode;
}

/**
 * Standalone fullscreen map — rendered OUTSIDE the Drawer so vaul
 * cannot intercept pointer/touch events.
 */
function FullscreenMap({
  routePoints,
  lineColor,
  onClose,
  totalDistance,
  totalElevation,
  averageHeartrate,
  maxHeartrate,
  durationMinutes,
}: {
  routePoints: [number, number][];
  lineColor: string;
  onClose: () => void;
  totalDistance?: number;
  totalElevation?: number;
  averageHeartrate?: number | null;
  maxHeartrate?: number | null;
  durationMinutes?: number;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  const simplifiedRoute = useMemo(() => simplifyRoute(routePoints, 300), [routePoints]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    let map: any = null;
    let cancelled = false;

    (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      await import('mapbox-gl/dist/mapbox-gl.css');
      (mapboxgl as any).accessToken = MAPBOX_TOKEN;

      if (cancelled || !mapContainerRef.current) return;

      const boundsPoints = simplifiedRoute.length > 0 ? simplifiedRoute : routePoints;
      const bounds = getBounds(boundsPoints);
      const coords = (simplifiedRoute.length > 0 ? simplifiedRoute : routePoints).map(([lat, lng]) => [lng, lat]);

      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: bounds.center,
        zoom: 12,
        pitch: 60,
        bearing: -20,
        antialias: false,
        fadeDuration: 0,
        attributionControl: false,
      });

      // All interactions enabled by default — no portal, no vaul interference
      map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), 'top-right');

      mapInstanceRef.current = map;

      map.once('style.load', () => {
        if (cancelled) return;

        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: coords },
          },
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': lineColor, 'line-width': 4, 'line-opacity': 0.95 },
        });

        map.fitBounds([bounds.sw, bounds.ne], { padding: 60, pitch: 60, bearing: -20, duration: 0 });
        setMapReady(true);
      });

      // Defer terrain to first interaction or 3s fallback
      let terrainAdded = false;
      const addTerrain = () => {
        if (terrainAdded || cancelled) return;
        terrainAdded = true;
        setTimeout(() => {
          if (!cancelled && mapInstanceRef.current) {
            addEnhancedTerrain(mapInstanceRef.current, { exaggeration: 1.4 });
          }
        }, 100);
      };
      map.once('movestart', addTerrain);
      map.once('zoomstart', addTerrain);
      const fallback = setTimeout(addTerrain, 3000);

      (map as any).__terrainCleanup = () => {
        clearTimeout(fallback);
        map.off('movestart', addTerrain);
        map.off('zoomstart', addTerrain);
      };
    })();

    // Lock body scroll
    document.body.style.overflow = 'hidden';

    return () => {
      cancelled = true;
      document.body.style.overflow = '';
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as any).__terrainCleanup?.();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapReady(false);
    };
  }, [routePoints, simplifiedRoute, lineColor]);

  // ESC to close fullscreen map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
      <button
        onClick={onClose}
        className="absolute left-4 z-[10000] flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-full py-2 px-3 shadow-lg hover:bg-background transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <ArrowLeft className="w-5 h-5 text-foreground" />
        <span className="text-sm font-medium text-foreground">Tilbake</span>
      </button>
      <div
        ref={mapContainerRef}
        className="flex-1 w-full"
      />
      {mapReady && mapInstanceRef.current && (
        <RouteReplay
          map={mapInstanceRef.current}
          routePoints={routePoints}
          lineColor={lineColor}
          totalDistance={totalDistance}
          totalElevation={totalElevation}
          averageHeartrate={averageHeartrate}
          maxHeartrate={maxHeartrate}
          durationMinutes={durationMinutes}
        />
      )}
    </div>
  );
}

const WorkoutDetailDrawer = ({ session, open, onClose, onEdit, onDelete, extraFooter }: Props) => {
  const { settings } = useSettings();
  const { t } = useTranslation();
  const isDark = settings.darkMode;
  const [streams, setStreams] = useState<WorkoutStreams | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [streamsLoaded, setStreamsLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);

  const config = session ? sessionTypeConfig[session.type] : null;
  const colors = session ? getActivityColors(session.type, isDark) : null;

  // Decode polyline for map
  const routePoints = useMemo(() => {
    if (!session?.summaryPolyline) return null;
    try {
      const pts = decodePolyline(session.summaryPolyline);
      return pts.length > 1 ? pts : null;
    } catch { return null; }
  }, [session?.summaryPolyline]);

  // Tempo calculation (min/km)
  const pace = useMemo(() => {
    if (!session?.distance || session.distance <= 0) return null;
    const totalMin = session.durationMinutes;
    const paceMin = totalMin / session.distance;
    const m = Math.floor(paceMin);
    const s = Math.round((paceMin - m) * 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }, [session?.distance, session?.durationMinutes]);

  if (!session || !config || !colors) return null;

  const dateLocale = t('date.locale');
  const dateFormatted = new Date(session.date).toLocaleDateString(dateLocale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleLoadStreams = async () => {
    if (!session.stravaActivityId || streamsLoaded) return;
    setLoadingStreams(true);
    try {
      const data = await stravaService.fetchStreams(session.id, session.stravaActivityId);
      setStreams(data);
      setStreamsLoaded(true);
    } catch (err) {
      toast.error(t('workoutDetail.fetchError'));
      console.error(err);
    } finally {
      setLoadingStreams(false);
    }
  };

  const handleClose = () => {
    setStreams(null);
    setStreamsLoaded(false);
    setLoadingStreams(false);
    onClose();
  };

  return (
    <>
      {/* Drawer — hidden when map is fullscreen */}
      <Drawer open={open && !mapFullscreen} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto scrollbar-hide pb-4">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{session.title || t(`activity.${session.type}`)}</DrawerTitle>
              <DrawerDescription>{t('workoutDetail.sessionDetails')}</DrawerDescription>
            </DrawerHeader>

            {/* Mapbox Route Map — thumbnail only */}
            {routePoints && (
              <MapboxRouteMap
                routePoints={routePoints}
                lineColor={getActivityColors(session.type, false).text}
                height={280}
                isDark={isDark}
                onFullscreenChange={setMapFullscreen}
              />
            )}

            {/* Header */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <div
                  className="rounded-lg p-2 shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: colors.bg }}
                >
                  <ActivityIcon type={session.type} className="w-6 h-6" colorOverride={!isDark ? colors.text : undefined} />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg leading-tight">
                    {session.title || t(`activity.${session.type}`)}
                  </h2>
                  <p className="text-sm text-muted-foreground capitalize">{dateFormatted}</p>
                </div>
              </div>
            </div>

            {/* Stat tiles */}
            <div className="px-4 py-3">
              <div className="grid grid-cols-3 gap-2">
                <StatTile icon={<Clock className="w-4 h-4" />} value={session.type === 'løping' ? formatDurationHMS(session.durationMinutes) : formatDuration(session.durationMinutes)} label={t('workoutDetail.duration')} />
                {session.distance != null && (
                  <StatTile icon={<MapPin className="w-4 h-4" />} value={`${session.distance} km`} label={t('workoutDetail.distance')} />
                )}
                {session.elevationGain != null && (
                  <StatTile icon={<MountainSnow className="w-4 h-4" />} value={`${session.elevationGain} m`} label={t('workoutDetail.elevation')} />
                )}
                {pace && (
                  <StatTile icon={<Activity className="w-4 h-4" />} value={`${pace} /km`} label={t('workoutDetail.pace')} />
                )}
                {session.averageHeartrate != null && (
                  <StatTile icon={<Heart className="w-4 h-4" />} value={`${session.averageHeartrate}`} label={t('workoutDetail.avgHr')} accent />
                )}
                {session.maxHeartrate != null && (
                  <StatTile icon={<Heart className="w-4 h-4" />} value={`${session.maxHeartrate}`} label={t('workoutDetail.maxHr')} accent />
                )}
              </div>
            </div>

            {/* Load details button */}
            {session.stravaActivityId && !streamsLoaded && session.type !== 'styrke' && (
              <div className="px-4 pb-3">
                <button
                  onClick={handleLoadStreams}
                  disabled={loadingStreams}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  {loadingStreams ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {t('workoutDetail.loadingDetails')}</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> {t('workoutDetail.moreDetails')}</>
                  )}
                </button>
              </div>
            )}

            {/* Stream charts */}
            {streamsLoaded && streams && (
              <div className="px-4 space-y-4 pb-2">
                {streams.altitudeData && streams.altitudeData.length > 0 && (() => {
                  const altData = streams.altitudeData!;
                  const minElev = Math.min(...altData.map(d => d.value));
                  const maxElev = Math.max(...altData.map(d => d.value));
                  const yMin = Math.floor(minElev / 100) * 100;
                  const yMax = Math.ceil(maxElev / 100) * 100;
                  const step = yMax - yMin <= 400 ? 100 : 200;
                  const elevTicks: number[] = [];
                  for (let v = yMin; v <= yMax; v += step) elevTicks.push(v);
                  return (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t('workoutDetail.elevationProfile')}</p>
                      <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={altData}>
                            <defs>
                              <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="distance" tickFormatter={(v) => `${Math.round(v / 1000)}`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} type="number" domain={['dataMin', 'dataMax']} ticks={(() => { const maxDist = altData[altData.length - 1]?.distance || 0; const maxKm = Math.floor(maxDist / 1000); return Array.from({ length: maxKm + 1 }, (_, i) => i * 1000); })()} unit=" km" />
                            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} domain={[yMin, yMax]} ticks={elevTicks} width={35} tickFormatter={(v) => `${v}`} unit=" m" />
                            <Tooltip position={{ y: 10 }} content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              return (
                                <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-md text-xs pointer-events-none">
                                  <p className="font-semibold text-foreground">{Math.round(payload[0].payload.value)} moh</p>
                                  <p className="text-muted-foreground">{(payload[0].payload.distance / 1000).toFixed(1)} km</p>
                                </div>
                              );
                            }} />
                            <Area type="monotone" dataKey="value" stroke="hsl(var(--success))" fill="url(#elevGrad)" strokeWidth={1.5} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}

                {streams.heartrateData && streams.heartrateData.length > 0 && (() => {
                  const hrData = streams.heartrateData!;
                  const maxTime = hrData[hrData.length - 1]?.time || 0;
                  const useHours = maxTime > 7200;
                  const hrTicks: number[] = [];
                  if (useHours) {
                    const maxHours = Math.ceil(maxTime / 3600);
                    for (let i = 0; i <= maxHours; i++) hrTicks.push(i * 3600);
                  }
                  return (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">{t('workoutDetail.heartrate')}</p>
                      <div className="h-32 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={hrData}>
                            <XAxis
                              dataKey="time"
                              tickFormatter={(v) => useHours ? `${Math.floor(v / 3600)}t` : `${Math.round(v / 60)}'`}
                              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                              axisLine={false}
                              tickLine={false}
                              {...(useHours ? { ticks: hrTicks, type: 'number' as const, domain: [0, hrTicks[hrTicks.length - 1]] } : {})}
                            />
                            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} width={35} />
                            <Tooltip position={{ y: 10 }} content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const timeS = payload[0].payload.time;
                              const timeStr = useHours
                                ? `${Math.floor(timeS / 3600)}t ${Math.floor((timeS % 3600) / 60)}m`
                                : `${Math.round(timeS / 60)} min`;
                              return (
                                <div className="bg-popover/95 backdrop-blur-sm border border-border rounded-lg p-2 shadow-md text-xs pointer-events-none">
                                  <p className="font-semibold text-foreground">{payload[0].payload.value} bpm</p>
                                  <p className="text-muted-foreground">{timeStr}</p>
                                </div>
                              );
                            }} />
                            <Line type="monotone" dataKey="value" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Notes */}
            {session.notes && (
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('workoutDetail.notes')}</p>
                <p className="text-sm text-foreground">{session.notes}</p>
              </div>
            )}

            {/* View on Strava link */}
            {session.stravaActivityId && (
              <div className="flex justify-center pt-2">
                <a
                  href={`https://www.strava.com/activities/${session.stravaActivityId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: '#FC4C02' }}
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                  </svg>
                  View on Strava
                </a>
              </div>
            )}

            {/* Footer actions */}
            <DrawerFooter className="flex-row gap-2 pt-2">
              {onEdit && (
                <button
                  onClick={() => { handleClose(); setTimeout(() => onEdit(session), 150); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> {t('workoutDetail.edit')}
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> {t('workoutDetail.delete')}
                </button>
              )}
            </DrawerFooter>

            {/* Extra footer (e.g. add session buttons from calendar) */}
            {extraFooter}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Fullscreen map — rendered COMPLETELY OUTSIDE the Drawer component */}
      {mapFullscreen && routePoints && (
        <FullscreenMap
          routePoints={routePoints}
          lineColor={getActivityColors(session.type, false).text}
          onClose={() => setMapFullscreen(false)}
          totalDistance={session.distance}
          totalElevation={session.elevationGain}
          averageHeartrate={session.averageHeartrate}
          maxHeartrate={session.maxHeartrate}
          durationMinutes={session.durationMinutes}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('workoutDetail.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('workoutDetail.confirmDeleteDesc', { name: session.title || t(`activity.${session.type}`) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onDelete?.(session.id); handleClose(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

function StatTile({ icon, value, label, accent }: { icon: React.ReactNode; value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-2.5 text-center">
      <div className={`flex items-center justify-center gap-1 mb-0.5 ${accent ? 'text-destructive' : 'text-muted-foreground'}`}>
        {icon}
      </div>
      <p className="font-display font-bold text-base leading-tight">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default WorkoutDetailDrawer;
