import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChildProfile } from '@/services/childProfileService';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Mountain, Loader2 } from 'lucide-react';
import { getPeakIcon } from '@/utils/peakIcons';

interface PeakVisit {
  peak_id: string;
  peak_name: string;
  peak_elevation: number;
  peak_area: string;
  count: number;
  last_visit: string;
}

interface ChildProfileDetailDrawerProps {
  child: ChildProfile | null;
  open: boolean;
  onClose: () => void;
}

const ChildProfileDetailDrawer = ({ child, open, onClose }: ChildProfileDetailDrawerProps) => {
  const [peaks, setPeaks] = useState<PeakVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !child) return;
    setLoading(true);
    loadPeaks();
  }, [open, child?.id]);

  const loadPeaks = async () => {
    if (!child) return;
    try {
      const { data: checkins } = await supabase
        .from('peak_checkins')
        .select('peak_id, checked_in_at')
        .eq('user_id', child.id)
        .order('checked_in_at', { ascending: false });

      if (!checkins || checkins.length === 0) { setPeaks([]); setLoading(false); return; }

      const peakCounts = new Map<string, { count: number; last_visit: string }>();
      for (const c of checkins) {
        const existing = peakCounts.get(c.peak_id);
        if (existing) {
          existing.count++;
        } else {
          peakCounts.set(c.peak_id, { count: 1, last_visit: c.checked_in_at });
        }
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const peakIds = [...peakCounts.keys()].filter(id => uuidRegex.test(id));
      
      let peakData: any[] = [];
      if (peakIds.length > 0) {
        const { data } = await supabase
          .from('peaks_db')
          .select('id, name_no, elevation_moh, area')
          .in('id', peakIds);
        peakData = data || [];
      }

      const peakMap = new Map(peakData.map(p => [p.id, p]));
      const result: PeakVisit[] = [];
      for (const [peakId, info] of peakCounts) {
        const peak = peakMap.get(peakId);
        if (!peak) continue;
        result.push({
          peak_id: peakId,
          peak_name: peak.name_no,
          peak_elevation: peak.elevation_moh,
          peak_area: peak.area,
          count: info.count,
          last_visit: info.last_visit,
        });
      }
      result.sort((a, b) => b.count - a.count);
      setPeaks(result);
    } catch (e) {
      console.error('Error loading child peaks:', e);
    }
    setLoading(false);
  };

  if (!child) return null;

  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="w-20 h-20 ring-4 ring-emerald-500/20">
              {child.avatar_url ? <AvatarImage src={child.avatar_url} /> : null}
              <AvatarFallback className="text-3xl font-bold bg-emerald-500/10 text-emerald-600">
                {child.emoji || '👶'}
              </AvatarFallback>
            </Avatar>
            <DrawerTitle className="text-xl">
              {child.name} {child.emoji}
            </DrawerTitle>
          </div>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : peaks.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Mountain className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Ingen fjelltopper besøkt ennå</p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground mb-3 text-center">
                {peaks.length} {peaks.length === 1 ? 'topp' : 'topper'} besøkt
              </p>
              {peaks.map(p => {
                const iconSrc = getPeakIcon(p.peak_elevation, p.peak_id);
                return (
                  <div key={p.peak_id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                    <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                      <img
                        src={iconSrc}
                        alt=""
                        className="w-6 h-6"
                        style={{
                          filter: 'brightness(0) saturate(100%) invert(58%) sepia(52%) saturate(501%) hue-rotate(93deg) brightness(95%) contrast(92%)',
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.peak_name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.peak_elevation} moh · {p.peak_area}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-success">{p.count}×</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ChildProfileDetailDrawer;
