/**
 * Native OAuth flow for Capacitor iOS/Android.
 *
 * In a native shell the normal web-redirect OAuth does not work because
 * the WebView can't receive the redirect back from the identity provider.
 *
 * Strategy:
 *  1. Use Supabase's signInWithOAuth with `skipBrowserRedirect: true` to
 *     get the provider URL + PKCE code verifier.
 *  2. Open that URL in the **system browser** via @capacitor/browser.
 *  3. The provider redirects back to a custom-scheme deep link
 *     (e.g. app.lovable.b76d427e030c484ab51c8b1ec9d0841b://callback).
 *  4. @capacitor/app fires an `appUrlOpen` event with the full URL.
 *  5. We extract the `code` query-param, exchange it for a session with
 *     Supabase, and close the system browser.
 */

import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform } from '@/utils/capacitor';

// Must match the URL scheme registered in Info.plist / capacitor.config.ts
const APP_SCHEME = 'com.andreasbjorsvik.treningsappen';
const NATIVE_REDIRECT = `${APP_SCHEME}://callback`;

/**
 * Start native OAuth for a given provider.
 * Returns { error } – caller should show error to the user if set.
 */
export async function nativeSignInWithOAuth(provider: 'google' | 'apple') {
  try {
    // Dynamic import so the Capacitor plugins are only loaded in native
    const { Browser } = await import('@capacitor/browser');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: NATIVE_REDIRECT,
      },
    });

    if (error || !data?.url) {
      return { error: error?.message ?? 'Failed to start sign-in' };
    }

    // Open the auth URL in the system browser (Safari on iOS)
    await Browser.open({ url: data.url, presentationStyle: 'popover' });

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Handle the deep-link callback after the user completes OAuth in the
 * system browser. Call this once at app startup (e.g. in App.tsx or main.tsx).
 */
export function setupNativeAuthListener() {
  if (!isNativePlatform()) return;

  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', async ({ url }) => {
      // Only handle our auth callback scheme
      if (!url.startsWith(`${APP_SCHEME}://callback`)) return;

      try {
        // Close the system browser tab
        const { Browser } = await import('@capacitor/browser');
        Browser.close();
      } catch { /* browser may already be closed */ }

      // Extract the auth code from the URL
      const urlObj = new URL(url.replace('app.lovable.b76d427e030c484ab51c8b1ec9d0841b://', 'https://placeholder/'));
      const code = urlObj.searchParams.get('code');

      if (code) {
        // Exchange the code for a session (PKCE flow)
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Failed to exchange auth code:', error.message);
        }
        // onAuthStateChange in useAuth will pick up the new session automatically
      }
    });
  });
}
