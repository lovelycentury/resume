import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { Icon } from "@okkly/react";

import { trackThemeSwitch } from "../../lib/analyticsEvents.js";
import {
  applyTheme,
  readDocumentTheme,
  readStoredTheme,
  readSystemTheme,
} from "../../lib/theme.js";
import type { Theme } from "../../lib/theme.js";
import styles from "./TopControls.module.scss";

/**
 * Light/dark switch, following `apps/profile`'s ThemeFab: the OS preference is the
 * default and keeps applying until the visitor picks a side, after which the pick wins.
 */
export function ThemeToggle() {
  const t = useTranslations("TopControls");
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // The bootstrap script in index.html has already decided; read its answer rather
    // than deciding a second time and risking a different one.
    setTheme(readDocumentTheme());

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      // Once there is an explicit pick, the OS no longer gets a vote.
      if (readStoredTheme()) return;
      const next = readSystemTheme();
      applyTheme(next, { persist: false });
      setTheme(next);
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const isLight = theme === "light";

  return (
    <button
      type="button"
      className={`${styles.control} ${styles.iconOnly}`}
      aria-label={isLight ? t("switchToDark") : t("switchToLight")}
      title={isLight ? t("switchToDark") : t("switchToLight")}
      aria-pressed={isLight}
      onClick={() => {
        const next: Theme = isLight ? "dark" : "light";
        applyTheme(next);
        setTheme(next);
        trackThemeSwitch(next);
      }}
    >
      <Icon name={isLight ? "iconMoon" : "iconSun"} fontSize="small" color="inherit" />
    </button>
  );
}
