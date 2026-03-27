import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/i18n/useTranslation';
import { toast } from 'sonner';

interface CheckinImageUploadProps {
  onImageReady: (file: File | null) => void;
}

const MAX_FILE_SIZE_MB = 10;
const TARGET_SIZE_KB = 300;
const CROP_W = 320;
const CROP_H = 180; // 16:9

const CheckinImageUpload = ({ onImageReady }: CheckinImageUploadProps) => {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [rawFile, setRawFile] = useState<File | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(t('checkinImage.tooLarge'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError(t('checkinImage.onlyImages'));
      return;
    }
    setRawFile(file);
    setPreview(URL.createObjectURL(file));
    setConfirmed(false);
    setCropOpen(true);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleCropConfirm = async (croppedFile: File) => {
    setCropOpen(false);
    setConfirmed(true);
    onImageReady(croppedFile);
  };

  const handleRemove = () => {
    setPreview(null);
    setRawFile(null);
    setConfirmed(false);
    onImageReady(null);
  };

  if (confirmed && preview) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">✓ {t('checkinImage.imageSelected')}</p>
          <button onClick={handleRemove} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{t('checkinImage.addPhoto')}</p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1 gap-2" onClick={() => cameraRef.current?.click()}>
          <Camera className="w-4 h-4" />{t('checkinImage.takePhoto')}
        </Button>
        <Button type="button" variant="outline" size="sm" className="flex-1 gap-2" onClick={() => galleryRef.current?.click()}>
          <ImageIcon className="w-4 h-4" />{t('checkinImage.chooseFromGallery')}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />

      {rawFile && preview && (
        <CheckinCropDialog
          open={cropOpen}
          imageUrl={preview}
          rawFile={rawFile}
          onConfirm={handleCropConfirm}
          onCancel={() => { setCropOpen(false); setPreview(null); setRawFile(null); }}
        />
      )}
    </div>
  );
};

// ===== Separate crop dialog component =====

interface CheckinCropDialogProps {
  open: boolean;
  imageUrl: string;
  rawFile: File;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

const CheckinCropDialog = ({ open, imageUrl, rawFile, onConfirm, onCancel }: CheckinCropDialogProps) => {
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [compressing, setCompressing] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef(0);

  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { offsetRef.current = offset; }, [offset]);
  useEffect(() => { rotationRef.current = rotation; }, [rotation]);

