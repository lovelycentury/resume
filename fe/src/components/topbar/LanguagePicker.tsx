import { useRef } from "react";
import { useAtom } from "jotai";
import { useTranslations } from "use-intl";
import { Icon, Popover } from "@okkly/react";

import { LANGUAGES } from "../../config/content.js";
import { trackLocaleSwitch } from "../../lib/analyticsEvents.js";
import { languageAtom, languageMenuOpenAtom } from "../../state/atoms.js";
import styles from "./TopControls.module.scss";

export function LanguagePicker() {
  const [open, setOpen] = useAtom(languageMenuOpenAtom);
  const [language, setLanguage] = useAtom(languageAtom);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const t = useTranslations("TopControls");

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={styles.control}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("language")}
      >
        <span className={styles.code}>{language.toUpperCase()}</span>
        <Icon name="iconChevronDown" fontSize="small" color="muted" />
      </button>

      <Popover
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-end"
        onClose={() => setOpen(false)}
        paperClassName={styles.paper}
      >
        <div className={styles.menu} role="listbox" aria-label={t("language")}>
          {LANGUAGES.map(({ code, label }) => {
            const isCurrent = code === language;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={isCurrent}
                className={styles.option}
                onClick={() => {
                  if (code !== language) trackLocaleSwitch(language, code);
                  setLanguage(code);
                  setOpen(false);
                }}
              >
                <span className={styles.optionCode}>{code.toUpperCase()}</span>
                <span className={styles.optionLabel}>{label}</span>
                {isCurrent && <Icon name="iconCheck" fontSize="small" color="primary" />}
              </button>
            );
          })}
        </div>
      </Popover>
    </>
  );
}
