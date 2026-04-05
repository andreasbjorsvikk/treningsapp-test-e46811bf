/**
 * Location service — wraps @capacitor/geolocation with web fallback.
 */
import { isNativePlatform } from '@/utils/capacitor';

export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const locationService = {
  async requestPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!isNativePlatform()) {
      // Web: use navigator.permissions if available
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state as 'granted' | 'denied' | 'prompt';
      } catch {
        return 'prompt';
      }
    }

    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const status = await Geolocation.requestPermissions();
      if (status.location === 'granted' || status.coarseLocation === 'granted') {
        return 'granted';
      }
      return 'denied';
    } catch (e) {
      console.warn('[location] requestPermission error:', e);
      return 'denied';
    }
  },

  async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!isNativePlatform()) {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state as 'granted' | 'denied' | 'prompt';
      } catch {
        return 'prompt';
      }
    }

    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const status = await Geolocation.checkPermissions();
      if (status.location === 'granted' || status.coarseLocation === 'granted') {
        return 'granted';
      }
      if (status.location === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'denied';
    }
  },

  async getCurrentPosition(): Promise<LocationCoords | null> {
    if (!isNativePlatform()) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 10000 }
        );
      });
    }

    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
      return {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
    } catch {
      return null;
    }
  },
};
