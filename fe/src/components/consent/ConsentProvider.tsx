import { useMemo, type ReactNode } from "react";
import { useTranslations } from "use-intl";

import {
  CookieBanner,
  CookieConsentProvider,
  CookieSettings,
  type CategoryConfig,
  type CookieConsentConfig,
} from "../CookieConsent/index.js";
import {
  CONSENT_EXPIRATION_DAYS,
  CONSENT_VERSION,
  GOOGLE_CONSENT_MODE,
} from "../../lib/analytics.js";
import { trackConsentChoice } from "../../lib/analyticsEvents.js";

/**
 * App-side wiring for the vendored Open Cookie Consent kit, ported from
 * `apps/profile/src/components/ConsentProvider`: the config the kit cannot know (version,
 * categories, Google mapping) plus the banner and the settings modal, so every consumer
 * of `useCookieConsent` sits under one provider.
 *
 * `children` renders inside it, which is what lets the sidebar's `CookieTrigger` reach
 * the context.
 */
export function ConsentProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("CookieConsent");

  const config = useMemo<CookieConsentConfig>(() => {
    // Only the two categories this app actually has. Leaving `marketing` and
    // `preferences` out is what keeps their Google signals denied for good.
    const categories: CategoryConfig[] = [
      {
        key: "necessary",
        title: t("categories.necessary.title"),
        description: t("categories.necessary.description"),
        required: true,
      },
      {
        key: "analytics",
        title: t("categories.analytics.title"),
        description: t("categories.analytics.description"),
      },
    ];

    return {
      consentVersion: CONSENT_VERSION,
      expirationDays: CONSENT_EXPIRATION_DAYS,
      position: "bottom",
      googleConsentMode: GOOGLE_CONSENT_MODE,
      categories,
      // Fires right after the kit has pushed `consent update`, so a hit that reports
      // "accepted" is itself sent under the granted state.
      onConsentChange: (event) =>
        trackConsentChoice(event.action, event.currentCategories.analytics),
    };
  }, [t]);

  return (
    <CookieConsentProvider config={config}>
      {children}
      <CookieBanner />
      <CookieSettings />
    </CookieConsentProvider>
  );
}
