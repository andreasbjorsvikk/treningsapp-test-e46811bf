import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

const APP_SCHEME = 'treningsapp';

// OAuth redirects to the web app's callback page, which then redirects to the native app
const WEB_CALLBACK_URL = 'https://treningsapp-test.lovable.app/auth/native-callback';

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Signs in with OAuth for native Capacitor apps.
 * Redirects to the web callback page, which forwards tokens to the native app via deep link.
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
export function setupDeepLinkListener() {
  if (!isNativePlatform()) return;

  App.addListener('appUrlOpen', async ({ url }) => {
    console.log('[NativeAuth] Deep link received:', url);

    if (!url.startsWith(`${APP_SCHEME}://`)) return;

    // Close the browser opened during OAuth
    try {
      await Browser.close();
    } catch {
      // Browser might already be closed
    }

    // Extract tokens from the URL fragment (#access_token=...&refresh_token=...)
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

    // Try query params (code flow)
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
