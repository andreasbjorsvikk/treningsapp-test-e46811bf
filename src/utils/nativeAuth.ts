import { supabase } from '@/integrations/supabase/client';
import { Capacitor, registerPlugin } from '@capacitor/core';

const WEB_CALLBACK_URL = 'https://treningsapp-test.lovable.app/auth/native-callback';
const LOG_PREFIX = '[NativeAuth]';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type BrowserPluginLike = {
  open: (options: { url: string }) => Promise<void>;
  close: () => Promise<void>;
};

type AppPluginLike = {
  addListener: (
    eventName: 'appUrlOpen',
    listenerFunc: (event: { url: string }) => void | Promise<void>
  ) => Promise<{ remove: () => Promise<void> }> | { remove: () => void };
};

/**
 * IMPORTANT:
 * We intentionally do NOT import '@capacitor/browser' or '@capacitor/app' here.
 * Instead, we register plugin proxies by name via '@capacitor/core'.
 * This avoids brittle runtime lookups (window.Capacitor.Plugins.*) and keeps the web build safe.
 */
const Browser = registerPlugin<BrowserPluginLike>('Browser');
const App = registerPlugin<AppPluginLike>('App');

function getWindowCapacitor(): any {
  return (window as any)?.Capacitor;
}

function safeGetPlatform(): string {
  try {
    // Prefer the imported Capacitor API (stable), but log window.Capacitor separately.
    return Capacitor.getPlatform?.() ?? 'web';
  } catch {
    return 'web';
  }
}

export function isNativePlatform(): boolean {
  try {
    return !!Capacitor.isNativePlatform?.();
  } catch {
    return false;
  }
}

async function waitForNativeRuntime(maxWaitMs = 2500, stepMs = 50) {
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const wCap = getWindowCapacitor();
    const hasGetPlatform = typeof wCap?.getPlatform === 'function';
    const hasIsNativePlatform = typeof wCap?.isNativePlatform === 'function';

    if (wCap && (hasGetPlatform || hasIsNativePlatform)) return;
    await sleep(stepMs);
  }
}

function logRuntimeSnapshot(context: string) {
  const wCap = getWindowCapacitor();
  const wPlugins = wCap?.Plugins;

  const windowPlatform = (() => {
    try {
      return typeof wCap?.getPlatform === 'function' ? wCap.getPlatform() : undefined;
    } catch {
      return undefined;
    }
  })();

  const windowIsNative = (() => {
    try {
      return typeof wCap?.isNativePlatform === 'function' ? wCap.isNativePlatform() : undefined;
    } catch {
      return undefined;
    }
  })();

  const corePlatform = safeGetPlatform();
  const coreIsNative = isNativePlatform();

  const coreHasBrowser = (() => {
    try {
      return Capacitor.isPluginAvailable?.('Browser') ?? false;
    } catch {
      return false;
    }
  })();

  const coreHasApp = (() => {
    try {
      return Capacitor.isPluginAvailable?.('App') ?? false;
    } catch {
      return false;
    }
  })();

  console.log(`${LOG_PREFIX} ${context}`, {
    windowCapacitor: {
      exists: !!wCap,
      keys: wCap ? Object.keys(wCap) : [],
      getPlatformFn: typeof wCap?.getPlatform,
      isNativePlatformFn: typeof wCap?.isNativePlatform,
      platform: windowPlatform,
      isNative: windowIsNative,
      pluginsExists: !!wPlugins,
      pluginKeys: wPlugins ? Object.keys(wPlugins) : [],
      hasBrowserOnPlugins: !!wPlugins?.Browser,
      hasAppOnPlugins: !!wPlugins?.App,
    },
    coreCapacitor: {
      platform: corePlatform,
      isNative: coreIsNative,
      isPluginAvailable: {
        Browser: coreHasBrowser,
        App: coreHasApp,
      },
    },
  });
}

