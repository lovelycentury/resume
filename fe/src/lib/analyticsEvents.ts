/**
 * GA4 custom events, mirroring `apps/profile/src/lib/analyticsEvents.ts`.
 *
 * Only what Enhanced Measurement misses belongs here. Kept to the three the profile site
 * also sends — the two chrome controls and the consent decision itself — rather than
 * instrumenting the chat, which is a separate decision about what is worth measuring.
 *
 * Every param has to be registered as a custom dimension in GA4 Admin before it shows up
 * outside Realtime and BigQuery.
 */

type EventParams = Record<string, string | number | boolean>;

/**
 * `window.gtag` is defined by the consent bootstrap in index.html, so this is a queue
 * push even before gtag.js loads — and a harmless no-op in development, where the tag is
 * never fetched. Consent is handled upstream by Consent Mode: while analytics is denied
 * these still send, but cookielessly.
 */
function track(name: string, params?: EventParams): void {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

export function trackThemeSwitch(theme: "light" | "dark"): void {
  track("theme_switch", { theme });
}

export function trackLocaleSwitch(from: string, to: string): void {
  track("locale_switch", { from_locale: from, to_locale: to });
}

/**
 * What share of visitors is measurable at all. Every other number should be read against
 * this one.
 */
export function trackConsentChoice(action: string, analyticsGranted: boolean): void {
  track("consent_choice", { action, analytics_granted: analyticsGranted });
}
