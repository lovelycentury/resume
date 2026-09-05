import { useEffect, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { IntlProvider } from "use-intl";

import { languageAtom } from "../state/atoms.js";
import { MESSAGES } from "./messages.js";

/**
 * `use-intl` is the framework-agnostic core of `next-intl`, which `apps/profile` already
 * uses — same `useTranslations` API and the same `messages/<locale>.json` shape, so both
 * apps are authored the same way. next-intl itself is bound to Next's server runtime and
 * cannot run in this Vite SPA.
 *
 * The locale is whatever the language picker last wrote to `sessionStorage`, so it
 * survives a reload within the tab.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useAtomValue(languageAtom);

  // Keeps the document in sync for screen readers, spellcheck and hyphenation — `lang`
  // is set in index.html for the first paint and corrected here once the pick is read.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <IntlProvider locale={locale} messages={MESSAGES[locale]}>
      {children}
    </IntlProvider>
  );
}