async function ensureNativeIosContext(action: string): Promise<{ error: string | null }> {
  await waitForNativeRuntime();
  logRuntimeSnapshot(`${action}:runtime-ready`);

  const platform = safeGetPlatform();
  if (!isNativePlatform() || platform !== 'ios') {
    return {
      error: 'Not running in native iOS environment',
    };
  }

  return { error: null };
}

function pluginsAvailable(): { browser: boolean; app: boolean } {
  const browser = (() => {
    try {
      return Capacitor.isPluginAvailable?.('Browser') ?? false;
    } catch {
      return false;
    }
  })();

  const app = (() => {
    try {
      return Capacitor.isPluginAvailable?.('App') ?? false;
    } catch {
      return false;
    }
  })();

  return { browser, app };
}

/**
 * Signs in with OAuth for native Capacitor iOS apps.
 */
export async function nativeSignInWithOAuth(
  provider: 'google' | 'apple'
): Promise<{ error: string | null }> {
  try {
    logRuntimeSnapshot(`nativeSignInWithOAuth:start:${provider}`);

    const ctx = await ensureNativeIosContext(`nativeSignInWithOAuth:${provider}`);
    if (ctx.error) return { error: ctx.error };

    const availability = pluginsAvailable();
    if (!availability.browser) {
      console.warn(`${LOG_PREFIX} Browser plugin not available (Capacitor.isPluginAvailable=false)`);
      return {
        error:
          'Capacitor Browser plugin ikke tilgjengelig. Sjekk at @capacitor/browser er installert og at du har kjørt `npx cap sync ios`, og bygg/kjør appen på nytt.',
      };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: WEB_CALLBACK_URL,
      },
    });

    if (error) return { error: error.message };

    logRuntimeSnapshot(`nativeSignInWithOAuth:before-open:${provider}`);

    if (data?.url) {
      await Browser.open({ url: data.url });
      console.log(`${LOG_PREFIX} Browser.open called successfully`);
    }

    return { error: null };
  } catch (e: any) {
    console.error(`${LOG_PREFIX} nativeSignInWithOAuth unexpected error`, e);
    return { error: e?.message || 'Ukjent feil ved innlogging' };
  }
}

let deepLinkListenerInitialized = false;

/**
 * Sets up the deep link listener for OAuth callbacks.
 */
export async function setupDeepLinkListener() {
  if (deepLinkListenerInitialized) return;

  const ctx = await ensureNativeIosContext('setupDeepLinkListener');
  if (ctx.error) return;

  const availability = pluginsAvailable();
  if (!availability.app) {
    console.warn(`${LOG_PREFIX} App plugin not available (Capacitor.isPluginAvailable=false)`);
    return;
  }

  try {
    logRuntimeSnapshot('setupDeepLinkListener:registering');

    await App.addListener('appUrlOpen', async ({ url }: { url: string }) => {
      console.log(`${LOG_PREFIX} Deep link received:`, url);
      if (!url.startsWith('treningsapp://')) return;

      try {
        // Close the in-app browser if possible.
        if (pluginsAvailable().browser) {
          await Browser.close();
        }
      } catch {
        // Browser might already be closed
      }

      const hashIndex = url.indexOf('#');
      if (hashIndex !== -1) {
        const fragment = url.substring(hashIndex + 1);
        const params = new URLSearchParams(fragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) console.error(`${LOG_PREFIX} setSession failed:`, error.message);
          return;
        }
      }

      const queryIndex = url.indexOf('?');
      if (queryIndex !== -1) {
        const params = new URLSearchParams(url.substring(queryIndex));
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) console.error(`${LOG_PREFIX} Code exchange failed:`, error.message);
        }
      }
    });

    deepLinkListenerInitialized = true;
    logRuntimeSnapshot('setupDeepLinkListener:registered');
  } catch (e) {
    console.warn(`${LOG_PREFIX} Could not set up deep link listener:`, e);
  }
}
