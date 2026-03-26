/**
 * Utility to detect if the app is running inside a Capacitor native shell.
 * When running in a browser (web), this returns false.
 * When running inside the iOS/Android native wrapper, Capacitor injects
 * a global object that we can check.
 */
export function isNativePlatform(): boolean {
  try {
    // Capacitor injects window.Capacitor when running inside a native shell
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export function isIOS(): boolean {
  try {
    const cap = (window as any).Capacitor;
    return cap?.getPlatform?.() === 'ios';
  } catch {
    return false;
  }
}
