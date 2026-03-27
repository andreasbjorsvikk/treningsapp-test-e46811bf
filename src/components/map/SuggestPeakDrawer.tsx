import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { submitSuggestion } from '@/services/peakSuggestionService';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/i18n/useTranslation';

interface SuggestPeakDrawerProps {
  open: boolean;
  onClose: () => void;
  latitude: number;
  longitude: number;
}

const SuggestPeakDrawer = ({ open, onClose, latitude, longitude }: SuggestPeakDrawerProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [elevation, setElevation] = useState('');
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (open && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      await submitSuggestion({
        submitted_by: user.id,
        name: name.trim(),
        elevation_moh: elevation ? Number(elevation) : null,
        comment: comment.trim() || null,
        latitude,
        longitude,
        user_latitude: userLocation?.lat,
        user_longitude: userLocation?.lng,
      });
      toast.success(t('suggestPeak.success'));
      setName('');
      setElevation('');
      setComment('');
      onClose();
    } catch {
      toast.error(t('suggestPeak.error'));
    }
    setSaving(false);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="font-display">{t('suggestPeak.title')}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            {t('suggestPeak.desc')}
          </p>
          <div className="space-y-2">
            <Label>{t('suggestPeak.name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('suggestPeak.namePlaceholder')} />
          </div>
          <div className="space-y-2">
            <Label>{t('suggestPeak.elevation')}</Label>
            <Input type="number" value={elevation} onChange={(e) => setElevation(e.target.value)} placeholder={t('suggestPeak.elevationPlaceholder')} />
          </div>
          <div className="space-y-2">
            <Label>{t('suggestPeak.comment')}</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('suggestPeak.commentPlaceholder')} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('suggestPeak.latitude')}</Label>
              <p className="text-sm font-medium">{latitude.toFixed(6)}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{t('suggestPeak.longitude')}</Label>
              <p className="text-sm font-medium">{longitude.toFixed(6)}</p>
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()} className="w-full" size="lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {t('suggestPeak.submit')}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default SuggestPeakDrawer;
