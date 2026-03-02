import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/i18n/useTranslation';

interface DurationPickerProps {
  open: boolean;
  onClose: () => void;
  hours: number;
  minutes: number;
  onConfirm: (hours: number, minutes: number) => void;
}

const ITEM_HEIGHT = 44;
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
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Scroll to the selected value on mount and when selected changes externally
  useEffect(() => {
    const el = containerRef.current;
    if (!el || isScrollingRef.current) return;
    const idx = values.indexOf(selected);
    if (idx >= 0) {
      el.scrollTop = idx * ITEM_HEIGHT;
    }
  }, [selected, values]);

  const handleScroll = useCallback(() => {
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(values.length - 1, idx));
      // Snap scroll
      el.scrollTo({ top: clampedIdx * ITEM_HEIGHT, behavior: 'smooth' });
      onChange(values[clampedIdx]);
      setTimeout(() => { isScrollingRef.current = false; }, 100);
    }, 80);
  }, [values, onChange]);

  const handleItemClick = (val: number) => {
    const idx = values.indexOf(val);
    const el = containerRef.current;
    if (el && idx >= 0) {
      el.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
      onChange(val);
    }
  };

  return (
    <div className="flex flex-col items-center flex-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{label}</span>
      <div className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
        {/* Selection highlight */}
        <div
          className="absolute left-0 right-0 rounded-lg bg-primary/10 border border-primary/20 pointer-events-none z-10"
          style={{ top: CENTER_INDEX * ITEM_HEIGHT, height: ITEM_HEIGHT }}
        />
        {/* Fade overlays */}
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-background to-transparent pointer-events-none z-20" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none z-20" />
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto scrollbar-hide"
          style={{
            scrollSnapType: 'y mandatory',
            WebkitOverflowScrolling: 'touch',
            paddingTop: CENTER_INDEX * ITEM_HEIGHT,
            paddingBottom: CENTER_INDEX * ITEM_HEIGHT,
          }}
        >
          {values.map((val) => {
            const isSelected = val === selected;
            return (
              <div
                key={val}
                onClick={() => handleItemClick(val)}
                className={`
                  flex items-center justify-center cursor-pointer transition-all duration-150 select-none
                  ${isSelected ? 'text-foreground font-bold text-2xl' : 'text-muted-foreground/60 text-lg'}
                `}
                style={{
                  height: ITEM_HEIGHT,
                  scrollSnapAlign: 'start',
                }}
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

const DurationPicker = ({ open, onClose, hours, minutes, onConfirm }: DurationPickerProps) => {
  const { t } = useTranslation();
  const [h, setH] = useState(hours);
  const [m, setM] = useState(minutes);

  const hourValues = Array.from({ length: 25 }, (_, i) => i);
  const minuteValues = Array.from({ length: 60 }, (_, i) => i);

  useEffect(() => {
    if (open) {
      setH(hours);
      setM(minutes);
    }
  }, [open, hours, minutes]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[280px] sm:max-w-[320px]">
        <DialogHeader className="items-center">
          <DialogTitle className="text-center">{t('workout.duration')}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center gap-2 py-2">
          <ScrollColumn values={hourValues} selected={h} onChange={setH} label={t('workout.h')} />
          <span className="text-2xl font-bold text-muted-foreground mt-6">:</span>
          <ScrollColumn values={minuteValues} selected={m} onChange={setM} label={t('workout.min')} />
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => { onConfirm(h, m); onClose(); }}>
            {t('workout.confirm') || 'Bekreft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DurationPicker;
