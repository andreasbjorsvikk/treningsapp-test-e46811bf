import { supabase } from '@/integrations/supabase/client';

const WEB_CALLBACK_URL = 'https://treningsapp-test.lovable.app/auth/native-callback';
const LOG_PREFIX = '[NativeAuth]';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type BrowserPluginLike = {
  open: (options: { url: string }) => Promise<void>;
  close?: () => Promise<void>;
};

type AppPluginLike = {
  addListener: (
    eventName: 'appUrlOpen',
    listenerFunc: (event: { url: string }) => void | Promise<void>
  ) => Promise<{ remove: () => Promise<void> }> | { remove: () => void };
};

function getCapacitorRuntime() {
  return (window as any).Capacitor;
}

function safeNativePlatformCheck(capacitor = getCapacitorRuntime()): boolean {
  try {
    return !!capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function logRuntimeSnapshot(context: string) {
  const capacitor = getCapacitorRuntime();
  const plugins = capacitor?.Plugins;
  const browser = plugins?.Browser;
  const app = plugins?.App;

  console.log(`${LOG_PREFIX} ${context}`, {
    hasCapacitor: !!capacitor,
    isNativePlatformFn: typeof capacitor?.isNativePlatform,
    isNativePlatform: safeNativePlatformCheck(capacitor),
    hasPlugins: !!plugins,
    pluginKeys: plugins ? Object.keys(plugins) : [],
    hasBrowserPlugin: !!browser,
    browserMethods: browser ? Object.keys(browser) : [],
    hasAppPlugin: !!app,
    appMethods: app ? Object.keys(app) : [],
  });
}

async function waitForCapacitorPlugins(maxWaitMs = 1500, stepMs = 100) {
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const capacitor = getCapacitorRuntime();
    if (capacitor?.Plugins) return capacitor;
    await sleep(stepMs);
  }

  return getCapacitorRuntime();
}

async function resolveBrowserPlugin(): Promise<BrowserPluginLike | null> {
  const capacitor = await waitForCapacitorPlugins();
  const browserFromWindow = capacitor?.Plugins?.Browser as BrowserPluginLike | undefined;

  if (browserFromWindow?.open) {
    console.log(`${LOG_PREFIX} Browser plugin resolved from window.Capacitor.Plugins.Browser`);
    return browserFromWindow;
  }

  try {
    const { Browser } = await import('@capacitor/browser');
    if (Browser?.open) {
      console.log(`${LOG_PREFIX} Browser plugin resolved from @capacitor/browser import`);
      return Browser as BrowserPluginLike;
    }

    console.warn(`${LOG_PREFIX} @capacitor/browser imported, but Browser.open is missing`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to import @capacitor/browser`, error);
  }

  return null;
}

async function resolveAppPlugin(): Promise<AppPluginLike | null> {
  const capacitor = await waitForCapacitorPlugins();
  const appFromWindow = capacitor?.Plugins?.App as AppPluginLike | undefined;

  if (appFromWindow?.addListener) {
    console.log(`${LOG_PREFIX} App plugin resolved from window.Capacitor.Plugins.App`);
    return appFromWindow;
  }

  try {
    const { App } = await import('@capacitor/app');
    if (App?.addListener) {
      console.log(`${LOG_PREFIX} App plugin resolved from @capacitor/app import`);
      return App as AppPluginLike;
    }

    console.warn(`${LOG_PREFIX} @capacitor/app imported, but App.addListener is missing`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to import @capacitor/app`, error);
  }

  return null;
}

export function isNativePlatform(): boolean {
  return safeNativePlatformCheck();
}

/**
 * Signs in with OAuth for native Capacitor apps.
 * Uses dynamic imports/window plugin lookup so web and native both work.
 */
export async function nativeSignInWithOAuth(
  provider: 'google' | 'apple'
): Promise<{ error: string | null }> {
  try {
    logRuntimeSnapshot(`nativeSignInWithOAuth:start:${provider}`);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: WEB_CALLBACK_URL,
      },
    });

    if (error) return { error: error.message };

    const BrowserPlugin = await resolveBrowserPlugin();

    logRuntimeSnapshot(`nativeSignInWithOAuth:before-open:${provider}`);

    if (!BrowserPlugin?.open) {
      return {
        error:
          'Capacitor Browser plugin ikke tilgjengelig. Kjør `npm install`, deretter `npx cap sync`, og test på nytt.',
      };
    }

    if (data?.url) {
      await BrowserPlugin.open({ url: data.url });
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
  if (!isNativePlatform()) return;
  if (deepLinkListenerInitialized) return;

  try {
    logRuntimeSnapshot('setupDeepLinkListener:start');

    const AppPlugin = await resolveAppPlugin();
    const BrowserPlugin = await resolveBrowserPlugin();

    if (!AppPlugin?.addListener) {
      console.warn(`${LOG_PREFIX} App plugin unavailable, deep link listener not registered`);
      return;
    }

    await AppPlugin.addListener('appUrlOpen', async ({ url }: { url: string }) => {
      console.log(`${LOG_PREFIX} Deep link received:`, url);

      if (!url.startsWith('treningsapp://')) return;

      try {
        await BrowserPlugin?.close?.();
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
