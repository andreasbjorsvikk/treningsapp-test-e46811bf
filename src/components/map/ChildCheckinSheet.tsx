import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ChildProfile, getChildProfiles, getSharedChildProfiles } from '@/services/childProfileService';
import { checkinPeak, PeakCheckin, updateCheckinImage } from '@/services/peakCheckinService';
import { supabase } from '@/integrations/supabase/client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Users, Check } from 'lucide-react';
import { toast } from 'sonner';
import CheckinImageUpload from '@/components/map/CheckinImageUpload';

interface ChildCheckinSheetProps {
  open: boolean;
  onClose: () => void;
  peakId: string;
  peakName: string;
  onCheckinSuccess: () => void;
  parentCheckinId?: string | null;
}

const ChildCheckinSheet = ({ open, onClose, peakId, peakName, onCheckinSuccess, parentCheckinId }: ChildCheckinSheetProps) => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Combined image upload state (for the parent's checkin)
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imageSubmitted, setImageSubmitted] = useState(false);

  useEffect(() => {
    if (open && user) {
      setSelectedIds(new Set());
      setDone(false);
      setPendingImage(null);
      setImageSubmitted(false);
      setLoading(true);

      Promise.all([
        getChildProfiles(user.id),
        getSharedChildProfiles(user.id),
      ]).then(async ([owned, shared]) => {
        const allChildren = [...owned, ...shared];
        setChildren(allChildren);

        // Check which children are already checked in today on this peak
        if (allChildren.length > 0) {
          const childIds = allChildren.map(c => c.id);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const { data: existing } = await supabase
            .from('peak_checkins')
            .select('user_id')
            .eq('peak_id', peakId)
            .in('user_id', childIds)
            .gte('checked_in_at', today.toISOString());
          setAlreadyCheckedIn(new Set((existing || []).map((c: any) => c.user_id)));
        }

        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [open, user]);

  const toggleChild = (id: string) => {
    if (alreadyCheckedIn.has(id)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      // Check in selected children
      for (const childId of selectedIds) {
        await checkinPeak(childId, peakId, now, null, user?.id);
      }

      // Upload image to parent's checkin if provided
      if (pendingImage && parentCheckinId && user) {
        await updateCheckinImage(parentCheckinId, user.id, pendingImage);
      }

      setDone(true);
      setImageSubmitted(!!pendingImage);
      onCheckinSuccess();

      const parts: string[] = [];
      if (selectedIds.size > 0) parts.push(`${selectedIds.size} barn sjekket inn`);
      if (pendingImage) parts.push('bilde lagt til');
      toast.success(parts.length > 0 ? parts.join(' og ') + '!' : 'Ferdig!');
      setTimeout(() => onClose(), 1500);
    } catch {
      toast.error('Kunne ikke fullføre. Prøv igjen.');
    }
    setSubmitting(false);
  };

  if (!open) return null;

  const hasChildren = children.length > 0;
  const hasSelections = selectedIds.size > 0 || pendingImage;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Sjekk inn barn
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-4 overflow-y-auto">
          <p className="text-sm text-muted-foreground">
            Velg hvilke barn som også nådde toppen av <span className="font-semibold text-foreground">{peakName}</span>
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : done ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                <Check className="w-8 h-8 text-success" />
              </div>
              <p className="text-sm font-semibold">Innsjekking fullført!</p>
            </div>
          ) : (
            <>
              {/* Children selection */}
              {hasChildren && (
                <div className="space-y-2">
                  {children.map(child => {
                    const isSelected = selectedIds.has(child.id);
                    const isAlready = alreadyCheckedIn.has(child.id);
                    return (
                      <button
                        key={child.id}
                        onClick={() => toggleChild(child.id)}
                        disabled={isAlready}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          isAlready
                            ? 'bg-muted/30 border-border/30 opacity-60 cursor-not-allowed'
                            : isSelected
                              ? 'bg-primary/5 border-primary/30'
                              : 'bg-card border-border/50 hover:border-border'
                        }`}
                      >
                        <Checkbox checked={isSelected || isAlready} disabled={isAlready} className="pointer-events-none" />
                        <Avatar className="w-9 h-9">
                          {child.avatar_url ? <AvatarImage src={child.avatar_url} /> : null}
                          <AvatarFallback className="text-sm font-bold">
                            {child.emoji || '👶'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium flex-1 text-left">
                          {child.name}
                          {isAlready && <span className="text-xs text-muted-foreground ml-2">Allerede sjekket inn</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Image upload - for the parent's checkin */}
              {parentCheckinId && (
                <div>
                  {imageSubmitted ? (
                    <p className="text-xs font-medium text-success text-center">✓ Bilde lagt til</p>
                  ) : (
                    <div className="flex flex-col items-center">
                      <CheckinImageUpload onImageReady={setPendingImage} />
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!hasSelections || submitting}
                className="w-full"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sjekk inn {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ChildCheckinSheet;
