/**
 * Haptics service — provides tactile feedback on native platforms.
 * Web fallback: no-op (isNativePlatform() returns false).
 *
 * Usage patterns:
 *   impact('light')  — tab switch, toggle
 *   impact('medium') — save, confirm
 *   notification('success') — milestone, goal complete
 *   notification('error') — validation error
 */
import { isNativePlatform } from '@/utils/capacitor';

export type ImpactStyle = 'light' | 'medium' | 'heavy';
export type NotificationType = 'success' | 'warning' | 'error';

const styleMap: Record<ImpactStyle, string> = { light: 'Light', medium: 'Medium', heavy: 'Heavy' };
const notifMap: Record<NotificationType, string> = { success: 'SUCCESS', warning: 'WARNING', error: 'ERROR' };

export const hapticsService = {
  async impact(style: ImpactStyle = 'medium'): Promise<void> {
    if (!isNativePlatform()) return;
    try {
      const { Haptics, ImpactStyle: IS } = await import('@capacitor/haptics');
      await Haptics.impact({ style: (IS as any)[styleMap[style]] });
    } catch (e) {
      console.warn('[haptics] impact error', e);
    }
  },

  async notification(type: NotificationType = 'success'): Promise<void> {
    if (!isNativePlatform()) return;
    try {
      const { Haptics, NotificationType: NT } = await import('@capacitor/haptics');
      await Haptics.notification({ type: (NT as any)[notifMap[type]] });
    } catch (e) {
      console.warn('[haptics] notification error', e);
    }
  },

  async selectionChanged(): Promise<void> {
    if (!isNativePlatform()) return;
    try {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.selectionChanged();
    } catch (e) {
      console.warn('[haptics] selectionChanged error', e);
    }
  },
};
