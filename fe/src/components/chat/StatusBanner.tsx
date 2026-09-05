import { useTranslations } from "use-intl";
import { Icon, Typography } from "@okkly/react";

import { useStatus } from "../../api/status.js";
import styles from "./StatusBanner.module.scss";

/**
 * Shown only when the backend's vector store isn't ready — the agent will answer "I
 * don't know" until `pnpm ingest` has run, and this explains why rather than letting it
 * look broken.
 */
export function StatusBanner() {
  const { data } = useStatus();
  const t = useTranslations("Status");

  if (!data || data.knowledgeBase === "ready") return null;

  const detail =
    data.knowledgeBase === "missing" || data.knowledgeBase === "empty"
      ? t("notIngested")
      : // `data.message` is the backend's own wording and reaches the browser untranslated;
        // it only appears when the vector store itself errored, and it is more specific
        // than anything this side could say.
        (data.message ?? t("unreachable"));

  return (
    <div className={styles.root} role="status">
      <Icon name="iconAlertTriangle" fontSize="small" color="warning" />
      <Typography variant="caption" color="secondary">
        {detail}
      </Typography>
    </div>
  );
}
