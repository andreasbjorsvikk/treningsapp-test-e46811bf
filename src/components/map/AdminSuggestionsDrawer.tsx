import { useState, useEffect } from 'react';
import { PeakSuggestion, fetchSuggestions, reviewSuggestion } from '@/services/peakSuggestionService';
import { createPeak } from '@/services/peakDbService';
import { checkinPeak, getDistanceMeters } from '@/services/peakCheckinService';
import { useAuth } from '@/hooks/useAuth';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, X, Loader2, Mountain, MapPin, User, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AdminSuggestionsDrawerProps {
  open: boolean;
  onClose: () => void;
  onApproved: () => void;
}

const AdminSuggestionsDrawer = ({ open, onClose, onApproved }: AdminSuggestionsDrawerProps) => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<PeakSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PeakSuggestion | null>(null);
  const [adminComment, setAdminComment] = useState('');
  const [processing, setProcessing] = useState(false);
  const [submitterNames, setSubmitterNames] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchSuggestions();
      setSuggestions(data);
      // Fetch submitter names
      const userIds = [...new Set(data.map(s => s.submitted_by))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
        const names: Record<string, string> = {};
        profiles?.forEach((p: any) => { names[p.id] = p.username || 'Ukjent'; });
        setSubmitterNames(names);
      }
    } catch { }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selected || !user) return;
    setProcessing(true);
    try {
      await reviewSuggestion(selected.id, status, user.id, adminComment || undefined);
      if (status === 'approved') {
        const newPeak = await createPeak({
          name_no: selected.name,
          elevation_moh: selected.elevation_moh || 0,
          area: '',
          description_no: selected.comment || '',
          image_url: null,
          latitude: selected.latitude,
          longitude: selected.longitude,
          is_published: true,
          created_by: user.id,
          route_start_lat: null,
          route_start_lng: null,
          route_geojson: null,
          route_distance_m: null,
          route_duration_s: null,
          route_status: 'none',
          route_waypoints: null,
        });

        let autoCheckedIn = false;
        let dist = 0;
        if (selected.user_latitude && selected.user_longitude) {
          dist = getDistanceMeters(selected.latitude, selected.longitude, selected.user_latitude, selected.user_longitude);
          if (dist <= 100) {
            try {
              await checkinPeak(selected.submitted_by, newPeak.id, selected.created_at);
              autoCheckedIn = true;
            } catch (e) {
              console.error("Failed to auto checkin", e);
            }
          }
        }

        if (autoCheckedIn) {
          toast.success(`Toppen ble godkjent, og brukeren ble sjekket inn automatisk (${Math.round(dist)}m unna)`);
        } else {
          toast.success('Toppen ble godkjent og opprettet');
        }
        
        onApproved();
      } else {
        toast.success('Forslaget ble avslått');
      }
      setSelected(null);
      setAdminComment('');
      load();
    } catch {
      toast.error('Noe gikk galt');
    }
    setProcessing(false);
  };

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-success/15 text-success border-0 text-[10px]">Godkjent</Badge>;
    if (status === 'rejected') return <Badge variant="destructive" className="text-[10px]">Avslått</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Venter</Badge>;
  };

  const mapboxToken = 'pk.eyJ1IjoiYW5kcmVhc2Jqb3JzdmlrIiwiYSI6ImNtbWFoZ296NjBic3AycXM5cXc5ZXo2YXkifQ.51vqIJR0s9PWV8ChBZunKw';

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="font-display">Foreslåtte topper</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : selected ? (
            <div className="space-y-4">
              <button onClick={() => setSelected(null)} className="text-sm text-muted-foreground hover:text-foreground">
                ← Tilbake
              </button>
              <div className="rounded-xl overflow-hidden border border-border/50">
                <img
                  src={`https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/pin-s+ef4444(${selected.longitude},${selected.latitude})/${selected.longitude},${selected.latitude},13,0/400x180@2x?access_token=${mapboxToken}`}
                  alt="Kart"
                  className="w-full h-[140px] object-cover"
                />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg">{selected.name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  {selected.elevation_moh && (
                    <span className="flex items-center gap-1"><Mountain className="w-3.5 h-3.5" />{selected.elevation_moh} moh</span>
                  )}
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}</span>
                </div>
              </div>
              {selected.comment && (
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">{selected.comment}</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3.5 h-3.5" />
                <span>{submitterNames[selected.submitted_by] || 'Ukjent'}</span>
                <Clock className="w-3.5 h-3.5 ml-2" />
                <span>{new Date(selected.created_at).toLocaleDateString('nb-NO')}</span>
              </div>

              {selected.status === 'pending' && (
                <>
                  <div className="space-y-2">
                    <Label>Adminkommentar (valgfritt)</Label>
                    <Textarea value={adminComment} onChange={(e) => setAdminComment(e.target.value)} rows={2} placeholder="Eventuell kommentar..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => handleReview('rejected')} variant="outline" disabled={processing} className="text-destructive">
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <X className="w-4 h-4 mr-1" />}
                      Avslå
                    </Button>
                    <Button onClick={() => handleReview('approved')} disabled={processing}>
                      {processing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                      Godkjenn
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : suggestions.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Ingen forslag å vise.</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelected(s); setAdminComment(''); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                    <Mountain className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm">{s.name}</span>
                      {statusBadge(s.status)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {submitterNames[s.submitted_by] || 'Ukjent'} · {new Date(s.created_at).toLocaleDateString('nb-NO')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AdminSuggestionsDrawer;
