/**
 * Haptics service — provides tactile feedback on native platforms.
 * Web fallback: no-op (isNativePlatform() returns false).
 */
import { isNativePlatform } from '@/utils/capacitor';

export type ImpactStyle = 'light' | 'medium' | 'heavy';
export type NotificationType = 'success' | 'warning' | 'error';

const styleMap: Record<ImpactStyle, string> = { light: 'Light', medium: 'Medium', heavy: 'Heavy' };
const notifMap: Record<NotificationType, string> = { success: 'SUCCESS', warning: 'WARNING', error: 'ERROR' };

// Init log
try {
  const cap = (window as any).Capacitor;
  console.log('HAPTICS service loaded', {
    platform: cap?.getPlatform?.() ?? 'unknown',
    isNativePlatform: cap?.isNativePlatform?.() ?? false,
  });
} catch (e) {
  console.log('HAPTICS service loaded', { platform: 'unknown', isNativePlatform: false });
}

function logCall(method: string) {
  try {
    const cap = (window as any).Capacitor;
    console.log('HAPTICS called', {
      method,
      platform: cap?.getPlatform?.() ?? 'unknown',
      isNativePlatform: cap?.isNativePlatform?.() ?? false,
    });
  } catch {
    console.log('HAPTICS called', { method, platform: 'unknown', isNativePlatform: false });
  }
}

export const hapticsService = {
  async impact(style: ImpactStyle = 'medium'): Promise<void> {
    logCall(`impact(${style})`);
    if (!isNativePlatform()) return;
    try {
      const { Haptics, ImpactStyle: IS } = await import('@capacitor/haptics');
      await Haptics.impact({ style: (IS as any)[styleMap[style]] });
      console.log('HAPTICS success', `impact(${style})`);
    } catch (e) {
      console.error('HAPTICS error', `impact(${style})`, e);
    }
  },

  async notification(type: NotificationType = 'success'): Promise<void> {
    logCall(`notification(${type})`);
    if (!isNativePlatform()) return;
    try {
      const { Haptics, NotificationType: NT } = await import('@capacitor/haptics');
      await Haptics.notification({ type: (NT as any)[notifMap[type]] });
      console.log('HAPTICS success', `notification(${type})`);
    } catch (e) {
      console.error('HAPTICS error', `notification(${type})`, e);
    }
  },

  async selectionChanged(): Promise<void> {
    logCall('selectionChanged');
    if (!isNativePlatform()) return;
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.selectionChanged();
      console.log('HAPTICS success', 'selectionChanged');
    } catch (e) {
      console.error('HAPTICS error', 'selectionChanged', e);
    }
  },
};
