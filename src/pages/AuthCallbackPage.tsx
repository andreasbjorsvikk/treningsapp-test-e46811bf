import { useEffect, useMemo, useState } from 'react';

const APP_SCHEME = 'com.andreasbjorsvik.treningsappen';

const AuthCallbackPage = () => {
  const [showFallback, setShowFallback] = useState(false);

  const deepLink = useMemo(() => {
    let params = window.location.search;

    if (!params && window.location.hash) {
      params = `?${window.location.hash.substring(1)}`;
    }

    return `${APP_SCHEME}://callback${params}`;
  }, []);

  useEffect(() => {
    window.location.replace(deepLink);

    const timer = window.setTimeout(() => {
      setShowFallback(true);
    }, 1800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [deepLink]);

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
        <h1 className="font-display text-xl">Signing you in…</h1>
        <p className="mt-2 text-sm text-muted-foreground">Returning to Treningsappen.</p>

        {showFallback && (
          <a
            href={deepLink}
            className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Treningsappen
          </a>
        )}
      </section>
    </main>
  );
};

export default AuthCallbackPage;
