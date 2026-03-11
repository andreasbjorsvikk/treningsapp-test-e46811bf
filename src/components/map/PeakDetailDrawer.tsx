import { Peak } from '@/data/peaks';
import PeakOrbitMap from '@/components/map/PeakOrbitMap';
import { PeakCheckin, checkinPeak, getDistanceMeters, adminCheckinPeak, searchProfiles, getAllCheckinsForPeak, CheckinWithProfile, deleteCheckin } from '@/services/peakCheckinService';
import { useAuth } from '@/hooks/useAuth';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mountain, MapPin, Check, Loader2, ImageIcon, Pencil, Trash2, CalendarIcon, UserPlus, X, Search, List } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { RouteElevationChart } from '@/components/map/RouteElevationChart';
import PeakLeaderboard from '@/components/map/PeakLeaderboard';
import CheckinSuccessAnimation from '@/components/map/CheckinSuccessAnimation';
import CheckinImageUpload from '@/components/map/CheckinImageUpload';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PeakDetailDrawerProps {
  peak: Peak | null;
  open: boolean;
  onClose: () => void;
  checkins: PeakCheckin[];
  onCheckinSuccess: () => void;
  adminMode?: boolean;
  onEdit?: (peak: Peak) => void;
  onDelete?: (peakId: string) => void;
  onShowRoute?: (peak: Peak) => void;
  onHideRoute?: () => void;
  isRouteShown?: boolean;
}

const CHECKIN_RADIUS_METERS = 100;
const CHECKIN_COOLDOWN_MS = 3 * 60 * 60 * 1000; // 3 hours

