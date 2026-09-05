import { useAtomValue } from "jotai";
import { useTranslations } from "use-intl";
import { Icon, Typography } from "@okkly/react";

import { STARTER_KEYS } from "../../config/content.js";
import { isStreamingAtom } from "../../state/atoms.js";
import styles from "./EmptyState.module.scss";

export function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  const isStreaming = useAtomValue(isStreamingAtom);
  const t = useTranslations("EmptyState");
  const tStarter = useTranslations("Starters");

  return (
    <div className={styles.root}>
      <Typography variant="overline" color="accent" as="p" className={styles.eyebrow}>
        {t("eyebrow")}
      </Typography>
      <Typography variant="display-lg" as="h1" className={styles.title}>
        {t("title")}
      </Typography>
      <Typography variant="body-md" color="secondary" as="p" className={styles.subtitle}>
        {t("subtitle")}
      </Typography>

      <div className={styles.prompts}>
        {STARTER_KEYS.map((key) => {
          const prompt = tStarter(key);
          return (
            <button
              key={key}
              type="button"
              className={styles.prompt}
              disabled={isStreaming}
              onClick={() => onPick(prompt)}
            >
              <Icon name="iconSparkles" fontSize="small" color="primary" />
              <span>{prompt}</span>
              <Icon name="iconArrowUpRight" fontSize="small" color="muted" className={styles.go} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
