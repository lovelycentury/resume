import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import {
  Button,
  Dialog,
  DialogActions,
  DialogClose,
  DialogContent,
  DialogTitle,
  Icon,
  Switch,
} from "@okkly/react";
import { defaultCategories, useCookieConsent } from "./CookieConsentProvider";
import type { ConsentCategories, ConsentCategory } from "./types";
import { getAllAcceptedCategories, getDefaultCategories } from "./utils";
import styles from "./CookieSettings.module.scss";

export interface CookieSettingsProps {
  className?: string;
}

/**
 * Reskin of the openconsent.dev settings modal on the design system's Dialog.
 * Category titles and descriptions still come from `config.categories`, which
 * `ConsentProvider` fills from use-intl.
 */
export function CookieSettings({ className }: CookieSettingsProps) {
  const t = useTranslations("CookieConsent");
  const { isSettingsOpen, closeSettings, state, updateConsent, config, acceptAll, rejectAll } =
    useCookieConsent();

  const categories = config.categories ?? defaultCategories;
  const [localCategories, setLocalCategories] = useState<ConsentCategories>(state.categories);

  // The modal is kept mounted, so re-seed the toggles every time it opens.
  useEffect(() => {
    if (isSettingsOpen) {
      setLocalCategories(state.categories);
    }
  }, [isSettingsOpen, state.categories]);

  const toggle = (key: ConsentCategory, checked: boolean) => {
    setLocalCategories((previous) => ({ ...previous, [key]: checked }));
  };

  const save = async () => {
    await updateConsent(localCategories);
    closeSettings();
  };

  const acceptEverything = async () => {
    setLocalCategories(getAllAcceptedCategories(categories));
    await acceptAll();
    closeSettings();
  };

  const rejectEverything = async () => {
    setLocalCategories(getDefaultCategories(categories));
    await rejectAll();
    closeSettings();
  };

  return (
    <Dialog
      open={isSettingsOpen}
      onClose={closeSettings}
      fullWidth
      maxWidth="sm"
      className={className}
    >
      <DialogTitle className={styles.title}>
        <span className={styles.glyph} aria-hidden="true">
          <Icon name="iconShield" fontSize="small" />
        </span>
        <span className={styles.heading}>
          {t("settings.title")}
          <span className={styles.subtitle}>{t("settings.description")}</span>
        </span>
      </DialogTitle>
      <DialogClose aria-label={t("actions.close")} onClick={closeSettings} />

      <DialogContent className={styles.content}>
        <ul className={styles.list}>
          {categories.map((category) => {
            const enabled = localCategories[category.key];
            return (
              <li
                key={category.key}
                className={styles.category}
                data-enabled={enabled ? "" : undefined}
              >
                <div className={styles.categoryText}>
                  <span className={styles.categoryTitle}>
                    {category.title}
                    {category.required && (
                      <span className={styles.badge}>{t("settings.required")}</span>
                    )}
                  </span>
                  <p className={styles.categoryDescription}>{category.description}</p>
                </div>
                <Switch
                  checked={enabled}
                  disabled={category.required}
                  onChange={(_event, checked) => toggle(category.key, checked)}
                  aria-label={category.title}
                />
              </li>
            );
          })}
        </ul>
      </DialogContent>

      <DialogActions className={styles.actions}>
        <Button variant="ghost" onClick={() => void rejectEverything()}>
          {t("actions.rejectAll")}
        </Button>
        <Button variant="soft" onClick={() => void acceptEverything()}>
          {t("actions.acceptAll")}
        </Button>
        <Button
          variant="primary"
          startIcon={<Icon name="iconCheck" fontSize="small" />}
          onClick={() => void save()}
        >
          {t("actions.save")}
        </Button>
      </DialogActions>

      {config.privacyPolicyUrl && (
        <p className={styles.policy}>
          <a className={styles.link} href={config.privacyPolicyUrl}>
            {t("settings.privacyPolicy")}
          </a>
        </p>
      )}
    </Dialog>
  );
}
