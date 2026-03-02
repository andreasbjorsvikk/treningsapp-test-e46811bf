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
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  // Keep refs in sync
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  // Load image
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

  // Base size: scale image so shortest side fills CIRCLE_SIZE
  const baseScale = imgNatural.w > 0 ? CIRCLE_SIZE / Math.min(imgNatural.w, imgNatural.h) : 1;
  const baseW = imgNatural.w * baseScale;
  const baseH = imgNatural.h * baseScale;

  // Clamp offset so image always covers circle
  const clampOffset = useCallback((ox: number, oy: number, z: number, bw: number, bh: number) => {
    const scaledW = bw * z;
    const scaledH = bh * z;
    const maxX = Math.max(0, (scaledW - CIRCLE_SIZE) / 2);
    const maxY = Math.max(0, (scaledH - CIRCLE_SIZE) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, []);

  const clamped = clampOffset(offset.x, offset.y, zoom, baseW, baseH);

  // Touch gesture handling
  const gestureRef = useRef<{ dist: number; zoom0: number; ox0: number; oy0: number; cx0: number; cy0: number } | null>(null);
  const dragRef = useRef<{ x0: number; y0: number; ox0: number; oy0: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;

      const pinchDist = (t1: Touch, t2: Touch) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 2) {
          gestureRef.current = {
            dist: pinchDist(e.touches[0], e.touches[1]),
            zoom0: zoomRef.current,
            ox0: offsetRef.current.x, oy0: offsetRef.current.y,
            cx0: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            cy0: (e.touches[0].clientY + e.touches[1].clientY) / 2,
          };
          dragRef.current = null;
        } else if (e.touches.length === 1) {
          dragRef.current = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, ox0: offsetRef.current.x, oy0: offsetRef.current.y };
          gestureRef.current = null;
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length === 2 && gestureRef.current) {
          const g = gestureRef.current;
          const d = pinchDist(e.touches[0], e.touches[1]);
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, g.zoom0 * (d / g.dist)));
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const rawX = g.ox0 + (cx - g.cx0);
          const rawY = g.oy0 + (cy - g.cy0);
          const c = clampOffset(rawX, rawY, newZoom, baseW, baseH);
          setZoom(newZoom);
          setOffset(c);
        } else if (e.touches.length === 1 && dragRef.current) {
          const dr = dragRef.current;
          const rawX = dr.ox0 + (e.touches[0].clientX - dr.x0);
          const rawY = dr.oy0 + (e.touches[0].clientY - dr.y0);
          setOffset(clampOffset(rawX, rawY, zoomRef.current, baseW, baseH));
        }
      };

      const onTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) gestureRef.current = null;
        if (e.touches.length === 0) dragRef.current = null;
        if (e.touches.length === 1) {
          dragRef.current = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, ox0: offsetRef.current.x, oy0: offsetRef.current.y };
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

    return () => { clearTimeout(timer); cleanupRef.current?.(); };
  }, [open, clampOffset, baseW, baseH]);

  // Mouse drag (desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startOx = offsetRef.current.x, startOy = offsetRef.current.y;

    const onMouseMove = (me: MouseEvent) => {
      const rawX = startOx + (me.clientX - startX);
      const rawY = startOy + (me.clientY - startY);
      setOffset(clampOffset(rawX, rawY, zoomRef.current, baseW, baseH));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [clampOffset, baseW, baseH]);

  // Zoom slider
  const handleZoomChange = useCallback((newZoom: number) => {
    const c = clampOffset(offsetRef.current.x, offsetRef.current.y, newZoom, baseW, baseH);
    setZoom(newZoom);
    setOffset(c);
  }, [clampOffset, baseW, baseH]);

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

    // Use CSS transform approach: image is positioned at center, then offset + zoomed
    const z = zoomRef.current;
    const off = clampOffset(offsetRef.current.x, offsetRef.current.y, z, baseW, baseH);
    const displayW = baseW * z;
    const displayH = baseH * z;
    const imgLeft = (CIRCLE_SIZE - displayW) / 2 + off.x;
    const imgTop = (CIRCLE_SIZE - displayH) / 2 + off.y;

    const scale = 256 / CIRCLE_SIZE;
    ctx.drawImage(
      imgRef.current,
      0, 0, imgRef.current.naturalWidth, imgRef.current.naturalHeight,
      imgLeft * scale, imgTop * scale, displayW * scale, displayH * scale
    );

    canvas.toBlob(blob => {
      if (blob) onConfirm(blob);
    }, 'image/png');
  }, [onConfirm, baseW, baseH, clampOffset]);

  // Use CSS transform for zoom to guarantee no aspect ratio distortion
  // Image is rendered at base "cover" size and scaled via transform
  const imgLeft = (CIRCLE_SIZE - baseW) / 2 + clamped.x / zoom;
  const imgTop = (CIRCLE_SIZE - baseH) / 2 + clamped.y / zoom;

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
                  width: baseW,
                  height: baseH,
                  transformOrigin: '0 0',
                  transform: `scale(${zoom})`,
                  left: imgLeft,
                  top: imgTop,
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
