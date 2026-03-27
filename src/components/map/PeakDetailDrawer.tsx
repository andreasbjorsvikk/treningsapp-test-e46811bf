import { Peak } from '@/data/peaks';
import ChildCheckinSheet from '@/components/map/ChildCheckinSheet';
import PeakOrbitMap from '@/components/map/PeakOrbitMap';
import { PeakCheckin, checkinPeak, getDistanceMeters, adminCheckinPeak, searchProfiles, getAllCheckinsForPeak, CheckinWithProfile, deleteCheckin, updateCheckinImage } from '@/services/peakCheckinService';
import { getAllChildProfiles, ChildProfile } from '@/services/childProfileService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Mountain, MapPin, Check, Loader2, Pencil, Trash2, CalendarIcon, UserPlus, X, Search, List, Users, ImageIcon, Sunrise, Sunset, Info, Trophy, Map as MapIcon } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { hapticsService } from '@/services/hapticsService';
import { RouteElevationChart } from '@/components/map/RouteElevationChart';
import PeakWeather from '@/components/map/PeakWeather';
import PeakLeaderboard from '@/components/map/PeakLeaderboard';
import PeakTripPlanner from '@/components/map/PeakTripPlanner';
import CheckinSuccessAnimation from '@/components/map/CheckinSuccessAnimation';
import CheckinImageUpload from '@/components/map/CheckinImageUpload';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n/useTranslation';

interface PeakDetailDrawerProps {
  peak: Peak | null;
  open: boolean;
  onClose: () => void;
  checkins: PeakCheckin[];
  onCheckinSuccess: () => void;
  adminMode?: boolean;
  onEdit?: (peak: Peak) => void;
  onDelete?: (peakId: string) => void;
  onShowRoute?: (peak: Peak, fromTopper?: boolean) => void;
  onHideRoute?: () => void;
  isRouteShown?: boolean;
  fromTopperTab?: boolean;
  onShowOnMap?: (peak: Peak) => void;
}

const CHECKIN_RADIUS_METERS = 100;
const CHECKIN_COOLDOWN_MS = 3 * 60 * 60 * 1000;
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

