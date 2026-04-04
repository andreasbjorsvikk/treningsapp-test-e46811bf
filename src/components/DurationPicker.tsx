import { useState, useRef, useEffect, useCallback } from 'react';
import { hapticsService } from '@/services/hapticsService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

interface DurationPickerProps {
  open: boolean;
  onClose: () => void;
  hours: number;
  minutes: number;
  seconds?: number;
  showSeconds?: boolean;
  onConfirm: (hours: number, minutes: number, seconds?: number) => void;
}

const ITEM_HEIGHT = 48;
const VISIBLE_ITEMS = 5;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

const ScrollColumn = ({
  values,
  selected,
  onChange,
  label,
}: {
  values: number[];
  selected: number;
  onChange: (val: number) => void;
  label: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const rafRef = useRef<number>();
  const snapTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isUserScrolling.current) return;
    const idx = values.indexOf(selected);
    if (idx >= 0) {
      requestAnimationFrame(() => {
        el.scrollTop = idx * ITEM_HEIGHT;
      });
    }
  }, [selected, values]);

  const snapToNearest = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clampedIdx = Math.max(0, Math.min(values.length - 1, idx));
    el.scrollTo({ top: clampedIdx * ITEM_HEIGHT, behavior: 'smooth' });
    const newVal = values[clampedIdx];
    onChange(newVal);
    console.warn('[DEBUG-HAPTIC] DurationPicker snapToNearest fired', newVal);
    hapticsService.impact('heavy');
    setTimeout(() => { isUserScrolling.current = false; }, 150);
  }, [values, onChange]);

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
    snapTimeoutRef.current = setTimeout(snapToNearest, 200);
  }, [snapToNearest]);

  const handleItemClick = (val: number) => {
    const idx = values.indexOf(val);
    const el = containerRef.current;
    if (el && idx >= 0) {
      isUserScrolling.current = true;
      el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
      onChange(val);
      console.warn('[DEBUG-HAPTIC] DurationPicker itemClick fired', val);
      hapticsService.impact('heavy');
      setTimeout(() => { isUserScrolling.current = false; }, 200);
    }
  };

  return (
    <div className="flex flex-col items-center flex-1 min-w-0">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</span>
      <div className="relative w-full" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
        <div
          className="absolute left-1 right-1 rounded-xl bg-primary/10 border border-primary/20 pointer-events-none z-10"
          style={{ top: CENTER_INDEX * ITEM_HEIGHT, height: ITEM_HEIGHT }}
        />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto scrollbar-hide touch-pan-y"
          style={{
            WebkitOverflowScrolling: 'touch',
            paddingTop: CENTER_INDEX * ITEM_HEIGHT,
            paddingBottom: CENTER_INDEX * ITEM_HEIGHT,
            overscrollBehavior: 'contain',
            willChange: 'scroll-position',
          }}
        >
          {values.map((val) => {
            const isSelected = val === selected;
            return (
              <div
                key={val}
                onClick={() => handleItemClick(val)}
                className={`
                  flex items-center justify-center cursor-pointer select-none transition-colors duration-100
                  ${isSelected ? 'text-foreground font-bold text-3xl' : 'text-muted-foreground/50 text-xl'}
                `}
                style={{ height: ITEM_HEIGHT }}
              >
                {String(val).padStart(2, '0')}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const DurationPicker = ({ open, onClose, hours, minutes, seconds = 0, showSeconds = false, onConfirm }: DurationPickerProps) => {
  const { t } = useTranslation();
  const [h, setH] = useState(hours);
  const [m, setM] = useState(minutes);
  const [s, setS] = useState(seconds);

  const hourValues = Array.from({ length: 25 }, (_, i) => i);
  const minuteValues = Array.from({ length: 60 }, (_, i) => i);
  const secondValues = Array.from({ length: 60 }, (_, i) => i);

  useEffect(() => {
    if (open) {
      setH(hours);
      setM(minutes);
      setS(seconds);
    }
  }, [open, hours, minutes, seconds]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[320px] sm:max-w-[360px]">
        <DialogHeader className="items-center">
          <DialogTitle className="text-center">{t('workout.duration')}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-3 py-2 px-2">
          <ScrollColumn values={hourValues} selected={h} onChange={setH} label={t('workout.h')} />
          <span className="text-3xl font-bold text-muted-foreground mt-6">:</span>
          <ScrollColumn values={minuteValues} selected={m} onChange={setM} label={t('workout.min')} />
          {showSeconds && (
            <>
              <span className="text-3xl font-bold text-muted-foreground mt-6">:</span>
              <ScrollColumn values={secondValues} selected={s} onChange={setS} label={t('workout.sec')} />
            </>
          )}
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => { onConfirm(h, m, showSeconds ? s : undefined); onClose(); }}>
            {t('workout.confirm') || 'Bekreft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DurationPicker;
