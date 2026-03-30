/**
 * Native OAuth flow for Capacitor iOS/Android — two-step redirect.
 *
 * Because Lovable Cloud only allows https:// redirect URLs, we use:
 *  1. Supabase signInWithOAuth → redirectTo = https://treningsapp-test.lovable.app/auth/callback
 *  2. That web page forwards the auth code to the native deep link:
 *     com.andreasbjorsvik.treningsappen://callback?code=...
 *  3. @capacitor/app fires `appUrlOpen`, we exchange the code for a session.
 */

import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform } from '@/utils/capacitor';

const APP_SCHEME = 'com.andreasbjorsvik.treningsappen';
const WEB_CALLBACK = 'https://treningsapp-test.lovable.app/auth/callback';

export async function nativeSignInWithOAuth(provider: 'google' | 'apple') {
  try {
    const { Browser } = await import('@capacitor/browser');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: WEB_CALLBACK,
      },
    });

    if (error || !data?.url) {
      return { error: error?.message ?? 'Failed to start sign-in' };
    }

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
      // Handle both the custom scheme callback AND universal link callback
      const isDeepLink = url.startsWith(`${APP_SCHEME}://callback`);
      const isUniversalLink = url.startsWith(WEB_CALLBACK);

      if (!isDeepLink && !isUniversalLink) return;

      try {
        const { Browser } = await import('@capacitor/browser');
        Browser.close();
      } catch { /* browser may already be closed */ }

      // Parse the URL to extract the code
      let parsedUrl: URL;
      if (isDeepLink) {
        parsedUrl = new URL(url.replace(`${APP_SCHEME}://`, 'https://placeholder/'));
      } else {
        parsedUrl = new URL(url);
      }

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
