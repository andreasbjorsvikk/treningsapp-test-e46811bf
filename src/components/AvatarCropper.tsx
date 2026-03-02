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

const AvatarCropper = ({ open, imageFile, onConfirm, onCancel }: AvatarCropperProps) => {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!imageFile) return;
    const img = new Image();
    const url = URL.createObjectURL(imageFile);
    img.onload = () => {
      imgRef.current = img;
      const minDim = Math.min(img.width, img.height);
      const s = CIRCLE_SIZE / minDim;
      setScale(s);
      setImgSize({ w: img.width, h: img.height });
      setOffset({
        x: (CIRCLE_SIZE - img.width * s) / 2,
        y: (CIRCLE_SIZE - img.height * s) / 2,
      });
      setImgLoaded(true);
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragStart.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setScale(s => {
      const newS = Math.max(0.1, Math.min(5, s * delta));
      // Adjust offset to zoom toward center
      const cx = CIRCLE_SIZE / 2;
      const cy = CIRCLE_SIZE / 2;
      setOffset(o => ({
        x: cx - (cx - o.x) * (newS / s),
        y: cy - (cy - o.y) * (newS / s),
      }));
      return newS;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!imgRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Draw circular clip
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.clip();

    // Scale factor from display to output
    const outputScale = 256 / CIRCLE_SIZE;
    ctx.drawImage(
      imgRef.current,
      offset.x * outputScale,
      offset.y * outputScale,
      imgSize.w * scale * outputScale,
      imgSize.h * scale * outputScale,
    );

    canvas.toBlob(blob => {
      if (blob) onConfirm(blob);
    }, 'image/png');
  }, [offset, scale, imgSize, onConfirm]);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-[min(calc(100vw-2rem),20rem)] p-4">
        <DialogHeader>
          <DialogTitle>{t('settings.positionImage') || 'Plasser bildet'}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground text-center mb-2">
          {t('settings.dragToPosition') || 'Dra for å plassere bildet i sirkelen'}
        </p>
        <div className="flex justify-center">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-full border-2 border-primary cursor-grab active:cursor-grabbing"
            style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
          >
            {imgLoaded && imgRef.current && (
              <img
                src={imgRef.current.src}
                alt=""
                draggable={false}
                className="pointer-events-none select-none"
                style={{
                  position: 'absolute',
                  left: offset.x,
                  top: offset.y,
                  width: imgSize.w * scale,
                  height: imgSize.h * scale,
                }}
              />
            )}
          </div>
        </div>
        {/* Zoom slider */}
        <div className="flex items-center gap-2 px-4">
          <span className="text-xs text-muted-foreground">−</span>
          <input
            type="range"
            min={0.1}
            max={3}
            step={0.01}
            value={scale}
            onChange={e => {
              const newS = parseFloat(e.target.value);
              const cx = CIRCLE_SIZE / 2;
              const cy = CIRCLE_SIZE / 2;
              setOffset(o => ({
                x: cx - (cx - o.x) * (newS / scale),
                y: cy - (cy - o.y) * (newS / scale),
              }));
              setScale(newS);
            }}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground">+</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button className="flex-1" onClick={handleConfirm}>
            {t('workout.confirm') || 'Bekreft'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AvatarCropper;
