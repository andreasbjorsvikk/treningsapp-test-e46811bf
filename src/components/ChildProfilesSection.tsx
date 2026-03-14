import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ChildProfile, getChildProfiles, createChildProfile, updateChildProfile, deleteChildProfile } from '@/services/childProfileService';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, Camera, Loader2, Users, UserPlus, Search, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import AvatarCropper from '@/components/AvatarCropper';
import ChildProfileDetailDrawer from '@/components/map/ChildProfileDetailDrawer';
import { supabase } from '@/integrations/supabase/client';

// Emoji categories with skin tone variants
const EMOJI_CATEGORIES = [
  { base: '👶', label: 'Baby', variants: ['👶', '👶🏻', '👶🏼', '👶🏽', '👶🏾', '👶🏿'] },
  { base: '👦', label: 'Gutt', variants: ['👦', '👦🏻', '👦🏼', '👦🏽', '👦🏾', '👦🏿'] },
  { base: '👧', label: 'Jente', variants: ['👧', '👧🏻', '👧🏼', '👧🏽', '👧🏾', '👧🏿'] },
];

const EmojiPicker = ({ emoji, onSelect }: { emoji: string; onSelect: (v: string) => void }) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const currentCategory = EMOJI_CATEGORIES.find(c => c.variants.includes(emoji));

  return (
    <div className="space-y-2">
      <Label>Emoji</Label>
      <div className="flex gap-2">
        {EMOJI_CATEGORIES.map(cat => {
          const isExpanded = expandedCategory === cat.base;
          const isSelected = currentCategory?.base === cat.base;
          return (
            <button
              key={cat.base}
              onClick={() => {
                if (isExpanded) {
                  setExpandedCategory(null);
                } else {
                  setExpandedCategory(cat.base);
                  if (!isSelected) onSelect(cat.base);
                }
              }}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border-2 transition-all flex-1 ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <span className="text-2xl">{isSelected ? emoji : cat.base}</span>
              <span className="text-[10px] text-muted-foreground">{cat.label}</span>
            </button>
          );
        })}
      </div>
      {expandedCategory && (
        <div className="flex gap-1.5 justify-center pt-1">
          {EMOJI_CATEGORIES.find(c => c.base === expandedCategory)?.variants.map(v => (
            <button
              key={v}
              onClick={() => onSelect(v)}
              className={`flex items-center justify-center w-9 h-9 rounded-lg border-2 transition-all ${
                emoji === v
                  ? 'border-primary bg-primary/10 scale-110'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <span className="text-xl">{v}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

interface SharedUser {
  child_id: string;
  shared_with_user_id: string;
  status: string;
  username: string | null;
  avatar_url: string | null;
}

const ChildProfilesSection = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<(ChildProfile & { emoji?: string })[]>([]);
  const [sharedChildren, setSharedChildren] = useState<(ChildProfile & { emoji?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChild, setEditingChild] = useState<(ChildProfile & { emoji?: string }) | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('👶');
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropChildId, setCropChildId] = useState<string | null>(null);

  // Sharing state
  const [sharingChildId, setSharingChildId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string | null; avatar_url: string | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [inviting, setInviting] = useState(false);

  // Pending shared-with-me invitations
  const [pendingInvitations, setPendingInvitations] = useState<{ id: string; child: ChildProfile; inviter_username: string | null }[]>([]);
  const [respondingInvite, setRespondingInvite] = useState<string | null>(null);
  
  // Child profile detail
  const [selectedChildDetail, setSelectedChildDetail] = useState<ChildProfile | null>(null);

  useEffect(() => {
    if (!user) return;
    loadChildren();
    loadSharedChildren();
    loadPendingInvitations();
  }, [user]);

  const loadChildren = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getChildProfiles(user.id);
      setChildren(data as any);
    } catch {
      toast.error('Kunne ikke laste barn-profiler');
    }
    setLoading(false);
  };

  const loadSharedChildren = async () => {
    if (!user) return;
    try {
      const { getSharedChildProfiles } = await import('@/services/childProfileService');
      const data = await getSharedChildProfiles(user.id);
      setSharedChildren(data as any);
    } catch {}
  };

  const loadPendingInvitations = async () => {
    if (!user) return;
    try {
      const { data: access } = await supabase
        .from('child_shared_access')
        .select('id, child_id, invited_by, status')
        .eq('shared_with_user_id', user.id)
        .eq('status', 'pending');

      if (!access || access.length === 0) { setPendingInvitations([]); return; }

      const childIds = access.map(a => a.child_id);
      const inviterIds = access.map(a => a.invited_by);

      const [{ data: childData }, { data: inviterData }] = await Promise.all([
        supabase.from('child_profiles').select('*').in('id', childIds),
        supabase.from('profiles').select('id, username').in('id', inviterIds),
      ]);

      const childMap = new Map((childData || []).map(c => [c.id, c]));
      const inviterMap = new Map((inviterData || []).map(p => [p.id, p]));

      setPendingInvitations(access.map(a => ({
        id: a.id,
        child: childMap.get(a.child_id) as unknown as ChildProfile,
        inviter_username: inviterMap.get(a.invited_by)?.username || null,
      })).filter(i => i.child));
    } catch {
      console.error('Error loading pending invitations');
    }
  };

  const handleRespondInvitation = async (accessId: string, accept: boolean) => {
    setRespondingInvite(accessId);
    try {
      await supabase.from('child_shared_access').update({ status: accept ? 'accepted' : 'declined' }).eq('id', accessId);
      toast.success(accept ? 'Invitasjon godkjent!' : 'Invitasjon avvist');
      loadPendingInvitations();
      if (accept) loadSharedChildren();
    } catch {
      toast.error('Kunne ikke svare på invitasjon');
    }
    setRespondingInvite(null);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      if (editingChild) {
        await updateChildProfile(editingChild.id, { name: name.trim(), emoji });
        toast.success('Barn oppdatert');
      } else {
        await createChildProfile(user.id, name.trim(), emoji);
        toast.success('Barn lagt til');
      }
      setDialogOpen(false);
      setEditingChild(null);
      setName('');
      setEmoji('👶');
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
      // Use blob directly instead of File constructor for better iOS compatibility
      const path = `${user.id}/children/${cropChildId}/avatar.png`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: 'image/png' });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${urlData.publicUrl}?t=${Date.now()}`;
      await updateChildProfile(cropChildId, { avatar_url: url });
      loadChildren();
    } catch (e) {
      console.error('Child avatar upload error:', e);
      toast.error('Kunne ikke laste opp bilde');
    }
    setUploadingId(null);
    setCropChildId(null);
  };

  const openEdit = (child: ChildProfile & { emoji?: string }) => {
    setEditingChild(child);
    setName(child.name);
    setEmoji((child as any).emoji || '👶');
    setDialogOpen(true);
  };

  const openAdd = () => {
    setEditingChild(null);
    setName('');
    setEmoji('👶');
    setDialogOpen(true);
  };

  // Sharing functions
  const openSharing = async (childId: string) => {
    setSharingChildId(childId);
    setSearchQuery('');
    setSearchResults([]);
    const { data } = await supabase
      .from('child_shared_access')
      .select('child_id, shared_with_user_id, status')
      .eq('child_id', childId);

    if (data && data.length > 0) {
      const userIds = data.map((d: any) => d.shared_with_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));
      setSharedUsers(data.map((d: any) => ({
        ...d,
        username: profileMap.get(d.shared_with_user_id)?.username || null,
        avatar_url: profileMap.get(d.shared_with_user_id)?.avatar_url || null,
      })));
    } else {
      setSharedUsers([]);
    }
  };

  const searchFriends = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', user!.id)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  };

  const inviteUser = async (targetUserId: string) => {
    if (!sharingChildId || !user) return;
    setInviting(true);
    try {
      const { data: insertedAccess, error } = await supabase
        .from('child_shared_access')
        .insert({
          child_id: sharingChildId,
          shared_with_user_id: targetUserId,
          invited_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      const child = children.find(c => c.id === sharingChildId);
      const childName = child?.name || 'et barn';

      // Get the current user's username for the notification
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      const myName = myProfile?.username || 'Noen';

      await supabase.from('community_notifications').insert({
        user_id: targetUserId,
        from_user_id: user.id,
        type: 'child_share',
        title: 'Delt barneprofil',
        message: `${myName} har delt barneprofilen «${childName}» med deg.`,
        challenge_id: (insertedAccess as any).id,
      });

      toast.success('Invitasjon sendt!');
      openSharing(sharingChildId);
    } catch (e: any) {
      if (e?.code === '23505') {
        toast.info('Allerede invitert');
      } else {
        toast.error('Kunne ikke sende invitasjon');
      }
    }
    setInviting(false);
  };

  const removeSharedAccess = async (childId: string, userId: string) => {
    await supabase.from('child_shared_access').delete().eq('child_id', childId).eq('shared_with_user_id', userId);
    toast.success('Tilgang fjernet');
    openSharing(childId);
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
                  <button onClick={() => setSelectedChildDetail(child as unknown as ChildProfile)}>
                    <Avatar className="w-10 h-10">
                      {child.avatar_url ? <AvatarImage src={child.avatar_url} /> : null}
                      <AvatarFallback className="text-sm font-bold">
                        {(child as any).emoji || '👶'}
                      </AvatarFallback>
                    </Avatar>
                  </button>
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
                <button onClick={() => setSelectedChildDetail(child as unknown as ChildProfile)} className="flex-1 min-w-0 text-left">
                  <span className="text-sm font-medium">{child.name}</span>
                  <span className="ml-1 text-sm">{(child as any).emoji || '👶'}</span>
                </button>
                <button onClick={() => openSharing(child.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground" title="Del med andre">
                  <UserPlus className="w-3.5 h-3.5" />
                </button>
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

      {/* Shared (accepted) children from other parents */}
      {sharedChildren.length > 0 && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">Delte barn</Label>
          </div>
          <div className="space-y-2">
            {sharedChildren.map(child => (
              <div key={child.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <button onClick={() => setSelectedChildDetail(child as unknown as ChildProfile)}>
                  <Avatar className="w-10 h-10">
                    {child.avatar_url ? <AvatarImage src={child.avatar_url} /> : null}
                    <AvatarFallback className="text-sm font-bold">
                      {(child as any).emoji || '👶'}
                    </AvatarFallback>
                  </Avatar>
                </button>
                <button onClick={() => setSelectedChildDetail(child as unknown as ChildProfile)} className="flex-1 min-w-0 text-left">
                  <span className="text-sm font-medium">{child.name}</span>
                  <span className="ml-1 text-sm">{(child as any).emoji || '👶'}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Pending shared invitations */}
      {pendingInvitations.length > 0 && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <Label className="text-sm font-semibold">Delte barneprofiler</Label>
          </div>
          <div className="space-y-2">
            {pendingInvitations.map(inv => (
              <div key={inv.id} className="p-3 rounded-lg border border-border/50 bg-card space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    {inv.child.avatar_url ? <AvatarImage src={inv.child.avatar_url} /> : null}
                    <AvatarFallback className="text-sm font-bold">{inv.child.emoji || '👶'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{inv.child.name} {inv.child.emoji}</p>
                    <p className="text-xs text-muted-foreground">Delt av {inv.inviter_username || 'ukjent'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleRespondInvitation(inv.id, true)}
                    disabled={respondingInvite === inv.id}
                  >
                    {respondingInvite === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Check className="w-3.5 h-3.5 mr-1" />}
                    Godta
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleRespondInvitation(inv.id, false)}
                    disabled={respondingInvite === inv.id}
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Avvis
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      
      <AvatarCropper
        open={showCropper}
        imageFile={cropFile}
        imageUrl={null}
        onConfirm={handleCroppedUpload}
        onCancel={() => { setShowCropper(false); setCropFile(null); setCropChildId(null); }}
      />

      {/* Add/Edit child dialog */}
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
            <EmojiPicker emoji={emoji} onSelect={setEmoji} />
            <Button onClick={handleSave} disabled={!name.trim() || saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingChild ? 'Lagre' : 'Legg til'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share child dialog */}
      <Dialog open={!!sharingChildId} onOpenChange={(open) => { if (!open) setSharingChildId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Del barn med andre</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Inviter en annen bruker til å ha dette barnet i sin profil. De kan da også sjekke inn barnet på fjelltopper.
          </p>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => searchFriends(e.target.value)}
              placeholder="Søk etter brukernavn..."
              className="pl-9"
            />
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {searchResults.map(p => {
                const alreadyShared = sharedUsers.some(s => s.shared_with_user_id === p.id);
                return (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30">
                    <Avatar className="w-8 h-8">
                      {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                      <AvatarFallback className="text-xs">{p.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 text-sm">{p.username || 'Ukjent'}</span>
                    {alreadyShared ? (
                      <span className="text-xs text-muted-foreground">Invitert</span>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => inviteUser(p.id)} disabled={inviting}>
                        <UserPlus className="w-3.5 h-3.5 mr-1" />
                        Inviter
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Current shared users */}
          {sharedUsers.length > 0 && (
            <div className="space-y-1 pt-2 border-t border-border/30">
              <Label className="text-xs text-muted-foreground">Delt med</Label>
              {sharedUsers.map(s => (
                <div key={s.shared_with_user_id} className="flex items-center gap-2 p-2 rounded-lg">
                  <Avatar className="w-8 h-8">
                    {s.avatar_url && <AvatarImage src={s.avatar_url} />}
                    <AvatarFallback className="text-xs">{s.username?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-sm">{s.username || 'Ukjent'}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    s.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
                  }`}>
                    {s.status === 'accepted' ? 'Godkjent' : 'Venter'}
                  </span>
                  <button onClick={() => sharingChildId && removeSharedAccess(sharingChildId, s.shared_with_user_id)} className="p-1 rounded hover:bg-destructive/10 text-destructive">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Child profile detail */}
      <ChildProfileDetailDrawer
        child={selectedChildDetail}
        open={!!selectedChildDetail}
        onClose={() => setSelectedChildDetail(null)}
      />
    </>
  );
};

export default ChildProfilesSection;
