import type { GoogleConsentModeConfig } from "../components/CookieConsent/index.js";

/**
 * Google Analytics 4 (gtag.js) for the résumé chat, set up the way `apps/profile` does it:
 * Consent Mode v2 defaults denied in the head, gtag.js only in production, and the
 * vendored consent kit flipping `analytics_storage` when the visitor decides.
 *
 * The measurement ID is not a secret — it ships in the page source of every
 * GA-instrumented site — so it lives here rather than in an env var.
 */
export const GA_MEASUREMENT_ID = "G-E3BG1N4YEL";

/**
 * `import.meta.env.PROD` is Vite's build-time flag, the counterpart of the
 * `process.env.NODE_ENV === "production"` profile compiles against. It is inlined, so a
 * production build reports wherever it runs and `pnpm dev` never does.
 */
export const isAnalyticsEnabled = import.meta.env.PROD;

/** Must match `STORAGE_KEY` in `components/CookieConsent/utils.ts`. */
export const CONSENT_STORAGE_KEY = "cookie-consent";

/**
 * Bump when the categories or their wording change materially: the provider discards
 * stored consent recorded under a different version and asks again.
 */
export const CONSENT_VERSION = "1.0.0";

export const CONSENT_EXPIRATION_DAYS = 180;

/**
 * How consent categories map onto Google's consent signals. Passed to the provider so it
 * emits the full set on every `consent update` — `marketing` and `preferences` are not
 * offered as categories, which pins the ad and personalization signals to "denied" for good.
 */
export const GOOGLE_CONSENT_MODE: GoogleConsentModeConfig = {
  enabled: true,
  mapping: {
    analytics_storage: "analytics",
    ad_storage: "marketing",
    ad_user_data: "marketing",
    ad_personalization: "marketing",
    functionality_storage: "preferences",
    personalization_storage: "preferences",
    security_storage: "necessary",
  },
};

/**
 * Appends gtag.js and configures the property. Called once, after the consent defaults
 * already sit in `dataLayer` — Google only honours a `consent default` that was pushed
 * before the tag fires, which is why those live in a blocking script in index.html and
 * this loader does not.
 *
 * Injected from JS rather than written into index.html so that development never talks to
 * Google at all; profile gets the same split from `{isAnalyticsEnabled && <GoogleAnalytics/>}`.
 */
export function loadGoogleAnalytics(): void {
  if (!isAnalyticsEnabled) return;
  if (document.querySelector(`script[data-ga="${GA_MEASUREMENT_ID}"]`)) return;

  const tag = document.createElement("script");
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  tag.dataset.ga = GA_MEASUREMENT_ID;
  document.head.appendChild(tag);

  window.gtag?.("js", new Date());
  window.gtag?.("config", GA_MEASUREMENT_ID);
}
