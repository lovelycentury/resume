import type { ReactNode } from "react";
import { useTranslations } from "use-intl";
import { Icon } from "@okkly/react";
import { useCookieConsent } from "./CookieConsentProvider";
import styles from "./CookieTrigger.module.scss";

export interface CookieTriggerProps {
  className?: string;
  variant?: "icon" | "text";
  children?: ReactNode;
}

/**
 * Reopens the settings modal after the banner is gone. GDPR requires
 * withdrawing consent to be as easy as giving it, so this lives permanently in
 * the footer.
 */
export function CookieTrigger({ className, variant = "text", children }: CookieTriggerProps) {
  const t = useTranslations("CookieConsent");
  const { openSettings, state } = useCookieConsent();

  // Before the first decision the banner itself is on screen with the same
  // "Customize" action, so a second entry point would only be noise.
  if (!state.hasConsented && !children) return null;

  const classes = [variant === "icon" ? styles.icon : styles.text, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={openSettings}
      aria-label={variant === "icon" ? t("trigger.label") : undefined}
    >
      {children ??
        (variant === "icon" ? <Icon name="iconShield" fontSize="small" /> : t("trigger.label"))}
    </button>
  );
}
