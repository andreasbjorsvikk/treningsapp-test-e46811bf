import { useState, useRef, useEffect } from 'react';
import { DbPeak } from '@/services/peakDbService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { uploadPeakImage } from '@/services/peakDbService';
import { toast } from 'sonner';

interface AdminPeakFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  initial?: Partial<DbPeak>;
  title: string;
  peakId?: string;
  onPickRouteStart?: () => void;
  routeStartCoordsProp?: { lat: number; lng: number } | null;
  onPreviewRoute?: (geojson: any) => void;
  mapClickEvent?: { lat: number; lng: number; timestamp: number } | null;
  waypointClickEvent?: { index: number; timestamp: number } | null;
  waypointDragEvent?: { index: number; lat: number; lng: number; timestamp: number } | null;
  onWaypointsChange?: (waypoints: { lat: number; lng: number }[]) => void;
}

const MAPBOX_TOKEN = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

const AdminPeakForm = ({ open, onClose, onSave, initial, title, peakId, onPickRouteStart, routeStartCoordsProp, onPreviewRoute, mapClickEvent, waypointClickEvent, waypointDragEvent, onWaypointsChange }: AdminPeakFormProps) => {
  const [name, setName] = useState(initial?.name_no || '');
  const [elevation, setElevation] = useState(String(initial?.elevation_moh ?? ''));
  const [area, setArea] = useState(initial?.area || '');
  const [description, setDescription] = useState(initial?.description_no || '');
  const [lat, setLat] = useState(String(initial?.latitude ?? ''));
  const [lng, setLng] = useState(String(initial?.longitude ?? ''));
  const [published, setPublished] = useState(initial?.is_published ?? true);
  const [imageUrl, setImageUrl] = useState(initial?.image_url || null);
  
  const [routeStartLat, setRouteStartLat] = useState<number | null>(initial?.route_start_lat || null);
  const [routeStartLng, setRouteStartLng] = useState<number | null>(initial?.route_start_lng || null);
  const [routeGeojson, setRouteGeojson] = useState<any | null>(initial?.route_geojson || null);
  const [routeDistance, setRouteDistance] = useState<number | null>(initial?.route_distance_m || null);
  const [routeDuration, setRouteDuration] = useState<number | null>(initial?.route_duration_s || null);
  const [routeStatus, setRouteStatus] = useState<string>(initial?.route_status || 'none');
  const [routeWaypoints, setRouteWaypoints] = useState<{lat: number, lng: number}[]>(initial?.route_waypoints || []);
  const [addingWaypointMode, setAddingWaypointMode] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPeakImage(peakId || 'new', file);
      setImageUrl(url);
    } catch {
      // silent
    }
    setUploading(false);
  };

  useEffect(() => {
    if (routeStartCoordsProp) {
      setRouteStartLat(routeStartCoordsProp.lat);
      setRouteStartLng(routeStartCoordsProp.lng);
      setRouteGeojson(null);
      setRouteStatus('none');
      setRouteWaypoints([]);
    }
  }, [routeStartCoordsProp]);

  useEffect(() => {
    if (onWaypointsChange) {
      onWaypointsChange(routeWaypoints);
    }
  }, [routeWaypoints, onWaypointsChange]);

  const generateRouteWithWaypoints = async (waypoints: {lat: number, lng: number}[]) => {
    if (!routeStartLat || !routeStartLng || !lat || !lng) return;
    try {
      const coords = [
        `${routeStartLng},${routeStartLat}`,
        ...waypoints.map(wp => `${wp.lng},${wp.lat}`),
        `${lng},${lat}`
      ].join(';');
      
      const url = `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setRouteGeojson(route.geometry);
        setRouteDistance(route.distance);
        setRouteDuration(route.duration);
        setRouteStatus('preview');
        if (onPreviewRoute) onPreviewRoute(route.geometry);
      } else {
        toast.error('Fant ingen rute');
      }
    } catch (e) {
      toast.error('Kunne ikke generere rute');
    }
  };

  const handleGenerateRoute = async () => {
    await generateRouteWithWaypoints(routeWaypoints);
    toast.success('Rute generert!');
  };

  useEffect(() => {
    if (mapClickEvent && addingWaypointMode) {
      const newWaypoints = [...routeWaypoints, { lat: mapClickEvent.lat, lng: mapClickEvent.lng }];
      setRouteWaypoints(newWaypoints);
      generateRouteWithWaypoints(newWaypoints);
    }
  }, [mapClickEvent]);

  useEffect(() => {
    if (waypointClickEvent) {
      const newWaypoints = routeWaypoints.filter((_, i) => i !== waypointClickEvent.index);
      setRouteWaypoints(newWaypoints);
      generateRouteWithWaypoints(newWaypoints);
    }
  }, [waypointClickEvent]);

  useEffect(() => {
    if (waypointDragEvent) {
      const newWaypoints = [...routeWaypoints];
      newWaypoints[waypointDragEvent.index] = { lat: waypointDragEvent.lat, lng: waypointDragEvent.lng };
      setRouteWaypoints(newWaypoints);
      generateRouteWithWaypoints(newWaypoints);
    }
  }, [waypointDragEvent]);

  const handleApproveRoute = () => {
    setRouteStatus('approved');
    setAddingWaypointMode(false);
    toast.success('Rute godkjent');
  };

  const handleClearRoute = () => {
    setRouteStartLat(null);
    setRouteStartLng(null);
    setRouteGeojson(null);
    setRouteDistance(null);
    setRouteDuration(null);
    setRouteStatus('none');
    setRouteWaypoints([]);
    setAddingWaypointMode(false);
    if (onPreviewRoute) onPreviewRoute(null);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !lat || !lng) return;
    setSaving(true);
    try {
      await onSave({
        name_no: name.trim(),
        elevation_moh: Number(elevation) || 0,
        area: area.trim(),
        description_no: description.trim(),
        latitude: Number(lat),
        longitude: Number(lng),
        is_published: published,
        image_url: imageUrl,
        route_start_lat: routeStartLat,
        route_start_lng: routeStartLng,
        route_geojson: routeGeojson,
        route_distance_m: routeDistance ? Math.round(routeDistance) : null,
        route_duration_s: routeDuration ? Math.round(routeDuration) : null,
        route_status: routeStatus,
        route_waypoints: routeWaypoints.length > 0 ? routeWaypoints : null,
      });
      onClose();
    } catch {
      // silent
    }
    setSaving(false);
  };

  if (routeStatus === 'preview' && routeGeojson) {
    return (
      <div className="fixed bottom-6 left-4 right-4 z-[60] bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-4 animate-in slide-in-from-bottom-10 max-w-sm mx-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-warning flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning"></span>
            </span>
            Forhåndsvisning
          </p>
          <div className="text-right text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md">
            {(routeDistance! / 1000).toFixed(1)} km • {Math.round(routeDuration! / 60)} min
          </div>
        </div>
        <div className="space-y-2">
          <Button onClick={handleApproveRoute} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm">
            Godkjenn rute
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant={addingWaypointMode ? "default" : "outline"} onClick={() => setAddingWaypointMode(!addingWaypointMode)} className="text-xs">
              {addingWaypointMode ? 'Avslutt waypoint-modus' : '+ Legg til waypoint'}
            </Button>
            <Button variant="outline" disabled={routeWaypoints.length === 0} onClick={() => {
              const newWp = routeWaypoints.slice(0, -1);
              setRouteWaypoints(newWp);
              generateRouteWithWaypoints(newWp);
            }} className="text-xs">
              Angre siste
            </Button>
            <Button variant="outline" disabled={routeWaypoints.length === 0} onClick={() => {
              setRouteWaypoints([]);
              generateRouteWithWaypoints([]);
            }} className="text-xs">
              Fjern alle
            </Button>
            <Button variant="outline" onClick={onPickRouteStart} className="text-xs">
              Nytt startpunkt
            </Button>
          </div>
          <Button variant="ghost" onClick={handleClearRoute} className="w-full mt-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
            Fjern rute helt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()} modal={false}>
      <DrawerContent className="max-h-[85vh] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] border-t border-border z-40 bg-background/95 backdrop-blur-xl">
        <DrawerHeader>
          <DrawerTitle className="font-display">{title}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>Navn</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Fjelltopp-navn" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Høyde (moh)</Label>
              <Input type="number" value={elevation} onChange={(e) => setElevation(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Område</Label>
              <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Haugesund" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Beskrivelse</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Valgfri beskrivelse..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Breddegrad</Label>
              <Input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="59.42" />
            </div>
            <div className="space-y-2">
              <Label>Lengdegrad</Label>
              <Input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="5.30" />
            </div>
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <Label>Bilde</Label>
            {imageUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-border">
                <img src={imageUrl} alt="Topp" className="w-full h-32 object-cover" />
                <button
                  onClick={() => setImageUrl(null)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 border border-border"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full h-24 rounded-xl border border-dashed border-border/50 bg-muted/30 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Laster opp...' : 'Last opp bilde'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Publisert</Label>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>

          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">ANBEFALT RUTE</h3>
            
            {(!routeStartLat || !routeStartLng) && (
              <Button type="button" variant="outline" className="w-full" onClick={onPickRouteStart}>
                Velg startpunkt i kart
              </Button>
            )}

            {routeStartLat && routeStartLng && routeStatus === 'none' && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Startpunkt valgt: {routeStartLat.toFixed(4)}, {routeStartLng.toFixed(4)}</p>
                <div className="flex gap-2">
                  <Button type="button" onClick={handleGenerateRoute} className="flex-1">
                    Generer rute
                  </Button>
                  <Button type="button" variant="outline" onClick={onPickRouteStart}>
                    Endre start
                  </Button>
                </div>
              </div>
            )}

            {routeStatus === 'approved' && routeGeojson && (
              <div className="space-y-3 bg-success/10 p-3 rounded-lg border border-success/30">
                <p className="text-xs font-medium text-success flex items-center gap-1">
                  ✓ Rute godkjent
                </p>
                <div className="text-sm">
                  Distanse: {(routeDistance! / 1000).toFixed(1)} km<br/>
                  Estimert tid: {Math.round(routeDuration! / 60)} min
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={handleClearRoute}>
                    Fjern rute
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" onClick={onPickRouteStart}>
                    Endre start
                  </Button>
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={saving || !name.trim()} className="w-full mt-4" size="lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Lagre
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AdminPeakForm;
