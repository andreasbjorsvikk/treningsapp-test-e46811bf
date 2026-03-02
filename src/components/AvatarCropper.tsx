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
  // How far from center the image can move before exposing background
  const maxX = Math.max(0, (scaledW - CIRCLE_SIZE) / 2);
  const maxY = Math.max(0, (scaledH - CIRCLE_SIZE) / 2);
  return {
    x: Math.max(-maxX, Math.min(maxX, ox)),
    y: Math.max(-maxY, Math.min(maxY, oy)),
  };
}

const AvatarCropper = ({ open, imageFile, onConfirm, onCancel }: AvatarCropperProps) => {
  const { t } = useTranslation();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgSrc, setImgSrc] = useState('');
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
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

  // Compute clamped position for display
  const clamped = clampOffset(offset.x, offset.y, zoom, fitW, fitH);
  const scaledW = fitW * zoom;
  const scaledH = fitH * zoom;
  const imgLeft = (CIRCLE_SIZE - scaledW) / 2 + clamped.x;
  const imgTop = (CIRCLE_SIZE - scaledH) / 2 + clamped.y;

  const getTouchDist = (pts: { x: number; y: number }[]) => {
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      gestureStart.current = {
        dist: getTouchDist(pts),
        zoom,
        ox: offset.x,
        oy: offset.y,
        cx: (pts[0].x + pts[1].x) / 2,
        cy: (pts[0].y + pts[1].y) / 2,
      };
      dragStart.current = null;
    } else if (pointers.current.size === 1) {
      dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
      gestureStart.current = null;
    }
  }, [offset, zoom]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && gestureStart.current) {
      const pts = Array.from(pointers.current.values());
      const newDist = getTouchDist(pts);
      const scaleFactor = newDist / gestureStart.current.dist;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, gestureStart.current.zoom * scaleFactor));
      setZoom(newZoom);

      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      const rawX = gestureStart.current.ox + (cx - gestureStart.current.cx);
      const rawY = gestureStart.current.oy + (cy - gestureStart.current.cy);
      setOffset(clampOffset(rawX, rawY, newZoom, fitW, fitH));
    } else if (pointers.current.size === 1 && dragStart.current) {
      const rawX = dragStart.current.ox + (e.clientX - dragStart.current.x);
      const rawY = dragStart.current.oy + (e.clientY - dragStart.current.y);
      setOffset(clampOffset(rawX, rawY, zoom, fitW, fitH));
    }
  }, [zoom, fitW, fitH]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gestureStart.current = null;
    if (pointers.current.size === 0) dragStart.current = null;
    if (pointers.current.size === 1) {
      const remaining = Array.from(pointers.current.values())[0];
      dragStart.current = { x: remaining.x, y: remaining.y, ox: offset.x, oy: offset.y };
    }
  }, [offset]);

  // When zoom changes via slider, also clamp offset
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

    const outScale = 256 / CIRCLE_SIZE;
    ctx.drawImage(
      imgRef.current,
      imgLeft * outScale,
      imgTop * outScale,
      scaledW * outScale,
      scaledH * outScale,
    );

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
            className="relative overflow-hidden rounded-full border-2 border-primary cursor-grab active:cursor-grabbing bg-muted"
            style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE, touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
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
