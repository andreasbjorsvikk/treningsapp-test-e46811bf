/**
 * Camera service — take photos or pick from gallery.
 * Uses @capacitor/camera on native, file input on web.
 */
import { isNativePlatform } from '@/utils/capacitor';

export interface PhotoResult {
  /** Base64 data URI or blob URL */
  dataUrl: string;
  /** MIME type */
  mimeType: string;
}

export const cameraService = {
  /** Take a photo using native camera or web file picker. */
  async takePhoto(): Promise<PhotoResult | null> {
    if (isNativePlatform()) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          quality: 80,
        });
        if (photo.dataUrl) {
          return { dataUrl: photo.dataUrl, mimeType: `image/${photo.format}` };
        }
        return null;
      } catch (e) {
        console.warn('[camera] takePhoto error:', e);
        return null;
      }
    }

    return pickFromFileInput('environment');
  },

  /** Pick photo from gallery. */
  async pickFromGallery(): Promise<PhotoResult | null> {
    if (isNativePlatform()) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
          quality: 80,
        });
        if (photo.dataUrl) {
          return { dataUrl: photo.dataUrl, mimeType: `image/${photo.format}` };
        }
        return null;
      } catch (e) {
        console.warn('[camera] pickFromGallery error:', e);
        return null;
      }
    }
    return pickFromFileInput();
  },

  /** Check/request camera permission. */
  async requestPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!isNativePlatform()) return 'granted';

    try {
      const { Camera } = await import('@capacitor/camera');
      const status = await Camera.requestPermissions({ permissions: ['camera'] });
      return status.camera === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  },

  /** Check camera permission without prompting. */
  async checkPermission(): Promise<boolean> {
    if (!isNativePlatform()) return true;

    try {
      const { Camera } = await import('@capacitor/camera');
      const status = await Camera.checkPermissions();
      return status.camera === 'granted';
    } catch {
      return false;
    }
  },
};

// ---------------------------------------------------------------------------
// Web fallback helper
// ---------------------------------------------------------------------------

function pickFromFileInput(capture?: string): Promise<PhotoResult | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) input.setAttribute('capture', capture);

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);

      const reader = new FileReader();
      reader.onload = () =>
        resolve({ dataUrl: reader.result as string, mimeType: file.type });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}
