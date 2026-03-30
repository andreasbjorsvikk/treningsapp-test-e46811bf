/**
 * Native OAuth flow for Capacitor iOS/Android.
 *
 * Uses the Lovable Cloud OAuth broker on the published domain so that
 * OAuth secrets are handled server-side (they are NOT stored in Supabase directly).
 *
 * Flow:
 *  1. Open https://treningsapp-test.lovable.app/~oauth/initiate?provider=…&redirect_uri=…
 *     in an in-app browser.
 *  2. Lovable Cloud proxies the OAuth dance with Google / Apple.
 *  3. After success the broker redirects to /auth/callback on the published site.
 *  4. AuthCallbackPage extracts the tokens / code and deep-links to
 *     com.andreasbjorsvik.treningsappen://callback?…
 *  5. The native listener below picks up the deep link and sets the session.
 */

import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform } from '@/utils/capacitor';

const APP_SCHEME = 'com.andreasbjorsvik.treningsappen';
const PUBLISHED_ORIGIN = 'https://treningsapp-test.lovable.app';
const OAUTH_BROKER = `${PUBLISHED_ORIGIN}/~oauth/initiate`;
const WEB_CALLBACK = `${PUBLISHED_ORIGIN}/auth/callback`;

export async function nativeSignInWithOAuth(provider: 'google' | 'apple') {
  try {
    const { Browser } = await import('@capacitor/browser');

    const params = new URLSearchParams({
      provider,
      redirect_uri: WEB_CALLBACK,
    });

    const url = `${OAUTH_BROKER}?${params.toString()}`;

    await Browser.open({ url, presentationStyle: 'popover' });
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
      const isUniversalLink = url.startsWith(WEB_CALLBACK);

      if (!isDeepLink && !isUniversalLink) return;

      // Close the in-app browser
      try {
        const { Browser } = await import('@capacitor/browser');
        Browser.close();
      } catch { /* browser may already be closed */ }

      // Parse URL to extract tokens or code
      let parsedUrl: URL;
      if (isDeepLink) {
        parsedUrl = new URL(url.replace(`${APP_SCHEME}://`, 'https://placeholder/'));
      } else {
        parsedUrl = new URL(url);
      }

      // The Lovable OAuth broker returns access_token + refresh_token
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
        return;
      }

      // Fallback: exchange authorization code
      const code = parsedUrl.searchParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Failed to exchange auth code:', error.message);
        }
      }
    });
  });
}
