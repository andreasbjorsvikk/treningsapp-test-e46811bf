import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, ImageIcon, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CheckinImageUploadProps {
  onImageReady: (file: File | null) => void;
}

const MAX_FILE_SIZE_MB = 10;
const TARGET_SIZE_KB = 300;

const CheckinImageUpload = ({ onImageReady }: CheckinImageUploadProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pan & zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [confirmed, setConfirmed] = useState(false);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Bildet er for stort (maks ${MAX_FILE_SIZE_MB} MB)`);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Kun bildefiler er støttet');
      return;
    }
    setRawFile(file);
    setPreview(URL.createObjectURL(file));
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setConfirmed(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  const handleConfirm = async () => {
    if (!rawFile || !preview) return;
    setCompressing(true);
    try {
      const { default: imageCompression } = await import('browser-image-compression');
      const compressed = await imageCompression(rawFile, {
        maxSizeMB: TARGET_SIZE_KB / 1024,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/jpeg',
      });
      setConfirmed(true);
      onImageReady(compressed as File);
    } catch {
      setError('Kunne ikke komprimere bildet');
    }
    setCompressing(false);
  };

  const handleRemove = () => {
    setPreview(null);
    setRawFile(null);
    setConfirmed(false);
    setScale(1);
    setOffset({ x: 0, y: 0 });
    onImageReady(null);
  };

  // Touch/mouse pan
  const onPointerDown = (e: React.PointerEvent) => {
    if (confirmed) return;
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || confirmed) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const onPointerUp = () => setDragging(false);

  // Wheel zoom
  const onWheel = (e: React.WheelEvent) => {
    if (confirmed) return;
    e.preventDefault();
    setScale(s => Math.min(3, Math.max(0.5, s - e.deltaY * 0.002)));
  };

  // Touch pinch zoom
  const lastTouchDist = useRef<number | null>(null);
  const onTouchMove = useCallback((e: TouchEvent) => {
    if (confirmed || e.touches.length < 2) { lastTouchDist.current = null; return; }
    e.preventDefault();
    const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    if (lastTouchDist.current !== null) {
      const delta = dist - lastTouchDist.current;
      setScale(s => Math.min(3, Math.max(0.5, s + delta * 0.005)));
    }
    lastTouchDist.current = dist;
  }, [confirmed]);

  const onTouchEnd = useCallback(() => { lastTouchDist.current = null; }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !preview) return;
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => { el.removeEventListener('touchmove', onTouchMove); el.removeEventListener('touchend', onTouchEnd); };
  }, [preview, onTouchMove, onTouchEnd]);

  if (!preview) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Legg til bilde (valgfritt)</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1 gap-2" onClick={() => cameraRef.current?.click()}>
            <Camera className="w-4 h-4" />Ta bilde
          </Button>
          <Button type="button" variant="outline" size="sm" className="flex-1 gap-2" onClick={() => galleryRef.current?.click()}>
            <ImageIcon className="w-4 h-4" />Velg fra galleri
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">
          {confirmed ? '✓ Bilde valgt' : 'Flytt og zoom bildet, trykk bekreft'}
        </p>
        <button onClick={handleRemove} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Crop area */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border bg-muted cursor-move touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={onWheel}
      >
        <img
          src={preview}
          alt="Preview"
          className="absolute w-full h-full object-cover select-none pointer-events-none"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
          draggable={false}
        />
        {!confirmed && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            <button onClick={() => setScale(s => Math.min(3, s + 0.25))} className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 text-foreground">
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 text-foreground">
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {!confirmed && (
        <Button onClick={handleConfirm} disabled={compressing} size="sm" className="w-full">
          {compressing ? 'Komprimerer...' : 'Bekreft bilde'}
        </Button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};

export default CheckinImageUpload;
