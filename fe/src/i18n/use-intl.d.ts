import type en from "../../messages/en.json";
import type { LanguageCode } from "../state/types.js";

/**
 * Types `useTranslations` against the real dictionary: an unknown namespace or key is a
 * compile error, and `t("Composer.tooLong")` knows it needs a `limit`.
 */
declare module "use-intl" {
  interface AppConfig {
    Locale: LanguageCode;
    Messages: typeof en;
  }
}
