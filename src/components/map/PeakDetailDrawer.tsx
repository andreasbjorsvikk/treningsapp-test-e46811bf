import { Peak } from '@/data/peaks';
import { PeakCheckin, checkinPeak, getDistanceMeters } from '@/services/peakCheckinService';
import { useTranslation } from '@/i18n/useTranslation';
import { useAuth } from '@/hooks/useAuth';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Mountain, MapPin, Check, Loader2, ImageIcon, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PeakDetailDrawerProps {
  peak: Peak | null;
  open: boolean;
  onClose: () => void;
  checkins: PeakCheckin[];
  onCheckinSuccess: () => void;
  adminMode?: boolean;
  onEdit?: (peak: Peak) => void;
  onDelete?: (peakId: string) => void;
}

const CHECKIN_RADIUS_METERS = 100;

const PeakDetailDrawer = ({ peak, open, onClose, checkins, onCheckinSuccess, adminMode, onEdit, onDelete }: PeakDetailDrawerProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

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

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="pb-2">
          <div className="flex items-center justify-between">
            <DrawerTitle className="font-display text-lg">{peak.name}</DrawerTitle>
            {adminMode && (
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
            )}
          </div>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          {/* Static map */}
          <div className="rounded-xl overflow-hidden border border-border/50">
            <img src={staticMapUrl} alt={`Kart over ${peak.name}`} className="w-full h-[160px] object-cover" loading="lazy" />
          </div>

          {/* Info */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <Mountain className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{peak.heightMoh} moh</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{peak.area}</span>
            </div>
          </div>

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
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default PeakDetailDrawer;
