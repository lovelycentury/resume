import { useTranslations } from "use-intl";
import { Icon, Typography } from "@okkly/react";

import styles from "./Sources.module.scss";

/**
 * The knowledge-base documents the backend actually retrieved for this answer — derived
 * server-side, not from anything the model claimed. Titles come straight from the CV
 * files' headings (e.g. "Oleksii Kryshtopa — CV").
 */
export function Sources({ titles }: { titles: string[] }) {
  const t = useTranslations("Chat");

  return (
    <div className={styles.root}>
      <Typography variant="label-sm" color="muted" className={styles.label}>
        <Icon name="iconSearch" fontSize="small" color="muted" /> {t("groundedIn")}
      </Typography>
      <ul className={styles.chips}>
        {titles.map((title) => (
          <li key={title} className={styles.chip}>
            {title}
          </li>
        ))}
      </ul>
    </div>
  );
}
