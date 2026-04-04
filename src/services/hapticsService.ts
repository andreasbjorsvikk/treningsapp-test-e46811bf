/**
 * Haptics service — provides tactile feedback on native platforms.
 * Web fallback: no-op (isNativePlatform() returns false).
 */
import { Capacitor } from '@capacitor/core';

export type ImpactStyle = 'light' | 'medium' | 'heavy';
export type NotificationType = 'success' | 'warning' | 'error';

function getCapacitorDebugInfo() {
  try {
    return {
      platform: Capacitor.getPlatform(),
      isNativePlatform: Capacitor.isNativePlatform(),
    };
  } catch {
    return {
      platform: 'unknown',
      isNativePlatform: false,
    };
  }
}

// Init log
try {
  console.log('HAPTICS service loaded', getCapacitorDebugInfo());
} catch (e) {
  console.log('HAPTICS service loaded', { platform: 'unknown', isNativePlatform: false });
}

function logCall(method: string) {
  try {
    console.log('HAPTICS called', {
      method,
      ...getCapacitorDebugInfo(),
    });
  } catch {
    console.log('HAPTICS called', { method, platform: 'unknown', isNativePlatform: false });
  }
}

function isNativeCapacitorRuntime(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export const hapticsService = {
  async impact(style: ImpactStyle = 'medium'): Promise<void> {
    const method = `impact(${style})`;
    logCall(method);
    if (!isNativeCapacitorRuntime()) return;

    try {
      const plugin = await import('@capacitor/haptics');
      const nativeStyle = {
        light: plugin.ImpactStyle.Light,
        medium: plugin.ImpactStyle.Medium,
        heavy: plugin.ImpactStyle.Heavy,
      }[style];

      console.log('HAPTICS before native call', {
        method,
        nativeCall: 'Haptics.impact',
        nativeStyle,
        ...getCapacitorDebugInfo(),
      });

      await plugin.Haptics.impact({ style: nativeStyle });

      console.log('HAPTICS success', {
        method,
        nativeCall: 'Haptics.impact',
        nativeStyle,
        ...getCapacitorDebugInfo(),
      });
    } catch (e) {
      console.error('HAPTICS error', {
        method,
        nativeCall: 'Haptics.impact',
        ...getCapacitorDebugInfo(),
      }, e);
    }
  },

  async notification(type: NotificationType = 'success'): Promise<void> {
    const method = `notification(${type})`;
    logCall(method);
    if (!isNativeCapacitorRuntime()) return;

    try {
      const plugin = await import('@capacitor/haptics');
      const nativeType = {
        success: plugin.NotificationType.Success,
        warning: plugin.NotificationType.Warning,
        error: plugin.NotificationType.Error,
      }[type];

      console.log('HAPTICS before native call', {
        method,
        nativeCall: 'Haptics.notification',
        nativeType,
        ...getCapacitorDebugInfo(),
      });

      await plugin.Haptics.notification({ type: nativeType });

      console.log('HAPTICS success', {
        method,
        nativeCall: 'Haptics.notification',
        nativeType,
        ...getCapacitorDebugInfo(),
      });
    } catch (e) {
      console.error('HAPTICS error', {
        method,
        nativeCall: 'Haptics.notification',
        ...getCapacitorDebugInfo(),
      }, e);
    }
  },

  async selectionChanged(): Promise<void> {
    const method = 'selectionChanged';
    logCall(method);
    if (!isNativeCapacitorRuntime()) return;

    try {
      const plugin = await import('@capacitor/haptics');

      console.log('HAPTICS before native call', {
        method,
        nativeCall: 'Haptics.selectionChanged',
        ...getCapacitorDebugInfo(),
      });

      await plugin.Haptics.selectionChanged();

      console.log('HAPTICS success', {
        method,
        nativeCall: 'Haptics.selectionChanged',
        ...getCapacitorDebugInfo(),
      });
    } catch (e) {
      console.error('HAPTICS error', {
        method,
        nativeCall: 'Haptics.selectionChanged',
        ...getCapacitorDebugInfo(),
      }, e);
    }
  },
};
