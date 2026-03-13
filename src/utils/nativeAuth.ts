import { supabase } from '@/integrations/supabase/client';

const APP_SCHEME = 'treningsapp';
const WEB_CALLBACK_URL = 'https://treningsapp-test.lovable.app/auth/native-callback';

export function isNativePlatform(): boolean {
  try {
    // Use window.Capacitor which is injected by the native runtime
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

/**
 * Signs in with OAuth for native Capacitor apps.
 */
export async function nativeSignInWithOAuth(
  provider: 'google' | 'apple'
): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: WEB_CALLBACK_URL,
      },
    });

    if (error) return { error: error.message };

    if (data?.url) {
      const cap = (window as any).Capacitor;
      const Browser = cap?.Plugins?.Browser;
      if (!Browser) return { error: 'Capacitor Browser plugin ikke tilgjengelig' };
      await Browser.open({ url: data.url });
    }

    return { error: null };
  } catch (e: any) {
    return { error: e.message || 'Ukjent feil ved innlogging' };
  }
}

/**
 * Sets up the deep link listener for OAuth callbacks.
 */
export async function setupDeepLinkListener() {
  if (!isNativePlatform()) return;

  // @ts-ignore - These packages are only available in native Capacitor builds
  const { App } = await import('@capacitor/app');
  // @ts-ignore
  const { Browser } = await import('@capacitor/browser');

  App.addListener('appUrlOpen', async ({ url }) => {
    console.log('[NativeAuth] Deep link received:', url);

    if (!url.startsWith(`${APP_SCHEME}://`)) return;

    try {
      await Browser.close();
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
        if (error) console.error('[NativeAuth] setSession failed:', error.message);
        return;
      }
    }

    const queryIndex = url.indexOf('?');
    if (queryIndex !== -1) {
      const params = new URLSearchParams(url.substring(queryIndex));
      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) console.error('[NativeAuth] Code exchange failed:', error.message);
      }
    }
  });
}
