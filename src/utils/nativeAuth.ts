/**
 * Native OAuth flow for Capacitor iOS/Android using manual PKCE.
 *
 * The standard supabase.auth.signInWithOAuth stores the PKCE code_verifier
 * in localStorage of the context that calls it. When we use Browser.open(),
 * the in-app browser has its OWN isolated storage, so the code_verifier is
 * lost when we try to exchange the code back in the main WebView.
 *
 * Solution: We manually generate the PKCE verifier/challenge, store the
 * verifier in the app's localStorage, construct the OAuth URL ourselves,
 * and exchange the code with the stored verifier upon return.
 */

import { supabase } from '@/integrations/supabase/client';
import { isNativePlatform } from '@/utils/capacitor';

const APP_SCHEME = 'com.andreasbjorsvik.treningsappen';
const PUBLISHED_ORIGIN = 'https://treningsapp-test.lovable.app';
const PKCE_VERIFIER_KEY = 'native_pkce_code_verifier';

// --- PKCE helpers ---

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// --- Public API ---

export async function nativeSignInWithOAuth(provider: 'google' | 'apple') {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // 1. Generate PKCE pair and store verifier in app's localStorage
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    localStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);

    // 2. Build the OAuth URL ourselves, pointing redirect to our callback bridge
    const redirectTo = `${PUBLISHED_ORIGIN}/auth/callback`;
    const params = new URLSearchParams({
      provider,
      redirect_to: redirectTo,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const oauthUrl = `${supabaseUrl}/auth/v1/authorize?${params.toString()}`;

    // 3. Open in in-app browser
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url: oauthUrl, presentationStyle: 'popover' });

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export function setupNativeAuthListener() {
  if (!isNativePlatform()) return;

  import('@capacitor/app').then(({ App }) => {
    App.addListener('appUrlOpen', async ({ url }) => {
      console.log('[NativeAuth] appUrlOpen fired:', url);

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

      const code = parsedUrl.searchParams.get('code');
      console.log('[NativeAuth] Extracted code:', code ? `${code.substring(0, 8)}...` : 'null');

      if (code) {
        // Retrieve the code verifier we stored before opening the browser
        const codeVerifier = localStorage.getItem(PKCE_VERIFIER_KEY);
        console.log('[NativeAuth] Code verifier found:', !!codeVerifier);

        if (codeVerifier) {
          localStorage.removeItem(PKCE_VERIFIER_KEY);

          // Exchange code + verifier for session via Supabase REST API
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          try {
            const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({
                auth_code: code,
                code_verifier: codeVerifier,
              }),
            });

            const tokenData = await response.json();
            console.log('[NativeAuth] Token exchange status:', response.status);

            if (!response.ok) {
              console.error('[NativeAuth] Token exchange failed:', tokenData);
              return;
            }

            // Set the session in the Supabase client
            const { error } = await supabase.auth.setSession({
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
            });

            if (error) {
              console.error('[NativeAuth] setSession failed:', error.message);
            } else {
              console.log('[NativeAuth] Session set successfully');
            }
          } catch (fetchErr) {
            console.error('[NativeAuth] Fetch error during token exchange:', fetchErr);
          }
        } else {
          // Fallback: try exchangeCodeForSession (might work if verifier is in Supabase internal storage)
          console.log('[NativeAuth] No stored verifier, trying exchangeCodeForSession fallback');
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[NativeAuth] exchangeCodeForSession failed:', error.message);
          }
        }
        return;
      }

      // Fallback: check for access_token + refresh_token
      const accessToken = parsedUrl.searchParams.get('access_token');
      const refreshToken = parsedUrl.searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          console.error('[NativeAuth] Failed to set session from tokens:', error.message);
        }
      }
    });
  });
}
