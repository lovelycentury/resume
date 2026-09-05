import { useEffect, useRef } from "react";
import { useTranslations } from "use-intl";
import { Button, Icon } from "@okkly/react";
import { useCookieConsent } from "./CookieConsentProvider";
import styles from "./CookieBanner.module.scss";

export interface CookieBannerProps {
  className?: string;
}

/**
 * Reskin of the openconsent.dev banner: same context API and same three
 * actions, drawn with the profile's design system instead of Tailwind/shadcn.
 * Copy comes from use-intl so the banner speaks the visitor's locale.
 */
export function CookieBanner({ className }: CookieBannerProps) {
  const t = useTranslations("CookieConsent");
  const { isBannerVisible, acceptAll, rejectAll, openSettings, config } = useCookieConsent();
  const rootRef = useRef<HTMLDivElement>(null);

  const position = config.position ?? "bottom";
  const isBottomAnchored = position.startsWith("bottom");

  // The drawer is full-bleed and outranks the theme/locale FABs, so it would
  // otherwise bury them until a choice is made. Publishing its height lets the
  // shell lift them out of the way (see styles/globals.scss). Measured rather
  // than hardcoded: the copy wraps to a different number of lines per locale
  // and viewport.
  useEffect(() => {
    const node = rootRef.current;
    if (!node || !isBottomAnchored) return;

    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--profile-consent-inset", `${node.getBoundingClientRect().height}px`);
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--profile-consent-inset");
    };
  }, [isBannerVisible, isBottomAnchored]);

  if (!isBannerVisible) return null;

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-position={position}
      role="region"
      aria-label={t("banner.title")}
    >
      <div className={styles.panel}>
        {/* The surface runs edge to edge; this keeps the copy on the site's
            content column. */}
        <div className={styles.inner}>
          <div className={styles.copy}>
            <span className={styles.glyph} aria-hidden="true">
              <Icon name="iconShield" fontSize="small" />
            </span>
            <div className={styles.text}>
              <h2 className={styles.title}>{t("banner.title")}</h2>
              <p className={styles.body}>
                {t("banner.description")}
                {config.privacyPolicyUrl && (
                  <>
                    {" "}
                    <a className={styles.link} href={config.privacyPolicyUrl}>
                      {t("banner.learnMore")}
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className={styles.actions}>
            <Button
              variant="ghost"
              startIcon={<Icon name="iconSettings" fontSize="small" />}
              onClick={openSettings}
            >
              {t("actions.customize")}
            </Button>
            {/* Reject sits beside Accept, same size and weight: GDPR asks for
                refusal to be no harder than agreement. */}
            <Button variant="soft" onClick={() => void rejectAll()}>
              {t("actions.rejectAll")}
            </Button>
            <Button variant="primary" onClick={() => void acceptAll()}>
              {t("actions.acceptAll")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
