import { useEffect } from 'react';

/**
 * This page is loaded in the system browser after OAuth completes.
 * It extracts the tokens from the URL and redirects to the native app via custom URL scheme.
 * On the web (non-native), it just redirects to the home page.
 */
const NativeCallbackPage = () => {
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;

    // Build the native deep link URL with the tokens
    const scheme = 'treningsapp';
    
    if (hash) {
      // Token flow: redirect with hash fragment
      window.location.href = `${scheme}://auth/callback${hash}`;
    } else if (search) {
      // Code flow: redirect with query params
      window.location.href = `${scheme}://auth/callback${search}`;
    } else {
      // Fallback: just go home
      window.location.href = '/';
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="animate-pulse text-muted-foreground">Logger inn…</span>
    </div>
  );
};

export default NativeCallbackPage;
