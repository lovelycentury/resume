// Public surface of the vendored openconsent.dev kit. See README.md.
export { ConsentScript } from "./ConsentScript";
export { CookieBanner } from "./CookieBanner";
export { CookieBannerBackdrop } from "./CookieBannerBackdrop";
export {
  CookieConsentProvider,
  defaultCategories,
  useCookieConsent,
} from "./CookieConsentProvider";
export { CookieSettings } from "./CookieSettings";
export { CookieTrigger } from "./CookieTrigger";
export { GoogleConsentMode } from "./GoogleConsentMode";
export { useConsentScript } from "./useConsentScript";
export { useConsentGate, useConsentValue } from "./useCookieConsent";

// Types
export type {
  BannerPosition,
  CategoryConfig,
  ConsentAction,
  ConsentCategories,
  ConsentCategory,
  ConsentChangeEvent,
  ConsentRecord,
  ConsentScope,
  ConsentScopeConfig,
  ConsentState,
  CookieConsentConfig,
  CookieConsentContextValue,
  GoogleConsentModeConfig,
  ScriptConfig,
  TraceabilityConfig,
} from "./types";

// Utilities
export {
  getLoadedScripts,
  hasGoogleScripts,
  loadScript,
  registerCleanup,
  registerScript,
  scriptCleanupHelpers,
  unloadScript,
  unregisterScript,
} from "./scriptManager";
export { retryFailedRecords, trackConsent } from "./tracker";
export { generateUUID, getExistingVisitorId, getVisitorId, isGoogleScript } from "./utils";
