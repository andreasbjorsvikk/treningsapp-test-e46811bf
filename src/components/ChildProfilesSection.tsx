import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ChildProfile, getChildProfiles, createChildProfile, updateChildProfile, deleteChildProfile, uploadChildAvatar } from '@/services/childProfileService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Camera, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import AvatarCropper from '@/components/AvatarCropper';

const ChildProfilesSection = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<ChildProfile | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropChildId, setCropChildId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadChildren();
  }, [user]);

  const loadChildren = async () => {
    if (!user) return;
    setLoading(true);
    try {
      setChildren(await getChildProfiles(user.id));
    } catch {
      toast.error('Kunne ikke laste barn-profiler');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      if (editingChild) {
        await updateChildProfile(editingChild.id, { name: name.trim() });
        toast.success('Barn oppdatert');
      } else {
        await createChildProfile(user.id, name.trim());
        toast.success('Barn lagt til');
      }
      setDialogOpen(false);
      setEditingChild(null);
      setName('');
      loadChildren();
    } catch {
      toast.error('Kunne ikke lagre');
    }
    setSaving(false);
  };

  const handleDelete = async (child: ChildProfile) => {
    if (!confirm(`Er du sikker på at du vil slette ${child.name}? Alle innsjekkinger for dette barnet vil også bli slettet.`)) return;
    try {
      await deleteChildProfile(child.id);
      toast.success(`${child.name} ble slettet`);
      loadChildren();
    } catch {
      toast.error('Kunne ikke slette');
    }
  };

  const handleAvatarSelect = (childId: string) => {
    setCropChildId(childId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropFile(file);
    setShowCropper(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCroppedUpload = async (blob: Blob) => {
    if (!user || !cropChildId) return;
    setShowCropper(false);
    setCropFile(null);
    setUploadingId(cropChildId);
    try {
      const file = new File([blob], 'avatar.png', { type: 'image/png' });
      await uploadChildAvatar(cropChildId, user.id, file);
      loadChildren();
    } catch {
      toast.error('Kunne ikke laste opp bilde');
    }
    setUploadingId(null);
    setCropChildId(null);
  };

  const openEdit = (child: ChildProfile) => {
    setEditingChild(child);
    setName(child.name);
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingChild(null);
    setName('');
    setDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Laster...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">Barn</Label>
          </div>
          <Button size="sm" variant="outline" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />
            Legg til
          </Button>
        </div>

        {children.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Legg til barn for å sjekke dem inn på fjelltopper sammen med deg.
          </p>
        ) : (
          <div className="space-y-2">
            {children.map(child => (
              <div key={child.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="relative">
                  <Avatar className="w-10 h-10">
                    {child.avatar_url ? <AvatarImage src={child.avatar_url} /> : null}
                    <AvatarFallback className="text-sm font-bold">
                      {child.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => handleAvatarSelect(child.id)}
                    disabled={uploadingId === child.id}
                    className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                  >
                    {uploadingId === child.id ? (
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    ) : (
                      <Camera className="w-2.5 h-2.5" />
                    )}
                  </button>
                </div>
                <span className="flex-1 text-sm font-medium">{child.name}</span>
                <button onClick={() => openEdit(child)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(child)} className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      
      <AvatarCropper
        open={showCropper}
        imageFile={cropFile}
        imageUrl={null}
        onConfirm={handleCroppedUpload}
        onCancel={() => { setShowCropper(false); setCropFile(null); setCropChildId(null); }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingChild ? 'Rediger barn' : 'Legg til barn'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Navn</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Barnets navn..."
                autoFocus
              />
            </div>
            <Button onClick={handleSave} disabled={!name.trim() || saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingChild ? 'Lagre' : 'Legg til'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ChildProfilesSection;
