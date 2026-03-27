/**
 * Camera service — take photos or pick from gallery.
 * Web fallback: uses file input picker.
 *
 * TODO: Replace with @capacitor/camera when building native.
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
      // TODO: Capacitor implementation
      // const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      // const photo = await Camera.getPhoto({
      //   resultType: CameraResultType.DataUrl,
      //   source: CameraSource.Camera,
      //   quality: 80,
      // });
      // return { dataUrl: photo.dataUrl!, mimeType: `image/${photo.format}` };
      console.debug('[camera] takePhoto (scaffold)');
      return null;
    }

    // Web fallback: file input
    return pickFromFileInput('environment');
  },

  /** Pick photo from gallery. */
  async pickFromGallery(): Promise<PhotoResult | null> {
    if (isNativePlatform()) {
      // TODO: Capacitor implementation
      console.debug('[camera] pickFromGallery (scaffold)');
      return null;
    }
    return pickFromFileInput();
  },

  /** Check camera permission without prompting. */
  async checkPermission(): Promise<boolean> {
    if (!isNativePlatform()) return true; // web always "allowed"
    // TODO: Capacitor implementation
    return false;
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

    // User cancelled
    input.oncancel = () => resolve(null);

    input.click();
  });
}
