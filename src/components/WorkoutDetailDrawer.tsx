import { useState, useMemo, useEffect } from 'react';
import { WorkoutSession, WorkoutStreams } from '@/types/workout';
import { sessionTypeConfig, formatDuration } from '@/utils/workoutUtils';
import { getActivityColors } from '@/utils/activityColors';
import { decodePolyline } from '@/utils/polyline';
import { useSettings } from '@/contexts/SettingsContext';
import ActivityIcon from '@/components/ActivityIcon';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter,
} from '@/components/ui/drawer';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Clock, MapPin, MountainSnow, Heart, Activity, Pencil, Trash2, ChevronDown, Loader2,
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { stravaService } from '@/services/stravaService';
import { toast } from 'sonner';

interface Props {
  session: WorkoutSession | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (session: WorkoutSession) => void;
  onDelete?: (id: string) => void;
}

const WorkoutDetailDrawer = ({ session, open, onClose, onEdit, onDelete }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.darkMode;
  const [streams, setStreams] = useState<WorkoutStreams | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [streamsLoaded, setStreamsLoaded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Delay map render until drawer animation is done
  useEffect(() => {
    if (open && session?.summaryPolyline) {
      setShowMap(false);
      const timer = setTimeout(() => setShowMap(true), 400);
      return () => clearTimeout(timer);
    } else {
      setShowMap(false);
    }
  }, [open, session?.id]);

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

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const dateFormatted = new Date(session.date).toLocaleDateString('nb-NO', {
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
      toast.error('Kunne ikke hente detaljer fra Strava');
      console.error(err);
    } finally {
      setLoadingStreams(false);
    }
  };

  const handleClose = () => {
    setStreams(null);
    setStreamsLoaded(false);
    setLoadingStreams(false);
    setShowMap(false);
    onClose();
  };

  return (
    <>
      <Drawer open={open} onOpenChange={(o) => !o && handleClose()}>
        <DrawerContent className="max-h-[92vh]">
          <div className="overflow-y-auto scrollbar-hide pb-4">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{session.title || config.label}</DrawerTitle>
              <DrawerDescription>Øktdetaljer</DrawerDescription>
            </DrawerHeader>

            {/* Map */}
            {routePoints && showMap && (
              <MapSection
                routePoints={routePoints}
                lineColor={colors.text}
                tileUrl={tileUrl}
                sessionId={session.id}
              />
            )}
            {routePoints && !showMap && (
              <div className="w-full h-48 flex items-center justify-center bg-secondary/30">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
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
                    {session.title || config.label}
                  </h2>
                  <p className="text-sm text-muted-foreground capitalize">{dateFormatted}</p>
                </div>
              </div>
            </div>

            {/* Stat tiles */}
            <div className="px-4 py-3">
              <div className="grid grid-cols-3 gap-2">
                <StatTile icon={<Clock className="w-4 h-4" />} value={formatDuration(session.durationMinutes)} label="Varighet" />
                {session.distance != null && (
                  <StatTile icon={<MapPin className="w-4 h-4" />} value={`${session.distance} km`} label="Distanse" />
                )}
                {session.elevationGain != null && (
                  <StatTile icon={<MountainSnow className="w-4 h-4" />} value={`${session.elevationGain} m`} label="Høydemeter" />
                )}
                {pace && (
                  <StatTile icon={<Activity className="w-4 h-4" />} value={`${pace} /km`} label="Tempo" />
                )}
                {session.averageHeartrate != null && (
                  <StatTile icon={<Heart className="w-4 h-4" />} value={`${session.averageHeartrate}`} label="Snittpuls" accent />
                )}
                {session.maxHeartrate != null && (
                  <StatTile icon={<Heart className="w-4 h-4" />} value={`${session.maxHeartrate}`} label="Makspuls" accent />
                )}
              </div>
            </div>

            {/* Load details button (Strava sessions only) */}
            {session.stravaActivityId && !streamsLoaded && (
              <div className="px-4 pb-3">
                <button
                  onClick={handleLoadStreams}
                  disabled={loadingStreams}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  {loadingStreams ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Henter detaljer…</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> Last detaljer</>
                  )}
                </button>
              </div>
            )}

            {/* Stream charts */}
            {streamsLoaded && streams && (
              <div className="px-4 space-y-4 pb-2">
                {streams.altitudeData && streams.altitudeData.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Høydeprofil</p>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={streams.altitudeData}>
                          <defs>
                            <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="distance" tickFormatter={(v) => `${Math.round(v / 1000)}`} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} type="number" domain={['dataMin', 'dataMax']} ticks={(() => { const maxDist = streams.altitudeData![streams.altitudeData!.length - 1]?.distance || 0; const maxKm = Math.floor(maxDist / 1000); return Array.from({ length: maxKm + 1 }, (_, i) => i * 1000); })()} unit=" km" />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} domain={['dataMin - 20', 'dataMax + 20']} width={35} unit=" m" />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} labelStyle={{ display: 'none' }} formatter={(v: number) => [`${Math.round(v)} m`]} labelFormatter={() => ''} />
                          <Area type="monotone" dataKey="value" stroke="hsl(var(--success))" fill="url(#elevGrad)" strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {streams.heartrateData && streams.heartrateData.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Puls</p>
                    <div className="h-32 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={streams.heartrateData}>
                          <XAxis dataKey="time" tickFormatter={(v) => { const totalMinutes = v / 60; const maxTime = streams.heartrateData![streams.heartrateData!.length - 1]?.time || 0; if (maxTime > 7200) return `${Math.floor(totalMinutes / 60)}t`; return `${Math.round(totalMinutes)}'`; }} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} domain={['dataMin - 10', 'dataMax + 10']} width={35} />
                          <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }} labelStyle={{ display: 'none' }} formatter={(v: number) => [`${v} bpm`]} labelFormatter={() => ''} />
                          <Line type="monotone" dataKey="value" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {session.notes && (
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">Notater</p>
                <p className="text-sm text-foreground">{session.notes}</p>
              </div>
            )}

            {/* Footer actions */}
            <DrawerFooter className="flex-row gap-2 pt-2">
              {onEdit && (
                <button
                  onClick={() => { handleClose(); setTimeout(() => onEdit(session), 150); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Rediger
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Slett
                </button>
              )}
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
            <AlertDialogDescription>
              Vil du slette «{session.title || config.label}»? Dette kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { onDelete?.(session.id); handleClose(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Separate component to isolate Leaflet rendering
function MapSection({ routePoints, lineColor, tileUrl, sessionId }: {
  routePoints: [number, number][];
  lineColor: string;
  tileUrl: string;
  sessionId: string;
}) {
  const [error, setError] = useState(false);
  const [RouteMap, setRouteMap] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('@/components/RouteMap')
      .then(mod => { if (!cancelled) setRouteMap(() => mod.default); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, []);

  if (error) {
    return (
      <div className="w-full h-32 flex items-center justify-center bg-secondary/30 text-muted-foreground text-sm">
        Kartet kunne ikke lastes
      </div>
    );
  }

  if (!RouteMap) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-secondary/30">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <RouteMap
      key={sessionId}
      routePoints={routePoints}
      lineColor={lineColor}
      tileUrl={tileUrl}
      height={192}
    />
  );
}

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