// Sunrise/sunset component using Open-Meteo (same API as trip planner, but just today)
const TodaySunTimes = ({ latitude, longitude }: { latitude: number; longitude: number }) => {
  const { language } = useTranslation();
  const [times, setTimes] = useState<{ sunrise: string; sunset: string } | null>(null);

  useEffect(() => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=sunrise,sunset&timezone=auto&forecast_days=1`)
      .then(r => r.json())
      .then(data => {
        if (data.daily) {
          setTimes({
            sunrise: format(new Date(data.daily.sunrise[0]), 'HH:mm'),
            sunset: format(new Date(data.daily.sunset[0]), 'HH:mm'),
          });
        }
      })
      .catch(() => {});
  }, [latitude, longitude]);

  if (!times) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg bg-muted/30 border border-border/30">
        <Sunrise className="w-4 h-4 text-amber-500" />
        <p className="text-[10px] text-muted-foreground">{language === 'no' ? 'Soloppgang' : 'Sunrise'}</p>
        <p className="text-sm font-semibold">{times.sunrise}</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg bg-muted/30 border border-border/30">
        <Sunset className="w-4 h-4 text-orange-500" />
        <p className="text-[10px] text-muted-foreground">{language === 'no' ? 'Solnedgang' : 'Sunset'}</p>
        <p className="text-sm font-semibold">{times.sunset}</p>
      </div>
    </div>
  );
};

const PeakDetailDrawer = ({ peak, open, onClose, checkins, onCheckinSuccess, adminMode, onEdit, onDelete, onShowRoute, onHideRoute, isRouteShown, fromTopperTab, onShowOnMap }: PeakDetailDrawerProps) => {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [showChildCheckin, setShowChildCheckin] = useState(false);
  const [lastNewCheckinId, setLastNewCheckinId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('info');
  
  // Admin manual checkin state
  const [manualCheckinOpen, setManualCheckinOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string | null; avatar_url: string | null; isChild?: boolean }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; username: string | null; avatar_url: string | null; isChild?: boolean } | null>(null);
  const [checkinDate, setCheckinDate] = useState<Date>(new Date());
  const [searching, setSearching] = useState(false);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [adminChildrenForUser, setAdminChildrenForUser] = useState<{ id: string; name: string; emoji: string; avatar_url: string | null }[]>([]);
  const [adminSelectedChildIds, setAdminSelectedChildIds] = useState<Set<string>>(new Set());

  // Admin all checkins state
  const [allCheckinsOpen, setAllCheckinsOpen] = useState(false);
  const [allCheckins, setAllCheckins] = useState<(CheckinWithProfile & { childProfile?: ChildProfile | null })[]>([]);
  const [loadingAllCheckins, setLoadingAllCheckins] = useState(false);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const profiles = await searchProfiles(searchQuery);
        const children = await getAllChildProfiles();
        const matchingChildren = children
          .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(c => ({ id: c.id, username: `${c.name} ${c.emoji}`, avatar_url: c.avatar_url, isChild: true }));
        setSearchResults([...profiles, ...matchingChildren]);
      } catch {}
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!selectedUser || selectedUser.isChild) {
      setAdminChildrenForUser([]);
      setAdminSelectedChildIds(new Set());
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('child_profiles')
        .select('id, name, emoji, avatar_url')
        .eq('parent_user_id', selectedUser.id);
      setAdminChildrenForUser((data || []) as any[]);
      setAdminSelectedChildIds(new Set());
    })();
  }, [selectedUser?.id]);

  useEffect(() => {
    if (!open) {
      setPendingImage(null);
      setUserDistanceToPeak(null);
      setActiveTab('info');
    }
  }, [open, peak?.id]);

  const [userDistanceToPeak, setUserDistanceToPeak] = useState<number | null>(null);
  useEffect(() => {
    if (!open || !peak || !fromTopperTab) return;
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, peak.latitude, peak.longitude);
        setUserDistanceToPeak(dist);
      },
      () => setUserDistanceToPeak(null),
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, [open, peak?.id, fromTopperTab]);

  const peakCheckins = useMemo(() => {
    if (!peak) return [];
    return checkins.filter(c => c.peak_id === peak.id).sort((a, b) => 
      new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime()
    );
  }, [checkins, peak]);

  const checkinCount = peakCheckins.length;
  const lastCheckin = peakCheckins[0] || null;
  const isCheckedIn = checkinCount > 0;

  const canCheckin = useMemo(() => {
    if (!lastCheckin) return true;
    return Date.now() - new Date(lastCheckin.checked_in_at).getTime() > CHECKIN_COOLDOWN_MS;
  }, [lastCheckin]);

  const isInCooldownWindow = useMemo(() => {
    if (!lastCheckin) return false;
    const elapsed = Date.now() - new Date(lastCheckin.checked_in_at).getTime();
    return elapsed <= CHECKIN_COOLDOWN_MS;
  }, [lastCheckin]);

  const isInEditWindow = useMemo(() => {
    if (!lastCheckin) return false;
    const elapsed = Date.now() - new Date(lastCheckin.checked_in_at).getTime();
    return elapsed <= EDIT_WINDOW_MS;
  }, [lastCheckin]);

  const lastCheckinHasImage = lastCheckin && (lastCheckin as any).image_url;
  const showCheckinSection = !fromTopperTab || (userDistanceToPeak !== null && userDistanceToPeak <= CHECKIN_RADIUS_METERS);

  if (!peak) return null;

  const handleCheckin = async () => {
    if (!user) return;
    if (!canCheckin) {
      toast.error(t('map.alreadyCheckedIn'));
      return;
    }
    setLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000 });
      });
      const dist = getDistanceMeters(pos.coords.latitude, pos.coords.longitude, peak.latitude, peak.longitude);
      if (dist > CHECKIN_RADIUS_METERS) {
        toast.error(t('map.tooFar'));
        setLoading(false);
        return;
      }
      const newCheckin = await checkinPeak(user.id, peak.id);
      setLastNewCheckinId(newCheckin.id);
      setShowSuccessAnim(true);
      setShowChildCheckin(true);
      hapticsService.notification('success');
      onCheckinSuccess();
    } catch (err: any) {
      if (err?.code === 1) toast.error(t('map.locationDenied'));
      else toast.error(t('map.checkinError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveImage = async () => {
    if (!user || !pendingImage || !lastCheckin) return;
    setSavingImage(true);
    try {
      await updateCheckinImage(lastCheckin.id, user.id, pendingImage);
      toast.success('Bilde lagret!');
      setPendingImage(null);
      onCheckinSuccess();
    } catch {
      toast.error('Kunne ikke lagre bildet. Prøv igjen.');
    }
    setSavingImage(false);
  };

  const handleManualCheckin = async () => {
    if (!selectedUser || !peak) return;
    setSubmittingCheckin(true);
    try {
      await adminCheckinPeak(selectedUser.id, peak.id, checkinDate.toISOString());
      for (const childId of adminSelectedChildIds) {
        await adminCheckinPeak(childId, peak.id, checkinDate.toISOString());
      }
      const childCount = adminSelectedChildIds.size;
      const msg = childCount > 0
        ? `Innsjekking registrert for ${selectedUser.username} og ${childCount} barn`
        : `Innsjekking registrert for ${selectedUser.username}`;
      toast.success(msg);
      setManualCheckinOpen(false);
      setSelectedUser(null);
      setSearchQuery('');
      setCheckinDate(new Date());
      setAdminSelectedChildIds(new Set());
      onCheckinSuccess();
    } catch (e: any) {
      toast.error(`Kunne ikke registrere innsjekking: ${e?.message || 'Ukjent feil'}`);
    }
    setSubmittingCheckin(false);
  };

  const loadAllCheckins = async () => {
    if (!peak) return;
    setLoadingAllCheckins(true);
    try {
      const checkinData = await getAllCheckinsForPeak(peak.id);
      const userIdsWithoutProfile = checkinData.filter(c => !c.profiles).map(c => c.user_id);
      let childMap = new Map<string, ChildProfile>();
      if (userIdsWithoutProfile.length > 0) {
        const children = await getAllChildProfiles();
        childMap = new Map(children.map(c => [c.id, c]));
      }
      setAllCheckins(checkinData.map(c => ({
        ...c,
        childProfile: childMap.get(c.user_id) || null,
      })));
    } catch { toast.error('Kunne ikke laste innsjekkinger'); }
    setLoadingAllCheckins(false);
  };

  const handleDeleteCheckin = async (checkinId: string) => {
    try {
      await deleteCheckin(checkinId);
      toast.success('Innsjekking slettet');
      loadAllCheckins();
      onCheckinSuccess();
    } catch { toast.error('Kunne ikke slette innsjekking'); }
    setDeleteConfirmId(null);
  };

  const handleDeleteOwnCheckin = async () => {
    if (!lastCheckin) return;
    try {
      await deleteCheckin(lastCheckin.id);
      toast.success('Innsjekking slettet');
      onCheckinSuccess();
    } catch { toast.error('Kunne ikke slette innsjekking'); }
    setDeleteConfirmId(null);
  };

  return (
    <>
      <CheckinSuccessAnimation show={showSuccessAnim} onDone={() => setShowSuccessAnim(false)} peakName={peak.name} />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett innsjekking</AlertDialogTitle>
            <AlertDialogDescription>Er du sikker på at du vil slette denne innsjekkingen? Dette kan ikke angres.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => {
              if (deleteConfirmId === 'own') handleDeleteOwnCheckin();
              else if (deleteConfirmId) handleDeleteCheckin(deleteConfirmId);
            }}>Slett</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            {/* 3D orbit map */}
            <div className="rounded-xl overflow-hidden border border-border/50">
              <PeakOrbitMap latitude={peak.latitude} longitude={peak.longitude} heightMoh={peak.heightMoh} className="w-full h-[180px]" />
            </div>

            {/* Show on map button - only from Topper tab */}
            {fromTopperTab && onShowOnMap && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => onShowOnMap(peak)}>
                <MapPin className="w-4 h-4 mr-2" />
                {language === 'no' ? 'Vis på kart' : 'Show on map'}
              </Button>
            )}

            {/* Check-in section */}
            {showCheckinSection && (
              <>
                {isCheckedIn ? (
                  <div className="p-3 rounded-xl bg-success/10 border border-success/20 space-y-2">
                    {/* Checkin button */}
                    <Button onClick={handleCheckin} disabled={loading || !canCheckin} variant="outline" size="sm" className="w-full">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                      {canCheckin ? (language === 'no' ? 'Sjekk inn' : 'Check in') : (language === 'no' ? 'Du er sjekket inn' : 'Already checked in')}
                    </Button>

                    {/* Checkin count - below button */}
                    <div className="flex items-center justify-center gap-2 text-center">
                      <Check className="w-4 h-4 text-success shrink-0" />
                      <span className="text-sm font-medium text-success">
                        {checkinCount} {language === 'no' 
                          ? (checkinCount === 1 ? 'tidligere innsjekking' : 'tidligere innsjekkinger')
                          : (checkinCount === 1 ? 'previous check-in' : 'previous check-ins')}
                      </span>
                      {lastCheckin && (
                        <span className="text-xs text-muted-foreground">
                          ({language === 'no' ? 'sist' : 'last'} {format(new Date(lastCheckin.checked_in_at), "d. MMMM yyyy", { locale: nb })})
                        </span>
                      )}
                    </div>

                    {/* Image upload/replace within 24h */}
                    {isInEditWindow && (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        {lastCheckinHasImage ? (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Du kan endre bildet innen 24 timer.</p>
                            <CheckinImageUpload onImageReady={setPendingImage} />
                            {pendingImage && (
                              <Button onClick={handleSaveImage} disabled={savingImage} size="sm" className="w-full">
                                {savingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                                {savingImage ? 'Lagrer...' : 'Bytt bilde'}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-destructive hover:text-destructive"
                              onClick={async () => {
                                if (!lastCheckin) return;
                                try {
                                  await supabase.from('peak_checkins').update({ image_url: null }).eq('id', lastCheckin.id);
                                  toast.success('Bilde fjernet');
                                  onCheckinSuccess();
                                } catch { toast.error('Kunne ikke fjerne bildet'); }
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />Fjern bilde
                            </Button>
                          </div>
                        ) : (
                          <>
                            <CheckinImageUpload onImageReady={setPendingImage} />
                            {pendingImage && (
                              <Button onClick={handleSaveImage} disabled={savingImage} size="sm" className="w-full mt-2">
                                {savingImage ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {savingImage ? 'Lagrer...' : 'Lagre bilde'}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Delete own checkin */}
                    {isInEditWindow && (
                      <Button variant="outline" size="sm" className="w-full mt-2 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId('own')}>
                        <Trash2 className="w-4 h-4 mr-2" />Slett innsjekking
                      </Button>
                    )}

                    {/* Child checkin */}
                    {isInCooldownWindow && (
                      <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => setShowChildCheckin(true)}>
                        <Users className="w-4 h-4 mr-2" />Sjekk inn barn
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button onClick={handleCheckin} disabled={loading} className="w-full" size="lg">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <MapPin className="w-4 h-4 mr-2" />}
                    {language === 'no' ? 'Sjekk inn' : 'Check in'}
                  </Button>
                )}
              </>
            )}

            {/* Three tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="info" className="text-sm gap-1.5">
                  <Info className="w-4 h-4" /> Info
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="text-sm gap-1.5">
                  <Trophy className="w-4 h-4" /> {language === 'no' ? 'Lederliste' : 'Leaderboard'}
                </TabsTrigger>
                <TabsTrigger value="plan" className="text-sm gap-1.5">
                  <MapIcon className="w-4 h-4" /> {language === 'no' ? 'Planlegg tur' : 'Plan trip'}
                </TabsTrigger>
              </TabsList>

              {/* INFO TAB */}
              <TabsContent value="info" className="space-y-4 mt-3">
                {/* Route button */}
                {peak.route_status === 'approved' && onShowRoute && (
                  <div className="flex flex-col gap-2">
                    {isRouteShown ? (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => onHideRoute?.()}>
                        <X className="w-4 h-4 mr-2" />{language === 'no' ? 'Skjul rute' : 'Hide route'}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => onShowRoute(peak, fromTopperTab)}>
                        {language === 'no' ? 'Vis rute' : 'Show route'} ({((peak.route_distance_m || 0) / 1000).toFixed(1)} km, {Math.round((peak.route_duration_s || 0) / 60)} min)
                      </Button>
                    )}
                  </div>
                )}

                {/* Elevation chart */}
                {peak.route_status === 'approved' && peak.route_geojson && (
                  <div className="bg-muted/10 p-3 rounded-xl border border-border/50">
                    <RouteElevationChart geojson={peak.route_geojson} />
                  </div>
                )}

                {/* Weather */}
                <PeakWeather latitude={peak.latitude} longitude={peak.longitude} />

                {/* Sunrise/sunset today */}
                <TodaySunTimes latitude={peak.latitude} longitude={peak.longitude} />

                {peak.description && <p className="text-sm text-muted-foreground">{peak.description}</p>}

                {peak.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-border/50">
                    <img src={peak.imageUrl} alt={peak.name} className="w-full h-40 object-cover" />
                  </div>
                )}
              </TabsContent>

              {/* LEADERBOARD TAB */}
              <TabsContent value="leaderboard" className="mt-3">
                <PeakLeaderboard peakId={peak.id} />
              </TabsContent>

              {/* PLAN TRIP TAB */}
              <TabsContent value="plan" className="mt-3">
                <PeakTripPlanner latitude={peak.latitude} longitude={peak.longitude} peakName={peak.name} />
              </TabsContent>
            </Tabs>

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
                        <Label>Søk etter bruker eller barn</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Brukernavn eller barnenavn..." className="pl-9" />
                        </div>
                        {searching && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" />Søker...</div>}
                        {searchResults.length > 0 && !selectedUser && (
                          <div className="border border-border rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                            {searchResults.map((profile) => (
                              <button key={profile.id} onClick={() => { setSelectedUser(profile); setSearchQuery(''); setSearchResults([]); }} className="w-full flex items-center gap-3 p-2 hover:bg-muted transition-colors text-left">
                                <Avatar className="w-8 h-8"><AvatarImage src={profile.avatar_url || undefined} /><AvatarFallback>{profile.isChild ? '👶' : (profile.username?.[0]?.toUpperCase() || '?')}</AvatarFallback></Avatar>
                                <span className="text-sm font-medium">{profile.username || 'Ukjent'}{profile.isChild && <span className="text-xs text-muted-foreground ml-1">(barn)</span>}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedUser && (
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10"><AvatarImage src={selectedUser.avatar_url || undefined} /><AvatarFallback>{selectedUser.isChild ? '👶' : (selectedUser.username?.[0]?.toUpperCase() || '?')}</AvatarFallback></Avatar>
                            <span className="font-medium">{selectedUser.username || 'Ukjent'}</span>
                          </div>
                          <button onClick={() => setSelectedUser(null)} className="p-1 rounded hover:bg-muted transition-colors"><X className="w-4 h-4 text-muted-foreground" /></button>
                        </div>
                      )}
                      {selectedUser && !selectedUser.isChild && adminChildrenForUser.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Inkluder barn</Label>
                          {adminChildrenForUser.map(child => {
                            const isSelected = adminSelectedChildIds.has(child.id);
                            return (
                              <button key={child.id} onClick={() => {
                                setAdminSelectedChildIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(child.id)) next.delete(child.id);
                                  else next.add(child.id);
                                  return next;
                                });
                              }} className={`w-full flex items-center gap-2 p-2 rounded-lg border transition-colors ${isSelected ? 'bg-primary/5 border-primary/30' : 'border-border/50 hover:border-border'}`}>
                                <Checkbox checked={isSelected} className="pointer-events-none" />
                                <Avatar className="w-6 h-6">{child.avatar_url && <AvatarImage src={child.avatar_url} />}<AvatarFallback className="text-[10px]">{child.emoji || '👶'}</AvatarFallback></Avatar>
                                <span className="text-sm">{child.name} {child.emoji}</span>
                              </button>
                            );
                          })}
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
                          {allCheckins.map((checkin) => {
                            const displayName = checkin.profiles?.username || checkin.childProfile?.name || 'Ukjent bruker';
                            const displayAvatar = checkin.profiles?.avatar_url || checkin.childProfile?.avatar_url || undefined;
                            const displayEmoji = checkin.childProfile?.emoji;
                            return (
                              <div key={checkin.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-10 h-10"><AvatarImage src={displayAvatar} /><AvatarFallback>{displayEmoji || displayName[0]?.toUpperCase() || '?'}</AvatarFallback></Avatar>
                                  <div>
                                    <p className="font-medium text-sm">{displayName}{checkin.childProfile && <span className="text-xs text-muted-foreground ml-1">(barn)</span>}</p>
                                    <p className="text-xs text-muted-foreground">{format(new Date(checkin.checked_in_at), "d. MMM yyyy, HH:mm", { locale: nb })}</p>
                                  </div>
                                </div>
                                <button onClick={() => setDeleteConfirmId(checkin.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            );
                          })}
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
      {peak && (
        <ChildCheckinSheet
          open={showChildCheckin}
          onClose={() => setShowChildCheckin(false)}
          peakId={peak.id}
          peakName={peak.name}
          onCheckinSuccess={onCheckinSuccess}
          parentCheckinId={lastNewCheckinId || lastCheckin?.id || null}
        />
      )}
    </>
  );
};

export default PeakDetailDrawer;