const PeakDetailDrawer = ({ peak, open, onClose, checkins, onCheckinSuccess, adminMode, onEdit, onDelete, onShowRoute, onHideRoute, isRouteShown }: PeakDetailDrawerProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [checkinImage, setCheckinImage] = useState<File | null>(null);
  
  // Admin manual checkin state
  const [manualCheckinOpen, setManualCheckinOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string | null; avatar_url: string | null }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string | null; avatar_url: string | null } | null>(null);
  const [checkinDate, setCheckinDate] = useState<Date>(new Date());
  const [searching, setSearching] = useState(false);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

  // Admin all checkins state
  const [allCheckinsOpen, setAllCheckinsOpen] = useState(false);
  const [allCheckins, setAllCheckins] = useState<CheckinWithProfile[]>([]);
  const [loadingAllCheckins, setLoadingAllCheckins] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { setSearchResults(await searchProfiles(searchQuery)); } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Checkin stats for this peak
  const peakCheckins = useMemo(() => {
    if (!peak) return [];
    return checkins.filter(c => c.peak_id === peak.id).sort((a, b) => 
      new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()
    );
  }, [checkins, peak]);

  const checkinCount = peakCheckins.length;
  const lastCheckin = peakCheckins[0] || null;
  const isCheckedIn = checkinCount > 0;

  // Check cooldown
  const canCheckin = useMemo(() => {
    if (!lastCheckin) return true;
    return Date.now() - new Date(lastCheckin.checked_in_at).getTime() > CHECKIN_COOLDOWN_MS;
  }, [lastCheckin]);

  if (!peak) return null;


  const handleCheckin = async () => {
    if (!user) return;
    if (!canCheckin) {
      toast.error('Du har allerede sjekket inn på denne toppen nylig. Vent minst 3 timer.');
      return;
    }
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
      });
      const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, peak.latitude, peak.longitude);
      if (dist > CHECKIN_RADIUS_METERS) {
        toast.error('Du må være innenfor 100 meter fra toppen for å sjekke inn.');
        setLoading(false);
        return;
      }
      await checkinPeak(user.id, peak.id, undefined, checkinImage);
      setCheckinImage(null);
      setShowSuccessAnim(true);
      onCheckinSuccess();
    } catch (err: any) {
      if (err?.code === 1) toast.error('Lokasjonstilgang ble avslått. Aktiver GPS for å sjekke inn.');
      else toast.error('Noe gikk galt med innsjekking. Prøv igjen.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckin = async () => {
    if (!selectedUser || !peak) return;
    setSubmittingCheckin(true);
    try {
      await adminCheckinPeak(selectedUser.id, peak.id, checkinDate.toISOString());
      toast.success(`Innsjekking registrert for ${selectedUser.username}`);
      setManualCheckinOpen(false);
      setSelectedUser(null);
      setSearchQuery('');
      setCheckinDate(new Date());
      onCheckinSuccess();
    } catch (e: any) {
      const msg = e?.message || 'Ukjent feil';
      toast.error(`Kunne ikke registrere innsjekking: ${msg}`);
    }
    setSubmittingCheckin(false);
  };

  const loadAllCheckins = async () => {
    if (!peak) return;
    setLoadingAllCheckins(true);
    try { setAllCheckins(await getAllCheckinsForPeak(peak.id)); } catch { toast.error('Kunne ikke laste innsjekkinger'); }
    setLoadingAllCheckins(false);
  };

  const handleDeleteCheckin = async (checkinId: string) => {
    if (!confirm('Er du sikker på at du vil slette denne innsjekkingen?')) return;
    try { await deleteCheckin(checkinId); toast.success('Innsjekking slettet'); loadAllCheckins(); onCheckinSuccess(); } catch { toast.error('Kunne ikke slette innsjekking'); }
  };

  return (
    <>
      <CheckinSuccessAnimation show={showSuccessAnim} onDone={() => setShowSuccessAnim(false)} peakName={peak.name} />
      <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <div className="flex flex-col items-center text-center w-full">
              {adminMode && (
                <div className="flex justify-end w-full mb-1">
                  <div className="flex gap-1">
                    <button onClick={() => { onClose(); onEdit?.(peak); }} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { onClose(); onDelete?.(peak.id); }} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
              <DrawerTitle className="font-display text-3xl w-full text-center">{peak.name}</DrawerTitle>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
                <Mountain className="w-4 h-4" /><span className="font-medium">{peak.heightMoh} moh</span>
                <span className="text-border">•</span>
                <MapPin className="w-4 h-4" /><span>{peak.area}</span>
              </div>
            </div>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4 overflow-y-auto">
            {/* Rotating 3D orbit map */}
            <div className="rounded-xl overflow-hidden border border-border/50">
              <PeakOrbitMap latitude={peak.latitude} longitude={peak.longitude} heightMoh={peak.heightMoh} className="w-full h-[180px]" />
            </div>

            {/* Route info */}
            <div className="flex flex-col gap-2">
              {peak.route_status === 'approved' && onShowRoute && (
                isRouteShown ? (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => onHideRoute?.()}>
                    <X className="w-4 h-4 mr-2" />Skjul rute
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { onClose(); onShowRoute(peak); }}>
                    Vis rute ({(peak.route_distance_m || 0) / 1000} km, {Math.round((peak.route_duration_s || 0) / 60)} min)
                  </Button>
                )
              )}
            </div>

            {peak.route_status === 'approved' && peak.route_geojson && (
              <div className="bg-muted/10 p-3 rounded-xl border border-border/50">
                <RouteElevationChart geojson={peak.route_geojson} />
              </div>
            )}

            {peak.description && <p className="text-sm text-muted-foreground">{peak.description}</p>}

            {peak.imageUrl ? (
              <div className="rounded-xl overflow-hidden border border-border/50">
                <img src={peak.imageUrl} alt={peak.name} className="w-full h-40 object-cover" />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/50 bg-muted/30 h-32 flex items-center justify-center">
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon className="w-6 h-6" /><span className="text-xs">Bilde kommer</span>
                </div>
              </div>
            )}

            {/* Check-in status with count */}
            {/* Image upload before checkin */}
            <CheckinImageUpload onImageReady={setCheckinImage} />

            {isCheckedIn ? (
              <div className="p-3 rounded-xl bg-success/10 border border-success/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-success" />
                  <span className="text-sm font-medium text-success">
                    Du har sjekket inn på denne toppen {checkinCount} {checkinCount === 1 ? 'gang' : 'ganger'}
                  </span>
                </div>
                {lastCheckin && (
                  <p className="text-xs text-muted-foreground ml-7">
                    Sist: {format(new Date(lastCheckin.checked_in_at), "d. MMMM yyyy", { locale: nb })}
                  </p>
                )}
                {/* Allow re-checkin */}
                <Button onClick={handleCheckin} disabled={loading || !canCheckin} variant="outline" size="sm" className="w-full mt-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                  {canCheckin ? 'Sjekk inn igjen' : 'Vent minst 3 timer'}
                </Button>
              </div>
            ) : (
              <Button onClick={handleCheckin} disabled={loading} className="w-full" size="lg">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                Sjekk inn
              </Button>
            )}

            {/* Peak leaderboard */}
            <PeakLeaderboard peakId={peak.id} />

            {/* Admin tools */}
            {adminMode && (
              <>
                <Dialog open={manualCheckinOpen} onOpenChange={setManualCheckinOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" size="sm"><UserPlus className="w-4 h-4 mr-2" />Manuell innsjekking</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>Manuell innsjekking</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>Søk etter bruker</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Brukernavn..." className="pl-9" />
                        </div>
                        {searching && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Søker...</div>}
                        {searchResults.length > 0 && !selectedUser && (
                          <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                            {searchResults.map((profile) => (
                              <button key={profile.id} onClick={() => { setSelectedUser(profile); setSearchQuery(''); setSearchResults([]); }} className="w-full flex items-center gap-3 p-2 hover:bg-muted transition-colors text-left">
                                <Avatar className="w-8 h-8"><AvatarImage src={profile.avatar_url || undefined} /><AvatarFallback>{profile.username?.[0]?.toUpperCase() || '?'}</AvatarFallback></Avatar>
                                <span className="text-sm font-medium">{profile.username || 'Ukjent'}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedUser && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10"><AvatarImage src={selectedUser.avatar_url || undefined} /><AvatarFallback>{selectedUser.username?.[0]?.toUpperCase() || '?'}</AvatarFallback></Avatar>
                            <span className="font-medium">{selectedUser.username || 'Ukjent'}</span>
                          </div>
                          <button onClick={() => setSelectedUser(null)} className="p-1 rounded hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Dato for innsjekking</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !checkinDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {checkinDate ? format(checkinDate, "PPP", { locale: nb }) : "Velg dato"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={checkinDate} onSelect={(d) => d && setCheckinDate(d)} initialFocus className="p-3 pointer-events-auto" />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button onClick={handleManualCheckin} disabled={!selectedUser || submittingCheckin} className="w-full">
                        {submittingCheckin ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                        Registrer innsjekking
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={allCheckinsOpen} onOpenChange={(open) => { setAllCheckinsOpen(open); if (open) loadAllCheckins(); }}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full" size="sm"><List className="w-4 h-4 mr-2" />Alle innsjekkinger</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader><DialogTitle>Innsjekkinger på {peak?.name}</DialogTitle></DialogHeader>
                    <div className="flex-1 overflow-y-auto">
                      {loadingAllCheckins ? (
                        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                      ) : allCheckins.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">Ingen innsjekkinger ennå</p>
                      ) : (
                        <div className="space-y-2">
                          {allCheckins.map((checkin) => (
                            <div key={checkin.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10"><AvatarImage src={checkin.profiles?.avatar_url || undefined} /><AvatarFallback>{checkin.profiles?.username?.[0]?.toUpperCase() || '?'}</AvatarFallback></Avatar>
                                <div>
                                  <p className="font-medium text-sm">{checkin.profiles?.username || 'Ukjent bruker'}</p>
                                  <p className="text-xs text-muted-foreground">{format(new Date(checkin.checked_in_at), "d. MMM yyyy, HH:mm", { locale: nb })}</p>
                                </div>
                              </div>
                              <button onClick={() => handleDeleteCheckin(checkin.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive" title="Slett innsjekking"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default PeakDetailDrawer;
