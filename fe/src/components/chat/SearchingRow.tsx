import { useTranslations } from "use-intl";

import { ShimmerText } from "../ShimmerText.js";
import styles from "./SearchingRow.module.scss";

export function SearchingRow() {
  const t = useTranslations("Chat");

  return (
    <div className={styles.root} role="status">
      <ShimmerText>{t("searching")}</ShimmerText>
    </div>
  );
}
