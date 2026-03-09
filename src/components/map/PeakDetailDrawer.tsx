import { Peak } from '@/data/peaks';
import { PeakCheckin, checkinPeak, getDistanceMeters, adminCheckinPeak, searchProfiles } from '@/services/peakCheckinService';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Mountain, MapPin, Check, Loader2, ImageIcon, Pencil, Trash2, CalendarIcon, UserPlus, X, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { RouteElevationChart } from '@/components/map/RouteElevationChart';
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

const PeakDetailDrawer = ({ peak, open, onClose, checkins, onCheckinSuccess, adminMode, onEdit, onDelete, onShowRoute, onHideRoute, isRouteShown }: PeakDetailDrawerProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Admin manual checkin state
  const [manualCheckinOpen, setManualCheckinOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string | null; avatar_url: string | null }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string | null; avatar_url: string | null } | null>(null);
  const [checkinDate, setCheckinDate] = useState<Date>(new Date());
  const [searching, setSearching] = useState(false);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchProfiles(searchQuery);
        setSearchResults(results);
      } catch (e) {
        console.error('Search error:', e);
      }
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!peak) return null;

  const isCheckedIn = checkins.some(c => c.peak_id === peak.id);

  const mapboxToken = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';
  const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-s+ef4444(${peak.longitude},${peak.latitude})/${peak.longitude},${peak.latitude},13,0/400x200@2x?access_token=${mapboxToken}`;

  const handleCheckin = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
        });
      });
      const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, peak.latitude, peak.longitude);
      if (dist > CHECKIN_RADIUS_METERS) {
        toast.error(t('map.tooFar'));
        setLoading(false);
        return;
      }
      await checkinPeak(user.id, peak.id);
      toast.success(t('map.checkinSuccess'));
      onCheckinSuccess();
    } catch (err: any) {
      if (err?.code === 1) toast.error(t('map.locationDenied'));
      else toast.error(t('map.checkinError'));
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
    } catch (e) {
      toast.error('Kunne ikke registrere innsjekking');
    }
    setSubmittingCheckin(false);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <div className="flex flex-col items-center text-center w-full">
            {adminMode && (
              <div className="flex justify-end w-full mb-1">
                <div className="flex gap-1">
                  <button
                    onClick={() => { onClose(); onEdit?.(peak); }}
                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { onClose(); onDelete?.(peak.id); }}
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
            <DrawerTitle className="font-display text-3xl w-full text-center">{peak.name}</DrawerTitle>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-1">
              <Mountain className="w-4 h-4" />
              <span className="font-medium">{peak.heightMoh} moh</span>
              <span className="text-border">•</span>
              <MapPin className="w-4 h-4" />
              <span>{peak.area}</span>
            </div>
          </div>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {/* Static map */}
          <div className="rounded-xl overflow-hidden border border-border/50">
            <img src={staticMapUrl} alt={`Kart over ${peak.name}`} className="w-full h-[160px] object-cover" loading="lazy" />
          </div>

          {/* Route info */}
          <div className="flex flex-col gap-2">
            {peak.route_status === 'approved' && onShowRoute && (
              isRouteShown ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    onHideRoute?.();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Skjul rute
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    onClose();
                    onShowRoute(peak);
                  }}
                >
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

          {peak.description && (
            <p className="text-sm text-muted-foreground">{peak.description}</p>
          )}

          {/* Image or placeholder */}
          {peak.imageUrl ? (
            <div className="rounded-xl overflow-hidden border border-border/50">
              <img src={peak.imageUrl} alt={peak.name} className="w-full h-40 object-cover" />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 bg-muted/30 h-32 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                <ImageIcon className="w-6 h-6" />
                <span className="text-xs">{t('map.imagePlaceholder')}</span>
              </div>
            </div>
          )}

          {/* Check-in status */}
          {isCheckedIn ? (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 border border-success/20">
              <Check className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-success">{t('map.alreadyCheckedIn')}</span>
            </div>
          ) : (
            <Button onClick={handleCheckin} disabled={loading} className="w-full" size="lg">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
              {t('map.checkin')}
            </Button>
          )}

          {/* Admin manual check-in */}
          {adminMode && (
            <Dialog open={manualCheckinOpen} onOpenChange={setManualCheckinOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full" size="sm">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Manuell innsjekking
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Manuell innsjekking</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {/* User search */}
                  <div className="space-y-2">
                    <Label>Søk etter bruker</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Brukernavn..."
                        className="pl-9"
                      />
                    </div>
                    {searching && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Søker...
                      </div>
                    )}
                    {searchResults.length > 0 && !selectedUser && (
                      <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                        {searchResults.map((profile) => (
                          <button
                            key={profile.id}
                            onClick={() => {
                              setSelectedUser(profile);
                              setSearchQuery('');
                              setSearchResults([]);
                            }}
                            className="w-full flex items-center gap-3 p-2 hover:bg-muted transition-colors text-left"
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback>{profile.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">{profile.username || 'Ukjent'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Selected user */}
                  {selectedUser && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedUser.avatar_url || undefined} />
                          <AvatarFallback>{selectedUser.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{selectedUser.username || 'Ukjent'}</span>
                      </div>
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                      >
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {/* Date picker */}
                  <div className="space-y-2">
                    <Label>Dato for innsjekking</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !checkinDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkinDate ? format(checkinDate, "PPP", { locale: nb }) : "Velg dato"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={checkinDate}
                          onSelect={(d) => d && setCheckinDate(d)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Submit */}
                  <Button
                    onClick={handleManualCheckin}
                    disabled={!selectedUser || submittingCheckin}
                    className="w-full"
                  >
                    {submittingCheckin ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    Registrer innsjekking
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default PeakDetailDrawer;
