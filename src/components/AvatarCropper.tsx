import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/i18n/useTranslation';

interface AvatarCropperProps {
  open: boolean;
  imageFile: File | null;
  imageUrl?: string | null;
  onConfirm: (croppedBlob: Blob) => void;
  onCancel: () => void;
}

const CIRCLE_SIZE = 240;
const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

const AvatarCropper = ({ open, imageFile, imageUrl, onConfirm, onCancel }: AvatarCropperProps) => {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  // offset is in "image pixels" relative to center
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // Refs for touch handlers to read fresh values
  const stateRef = useRef({ zoom: 1, offset: { x: 0, y: 0 }, coverW: 0, coverH: 0 });

  // Load image when file or url changes
  useEffect(() => {
    const source = imageFile ? URL.createObjectURL(imageFile) : imageUrl;
    if (!source) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      setImgNatural({ w: img.width, h: img.height });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setImgSrc(source);
    };
    img.src = source;
    return () => { if (imageFile) URL.revokeObjectURL(source); };
  }, [imageFile, imageUrl]);

  // Compute "cover" dimensions: scale image so shortest side = CIRCLE_SIZE
  const coverScale = imgNatural.w > 0 ? CIRCLE_SIZE / Math.min(imgNatural.w, imgNatural.h) : 1;
  const coverW = imgNatural.w * coverScale;
  const coverH = imgNatural.h * coverScale;

  // Clamp offset so image always covers the circle
  const clamp = useCallback((ox: number, oy: number, z: number, cw: number, ch: number) => {
    const maxX = Math.max(0, (cw * z - CIRCLE_SIZE) / 2);
    const maxY = Math.max(0, (ch * z - CIRCLE_SIZE) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  const clamped = clamp(offset.x, offset.y, zoom, coverW, coverH);

  // Keep ref in sync
  useEffect(() => {
    stateRef.current = { zoom, offset, coverW, coverH };
  }, [zoom, offset, coverW, coverH]);

  // ---- Touch & mouse gesture handling ----
  const gestureRef = useRef<{ dist: number; zoom: number; ox: number; oy: number; cx: number; cy: number } | null>(null);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Register native touch events - re-run when `open` changes so we attach after Dialog mounts
  useEffect(() => {
    if (!open) return;
    // Small delay to ensure Dialog content is in the DOM
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;

      const dist = (t1: Touch, t2: Touch) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        const s = stateRef.current;
        if (e.touches.length === 2) {
          gestureRef.current = {
            dist: dist(e.touches[0], e.touches[1]),
            zoom: s.zoom,
            ox: s.offset.x, oy: s.offset.y,
            cx: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            cy: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          };
          dragRef.current = null;
        } else if (e.touches.length === 1) {
          dragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: s.offset.x, oy: s.offset.y };
          gestureRef.current = null;
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        const s = stateRef.current;
        if (e.touches.length === 2 && gestureRef.current) {
          const d = dist(e.touches[0], e.touches[1]);
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, gestureRef.current.zoom * (d / gestureRef.current.dist)));
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const rawX = gestureRef.current.ox + (cx - gestureRef.current.cx);
          const rawY = gestureRef.current.oy + (cy - gestureRef.current.cy);
          const c = clamp(rawX, rawY, newZoom, s.coverW, s.coverH);
          setZoom(newZoom);
          setOffset(c);
        } else if (e.touches.length === 1 && dragRef.current) {
          const rawX = dragRef.current.ox + (e.touches[0].clientX - dragRef.current.x);
          const rawY = dragRef.current.oy + (e.touches[0].clientY - dragRef.current.y);
          setOffset(clamp(rawX, rawY, s.zoom, s.coverW, s.coverH));
        }
      };

      const onTouchEnd = (e: TouchEvent) => {
        const s = stateRef.current;
        if (e.touches.length < 2) gestureRef.current = null;
        if (e.touches.length === 0) dragRef.current = null;
        if (e.touches.length === 1) {
          dragRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, ox: s.offset.x, oy: s.offset.y };
        }
      };

      el.addEventListener('touchstart', onTouchStart, { passive: false });
      el.addEventListener('touchmove', onTouchMove, { passive: false });
      el.addEventListener('touchend', onTouchEnd);
      el.addEventListener('touchcancel', onTouchEnd);

      cleanupRef.current = () => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchEnd);
      };
    }, 50);

    return () => {
      clearTimeout(timer);
      cleanupRef.current?.();
    };
  }, [open, clamp]);

  const cleanupRef = useRef<(() => void) | null>(null);

  // Mouse drag (desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const s = stateRef.current;
    const startX = e.clientX, startY = e.clientY;
    const startOx = s.offset.x, startOy = s.offset.y;

    const onMouseMove = (me: MouseEvent) => {
      const cur = stateRef.current;
      const rawX = startOx + (me.clientX - startX);
      const rawY = startOy + (me.clientY - startY);
      setOffset(clamp(rawX, rawY, cur.zoom, cur.coverW, cur.coverH));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [clamp]);

  // Zoom slider
  const handleZoomChange = useCallback((newZoom: number) => {
    const s = stateRef.current;
    const c = clamp(s.offset.x, s.offset.y, newZoom, s.coverW, s.coverH);
    setZoom(newZoom);
    setOffset(c);
  }, [clamp]);

  // Confirm: render cropped area to canvas
  const handleConfirm = useCallback(() => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.clip();

    // The visible area in circle-space: image is centered with offset and zoom
    const s = stateRef.current;
    const displayW = s.coverW * s.zoom;
    const displayH = s.coverH * s.zoom;
    const imgLeft = (CIRCLE_SIZE - displayW) / 2 + clamped.x;
    const imgTop = (CIRCLE_SIZE - displayH) / 2 + clamped.y;

    const scale = 256 / CIRCLE_SIZE;
    ctx.drawImage(
      imgRef.current,
      0, 0, imgRef.current.naturalWidth, imgRef.current.naturalHeight,
      imgLeft * scale, imgTop * scale, displayW * scale, displayH * scale
    );

    canvas.toBlob(blob => {
      if (blob) onConfirm(blob);
    }, 'image/png');
  }, [clamped, onConfirm]);

  // Computed image style
  const displayW = coverW * zoom;
  const displayH = coverH * zoom;
  const imgLeft = (CIRCLE_SIZE - displayW) / 2 + clamped.x;
  const imgTop = (CIRCLE_SIZE - displayH) / 2 + clamped.y;

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
                  width: displayW,
                  height: displayH,
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
