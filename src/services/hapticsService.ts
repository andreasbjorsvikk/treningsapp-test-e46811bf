/**
 * Haptics service — provides tactile feedback on native platforms.
 * Web fallback: no-op.
 *
 * Usage patterns:
 *   impact('light')  — tab switch, toggle
 *   impact('medium') — save, confirm
 *   notification('success') — milestone, goal complete
 *   notification('error') — validation error
 *
 * TODO: Replace with @capacitor/haptics when building native
 */
import { isNativePlatform } from '@/utils/capacitor';

export type ImpactStyle = 'light' | 'medium' | 'heavy';
export type NotificationType = 'success' | 'warning' | 'error';

export const hapticsService = {
  /** Trigger an impact haptic. */
  async impact(style: ImpactStyle = 'medium'): Promise<void> {
    if (!isNativePlatform()) return;
    // TODO: Capacitor implementation
    // const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    // await Haptics.impact({ style: ImpactStyle[style] });
    console.debug('[haptics] impact:', style);
  },

  /** Trigger a notification haptic. */
  async notification(type: NotificationType = 'success'): Promise<void> {
    if (!isNativePlatform()) return;
    // TODO: Capacitor implementation
    // const { Haptics, NotificationType } = await import('@capacitor/haptics');
    // await Haptics.notification({ type: NotificationType[type] });
    console.debug('[haptics] notification:', type);
  },

  /** Selection changed haptic (very light). */
  async selectionChanged(): Promise<void> {
    if (!isNativePlatform()) return;
    // TODO: Capacitor implementation
    // const { Haptics } = await import('@capacitor/haptics');
    // await Haptics.selectionChanged();
    console.debug('[haptics] selectionChanged');
  },
};
