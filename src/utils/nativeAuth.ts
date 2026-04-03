/**
 * Native OAuth flow for Capacitor iOS/Android using PKCE.
 *
 * Uses Supabase's built-in PKCE flow which doesn't rely on cookies,
 * avoiding "State verification failed" errors in native environments.
 *
 * Flow:
 *  1. Call supabase.auth.signInWithOAuth with PKCE flow + custom redirect
 *  2. Open the returned URL in an in-app browser
 *  3. After consent, Supabase redirects to /auth/callback on the published site
 *  4. AuthCallbackPage extracts the code and deep-links back into the app
 *  5. The native listener picks up the deep link and exchanges the code for a session
 */

import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform } from '@/utils/capacitor';

const APP_SCHEME = 'com.andreasbjorsvik.treningsappen';
const PUBLISHED_ORIGIN = 'https://treningsapp-test.lovable.app';

export async function nativeSignInWithOAuth(provider: 'google' | 'apple') {
  try {
    // Use Supabase PKCE flow — no cookies needed
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${PUBLISHED_ORIGIN}/auth/callback`,
        skipBrowserRedirect: true, // Don't redirect the webview, we'll open in-app browser
      },
    });

    if (error) return { error: error.message };
    if (!data.url) return { error: 'No OAuth URL returned' };

    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: data.url, presentationStyle: 'popover' });

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export function setupNativeAuthListener() {
  if (!isNativePlatform()) return;

  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', async ({ url }) => {
      const isDeepLink = url.startsWith(`${APP_SCHEME}://callback`);
      const isUniversalLink = url.startsWith(`${PUBLISHED_ORIGIN}/auth/callback`);

      if (!isDeepLink && !isUniversalLink) return;

      // Close the in-app browser
      try {
        const { Browser } = await import('@capacitor/browser');
        Browser.close();
      } catch { /* browser may already be closed */ }

      // Parse URL to extract code
      let parsedUrl: URL;
      if (isDeepLink) {
        parsedUrl = new URL(url.replace(`${APP_SCHEME}://`, 'https://placeholder/'));
      } else {
        parsedUrl = new URL(url);
      }

      // PKCE flow returns a code that we exchange for a session
      const code = parsedUrl.searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Failed to exchange auth code:', error.message);
        }
        return;
      }

      // Fallback: check for access_token + refresh_token (hash fragment)
      const accessToken = parsedUrl.searchParams.get('access_token');
      const refreshToken = parsedUrl.searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('Failed to set session from OAuth tokens:', error.message);
        }
      }
    });
  });
}
