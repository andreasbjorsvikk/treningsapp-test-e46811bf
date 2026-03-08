import { useState, useRef } from 'react';
import { DbPeak } from '@/services/peakDbService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload, X } from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { uploadPeakImage } from '@/services/peakDbService';

interface AdminPeakFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name_no: string;
    elevation_moh: number;
    area: string;
    description_no: string;
    latitude: number;
    longitude: number;
    is_published: boolean;
    image_url: string | null;
  }) => Promise<void>;
  initial?: Partial<DbPeak>;
  title: string;
  peakId?: string;
}

const AdminPeakForm = ({ open, onClose, onSave, initial, title, peakId }: AdminPeakFormProps) => {
  const [name, setName] = useState(initial?.name_no || '');
  const [elevation, setElevation] = useState(String(initial?.elevation_moh ?? ''));
  const [area, setArea] = useState(initial?.area || '');
  const [description, setDescription] = useState(initial?.description_no || '');
  const [lat, setLat] = useState(String(initial?.latitude ?? ''));
  const [lng, setLng] = useState(String(initial?.longitude ?? ''));
  const [published, setPublished] = useState(initial?.is_published ?? true);
  const [imageUrl, setImageUrl] = useState(initial?.image_url || null);
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
      });
      onClose();
    } catch {
      // silent
    }
    setSaving(false);
  };

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[90vh]">
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

          <Button onClick={handleSubmit} disabled={saving || !name.trim()} className="w-full" size="lg">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Lagre
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AdminPeakForm;
