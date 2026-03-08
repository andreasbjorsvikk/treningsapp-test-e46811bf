import { Peak } from '@/data/peaks';
import { PeakCheckin } from '@/services/peakCheckinService';
import { useTranslation } from '@/i18n/useTranslation';
import { Mountain, Check, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

type Filter = 'all' | 'not_taken' | 'taken';

interface PeaksListProps {
  peaks: Peak[];
  checkins: PeakCheckin[];
  onSelectPeak: (peak: Peak) => void;
  adminMode?: boolean;
  onEditPeak?: (peak: Peak) => void;
  onDeletePeak?: (peakId: string) => void;
}

const PeaksList = ({ peaks, checkins, onSelectPeak, adminMode, onEditPeak, onDeletePeak }: PeaksListProps) => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<Filter>('all');

  const checkedPeakIds = new Set(checkins.map(c => c.peak_id));

  const filtered = peaks.filter(p => {
    if (filter === 'taken') return checkedPeakIds.has(p.id);
    if (filter === 'not_taken') return !checkedPeakIds.has(p.id);
    return true;
  });

  const filters: { id: Filter; labelKey: string }[] = [
    { id: 'all', labelKey: 'map.filter.all' },
    { id: 'not_taken', labelKey: 'map.filter.notTaken' },
    { id: 'taken', labelKey: 'map.filter.taken' },
  ];

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex gap-2">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">{t('map.noPeaks')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(peak => {
            const isTaken = checkedPeakIds.has(peak.id);
            const isUnpublished = peak.isPublished === false;
            return (
              <div
                key={peak.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 transition-colors"
              >
                <button
                  onClick={() => onSelectPeak(peak)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isTaken ? 'bg-success/15 text-success' : isUnpublished ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Mountain className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-semibold text-sm">{peak.name}</span>
                      {isTaken && (
                        <Badge variant="secondary" className="text-[10px] bg-success/15 text-success border-0 gap-0.5">
                          <Check className="w-3 h-3" />
                          {t('map.taken')}
                        </Badge>
                      )}
                      {isUnpublished && (
                        <Badge variant="secondary" className="text-[10px] bg-warning/15 text-[hsl(var(--warning))] border-0">
                          Upublisert
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{peak.heightMoh} moh · {peak.area}</span>
                  </div>
                </button>
                {adminMode && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => onEditPeak?.(peak)}
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeletePeak?.(peak.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PeaksList;
