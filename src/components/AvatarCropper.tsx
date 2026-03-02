import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/i18n/useTranslation';

interface AvatarCropperProps {
  open: boolean;
  imageFile: File | null;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const CIRCLE_SIZE = 240;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

/** Clamp offset so the scaled image always covers the circle */
function clampOffset(
  ox: number, oy: number, zoom: number,
  fitW: number, fitH: number
): { x: number; y: number } {
  const scaledW = fitW * zoom;
  const scaledH = fitH * zoom;
  const maxX = Math.max(0, (scaledW - CIRCLE_SIZE) / 2);
  const maxY = Math.max(0, (scaledH - CIRCLE_SIZE) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, ox)),
    y: Math.max(-maxY, Math.min(maxY, oy)),
  };
}

function getTouchDist(t1: React.Touch, t2: React.Touch) {
  const dx = t2.clientX - t1.clientX;
  const dy = t2.clientY - t1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

const AvatarCropper = ({ open, imageFile, onConfirm, onCancel }: AvatarCropperProps) => {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Use refs for gesture state so touch handlers always have fresh values
  const zoomRef = useRef(zoom);
  const offsetRef = useRef(offset);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const gestureStart = useRef<{ dist: number; zoom: number; ox: number; oy: number; cx: number; cy: number } | null>(null);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgNatural({ w: img.width, h: img.height });
      setBaseScale(CIRCLE_SIZE / Math.min(img.width, img.height));
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setImgSrc(url);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const fitW = imgNatural.w * baseScale;
  const fitH = imgNatural.h * baseScale;

  const clamped = clampOffset(offset.x, offset.y, zoom, fitW, fitH);
  const scaledW = fitW * zoom;
  const scaledH = fitH * zoom;
  const imgLeft = (CIRCLE_SIZE - scaledW) / 2 + clamped.x;
  const imgTop = (CIRCLE_SIZE - scaledH) / 2 + clamped.y;

  // Use native touch events to handle multi-touch correctly (all touches in one event)
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 2) {
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        gestureStart.current = {
          dist,
          zoom: zoomRef.current,
          ox: offsetRef.current.x,
          oy: offsetRef.current.y,
          cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          cy: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        };
        dragStart.current = null;
      } else if (e.touches.length === 1) {
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          ox: offsetRef.current.x,
          oy: offsetRef.current.y,
        };
        gestureStart.current = null;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      // Need current fitW/fitH — read from DOM closure isn't reliable, compute from refs
      // We'll use a workaround: store fitW/fitH in a ref
      const curFitW = el.dataset.fitw ? parseFloat(el.dataset.fitw) : 0;
      const curFitH = el.dataset.fith ? parseFloat(el.dataset.fith) : 0;

      if (e.touches.length === 2 && gestureStart.current) {
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const scaleFactor = dist / gestureStart.current.dist;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, gestureStart.current.zoom * scaleFactor));

        const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        const rawX = gestureStart.current.ox + (cx - gestureStart.current.cx);
        const rawY = gestureStart.current.oy + (cy - gestureStart.current.cy);
        const newOffset = clampOffset(rawX, rawY, newZoom, curFitW, curFitH);

        setZoom(newZoom);
        setOffset(newOffset);
      } else if (e.touches.length === 1 && dragStart.current) {
        const rawX = dragStart.current.ox + (e.touches[0].clientX - dragStart.current.x);
        const rawY = dragStart.current.oy + (e.touches[0].clientY - dragStart.current.y);
        setOffset(clampOffset(rawX, rawY, zoomRef.current, curFitW, curFitH));
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) gestureStart.current = null;
      if (e.touches.length === 0) dragStart.current = null;
      if (e.touches.length === 1) {
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          ox: offsetRef.current.x,
          oy: offsetRef.current.y,
        };
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    el.addEventListener('touchcancel', onTouchEnd);

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  // Also support mouse drag for desktop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };

    const onMouseMove = (me: MouseEvent) => {
      if (!dragStart.current) return;
      const rawX = dragStart.current.ox + (me.clientX - dragStart.current.x);
      const rawY = dragStart.current.oy + (me.clientY - dragStart.current.y);
      setOffset(clampOffset(rawX, rawY, zoomRef.current, fitW, fitH));
    };
    const onMouseUp = () => {
      dragStart.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [offset, fitW, fitH]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
    setOffset(prev => clampOffset(prev.x, prev.y, newZoom, fitW, fitH));
  }, [fitW, fitH]);

  const handleConfirm = useCallback(() => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.clip();

    // Map from circle-space to canvas-space
    const outScale = 256 / CIRCLE_SIZE;
    const dx = imgLeft * outScale;
    const dy = imgTop * outScale;
    const dw = scaledW * outScale;
    const dh = scaledH * outScale;

    ctx.drawImage(imgRef.current, 0, 0, imgRef.current.naturalWidth, imgRef.current.naturalHeight, dx, dy, dw, dh);

    canvas.toBlob(blob => {
      if (blob) onConfirm(blob);
    }, 'image/png');
  }, [imgLeft, imgTop, scaledW, scaledH, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-[min(calc(100vw-2rem),20rem)] p-4">
        <DialogHeader>
          <DialogTitle>{t('settings.positionImage')}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground text-center mb-2">
          {t('settings.dragToPosition')}
        </p>
        <div className="flex justify-center">
          <div
            ref={containerRef}
            data-fitw={fitW}
            data-fith={fitH}
            className="relative overflow-hidden rounded-full border-2 border-primary cursor-grab active:cursor-grabbing bg-muted"
            style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, touchAction: 'none' }}
            onMouseDown={handleMouseDown}
          >
            {imgSrc && (
              <img
                src={imgSrc}
                alt=""
                draggable={false}
                className="pointer-events-none select-none absolute"
                style={{
                  left: imgLeft,
                  top: imgTop,
                  width: scaledW,
                  height: scaledH,
                }}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-4">
          <span className="text-xs text-muted-foreground">−</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.02}
            value={zoom}
            onChange={e => handleZoomChange(parseFloat(e.target.value))}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground">+</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button className="flex-1" onClick={handleConfirm}>
            {t('workout.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarCropper;
