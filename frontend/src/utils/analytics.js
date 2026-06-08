// Thin, safe wrapper around GA4 (gtag). No-ops if gtag isn't loaded (e.g. native
// app, ad-blockers) so callers never need to guard.

export function trackEvent(name, params = {}) {
  try {
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', name, params);
    }
  } catch {
    // analytics must never break the app
  }
}
