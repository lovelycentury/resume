import { useCookieConsent } from "./CookieConsentProvider";
import styles from "./CookieBannerBackdrop.module.scss";

export interface CookieBannerBackdropProps {
  className?: string;
  /** Treat a click beside the banner as "reject all". Off by default. */
  closeOnClick?: boolean;
}

/**
 * Optional dimmer behind the banner. Not mounted by default: blocking the page
 * until a choice is made is a dark pattern regulators have pushed back on, and
 * the banner reads fine over the aurora background on its own.
 */
export function CookieBannerBackdrop({
  className,
  closeOnClick = false,
}: CookieBannerBackdropProps) {
  const { isBannerVisible, rejectAll } = useCookieConsent();

  if (!isBannerVisible) return null;

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-clickable={closeOnClick ? "" : undefined}
      onClick={closeOnClick ? () => void rejectAll() : undefined}
      aria-hidden="true"
    />
  );
}