  // Load natural dimensions
  useEffect(() => {
    if (!open) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgNatural({ w: img.width, h: img.height });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      setRotation(0);
    };
    img.src = imageUrl;
  }, [open, imageUrl]);

  // Base scale: fit entire image inside crop area
  const baseScale = imgNatural.w > 0
    ? Math.min(CROP_W / imgNatural.w, CROP_H / imgNatural.h)
    : 1;
  const baseW = imgNatural.w * baseScale;
  const baseH = imgNatural.h * baseScale;

  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;

  const clampOffset = useCallback((ox: number, oy: number, z: number) => {
    const scaledW = baseW * z;
    const scaledH = baseH * z;
    const maxX = Math.max(0, (scaledW - CROP_W) / 2);
    const maxY = Math.max(0, (scaledH - CROP_H) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    };
  }, [baseW, baseH]);

  // Touch gestures (pan, pinch-zoom, rotation)
  const gestureRef = useRef<{ dist: number; zoom0: number; ox0: number; oy0: number; cx0: number; cy0: number; angle0: number; rot0: number } | null>(null);
  const dragRef = useRef<{ x0: number; y0: number; ox0: number; oy0: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;

      const pinchDist = (t1: Touch, t2: Touch) => Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const pinchAngle = (t1: Touch, t2: Touch) => Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);

      const onTouchStart = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length === 2) {
          gestureRef.current = {
            dist: pinchDist(e.touches[0], e.touches[1]),
            zoom0: zoomRef.current,
            ox0: offsetRef.current.x, oy0: offsetRef.current.y,
            cx0: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            cy0: (e.touches[0].clientY + e.touches[1].clientY) / 2,
            angle0: pinchAngle(e.touches[0], e.touches[1]),
            rot0: rotationRef.current,
          };
          dragRef.current = null;
        } else if (e.touches.length === 1) {
          dragRef.current = { x0: e.touches[0].clientX, y0: e.touches[0].clientY, ox0: offsetRef.current.x, oy0: offsetRef.current.y };
          gestureRef.current = null;
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.touches.length === 2 && gestureRef.current) {
          const g = gestureRef.current;
          const d = pinchDist(e.touches[0], e.touches[1]);
          const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, g.zoom0 * (d / g.dist)));
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const rawX = g.ox0 + (cx - g.cx0);
          const rawY = g.oy0 + (cy - g.cy0);
          // Rotation with low sensitivity (0.4x)
          const currentAngle = pinchAngle(e.touches[0], e.touches[1]);
          const angleDelta = currentAngle - g.angle0;
          const newRotation = g.rot0 + angleDelta * 0.4;
          setZoom(newZoom);
          setOffset(clampOffset(rawX, rawY, newZoom));
          setRotation(newRotation);
        } else if (e.touches.length === 1 && dragRef.current) {
          const dr = dragRef.current;
          const rawX = dr.ox0 + (e.touches[0].clientX - dr.x0);
          const rawY = dr.oy0 + (e.touches[0].clientY - dr.y0);
          setOffset(clampOffset(rawX, rawY, zoomRef.current));
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

      return () => {
        el.removeEventListener('touchstart', onTouchStart);
        el.removeEventListener('touchmove', onTouchMove);
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchcancel', onTouchEnd);
      };
    }, 50);
    return () => clearTimeout(timer);
  }, [open, clampOffset]);

  // Mouse drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const startOx = offsetRef.current.x, startOy = offsetRef.current.y;
    const onMouseMove = (me: MouseEvent) => {
      setOffset(clampOffset(startOx + (me.clientX - startX), startOy + (me.clientY - startY), zoomRef.current));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [clampOffset]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomRef.current - e.deltaY * 0.003));
    setZoom(newZoom);
    setOffset(prev => clampOffset(prev.x, prev.y, newZoom));
  }, [clampOffset]);

  const handleConfirm = async () => {
    if (!imgRef.current) return;
    setCompressing(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1920;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d')!;

      const z = zoomRef.current;
      const rot = rotationRef.current;
      const off = clampOffset(offsetRef.current.x, offsetRef.current.y, z);
      const effectiveLeft = (CROP_W - baseW * z) / 2 + off.x;
      const effectiveTop = (CROP_H - baseH * z) / 2 + off.y;
      const effectiveW = baseW * z;
      const effectiveH = baseH * z;

      const scaleX = 1920 / CROP_W;
      const scaleY = 1080 / CROP_H;

      // Apply rotation around center of the drawn image
      const imgCenterX = (effectiveLeft + effectiveW / 2) * scaleX;
      const imgCenterY = (effectiveTop + effectiveH / 2) * scaleY;
      ctx.save();
      ctx.translate(imgCenterX, imgCenterY);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.translate(-imgCenterX, -imgCenterY);
      ctx.drawImage(
        imgRef.current,
        0, 0, imgRef.current.naturalWidth, imgRef.current.naturalHeight,
        effectiveLeft * scaleX, effectiveTop * scaleY, effectiveW * scaleX, effectiveH * scaleY
      );
      ctx.restore();

      const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.85));
      if (blob) {
        const { default: imageCompression } = await import('browser-image-compression');
        const file = new File([blob], 'checkin.jpg', { type: 'image/jpeg' });
        const compressed = await imageCompression(file, {
          maxSizeMB: TARGET_SIZE_KB / 1024,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: 'image/jpeg',
        });
        onConfirm(compressed as File);
      }
    } catch {
      const { default: imageCompression } = await import('browser-image-compression');
      const compressed = await imageCompression(rawFile, {
        maxSizeMB: TARGET_SIZE_KB / 1024,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
      });
      onConfirm(compressed as File);
    }
    setCompressing(false);
  };

  const imgLeft = (CROP_W - baseW) / 2;
  const imgTop = (CROP_H - baseH) / 2;
  const clamped = clampOffset(offset.x, offset.y, zoom);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-[min(calc(100vw-2rem),22rem)] p-4">
        <DialogHeader>
          <DialogTitle className="text-base">{t('checkinImage.adjustImage')}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground text-center mb-1">{t('checkinImage.dragZoomRotate')}</p>
        <div className="flex justify-center">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-xl border-2 border-primary cursor-grab active:cursor-grabbing bg-muted"
            style={{ width: CROP_W, height: CROP_H, touchAction: 'none' }}
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
          >
            {imgNatural.w > 0 && (
              <img
                src={imageUrl}
                alt=""
                draggable={false}
                className="pointer-events-none select-none absolute"
                style={{
                  width: baseW,
                  height: baseH,
                  left: imgLeft,
                  top: imgTop,
                  transformOrigin: 'center center',
                  transform: `translate(${clamped.x}px, ${clamped.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                }}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 px-2">
          <span className="text-xs text-muted-foreground">−</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.02}
            value={zoom}
            onChange={e => {
              const z = parseFloat(e.target.value);
              setZoom(z);
              setOffset(prev => clampOffset(prev.x, prev.y, z));
            }}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground">+</span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>{t('common.cancel')}</Button>
          <Button className="flex-1" onClick={handleConfirm} disabled={compressing}>
            {compressing ? t('checkinImage.compressing') : t('checkinImage.confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckinImageUpload;
