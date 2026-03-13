import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { supabase } from '@/integrations/supabase/client';

// Custom URL scheme matching capacitor.config.ts
const APP_SCHEME = 'treningsapp';
const CALLBACK_PATH = 'auth/callback';
const REDIRECT_URL_NATIVE = `${APP_SCHEME}://${CALLBACK_PATH}`;

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Signs in with OAuth for native Capacitor apps.
 * Uses skipBrowserRedirect to get the OAuth URL, then opens it in the system browser.
 * The callback is handled via deep link.
 */
export async function nativeSignInWithOAuth(
  provider: 'google' | 'apple'
): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: REDIRECT_URL_NATIVE,
      },
    });

    if (error) return { error: error.message };

    if (data?.url) {
      // Open the OAuth URL in the system browser
      await Browser.open({ url: data.url });
    }

    return { error: null };
  } catch (e: any) {
    return { error: e.message || 'Ukjent feil ved innlogging' };
  }
}

/**
 * Sets up the deep link listener for OAuth callbacks.
 * Call this once when the app initializes.
 */
export function setupDeepLinkListener() {
  if (!isNativePlatform()) return;

  App.addListener('appUrlOpen', async ({ url }) => {
    console.log('[NativeAuth] Deep link received:', url);

    if (!url.startsWith(`${APP_SCHEME}://${CALLBACK_PATH}`)) return;

    // Close the browser opened during OAuth
    try {
      await Browser.close();
    } catch {
      // Browser might already be closed
    }

    // Extract tokens from the URL fragment (#access_token=...&refresh_token=...)
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) {
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
      return;
    }

    const fragment = url.substring(hashIndex + 1);
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.error('[NativeAuth] setSession failed:', error.message);
      }
    }
  });
}
