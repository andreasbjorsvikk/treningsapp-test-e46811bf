/**
 * Push notification service — registers device tokens and handles permissions.
 * Web fallback: no-op.
 *
 * TODO: Replace with @capacitor/push-notifications when building native.
 * Device tokens should be stored server-side (future DB migration).
 */
import { isNativePlatform } from '@/utils/capacitor';

export interface PushPermissionResult {
  granted: boolean;
}

export const pushService = {
  /** Request push notification permission. Returns grant status. */
  async requestPermission(): Promise<PushPermissionResult> {
    if (!isNativePlatform()) return { granted: false };
    // TODO: Capacitor implementation
    // const { PushNotifications } = await import('@capacitor/push-notifications');
    // const result = await PushNotifications.requestPermissions();
    // return { granted: result.receive === 'granted' };
    console.debug('[push] requestPermission (scaffold)');
    return { granted: false };
  },

  /** Register for push and get device token. */
  async register(): Promise<string | null> {
    if (!isNativePlatform()) return null;
    // TODO: Capacitor implementation
    // const { PushNotifications } = await import('@capacitor/push-notifications');
    // await PushNotifications.register();
    // return new Promise((resolve) => {
    //   PushNotifications.addListener('registration', (token) => resolve(token.value));
    //   setTimeout(() => resolve(null), 5000);
    // });
    console.debug('[push] register (scaffold)');
    return null;
  },

  /** Check current permission status without prompting. */
  async checkPermission(): Promise<boolean> {
    if (!isNativePlatform()) return false;
    // TODO: Capacitor implementation
    console.debug('[push] checkPermission (scaffold)');
    return false;
  },
};
