import { useSetAtom } from "jotai";
import { useTranslations } from "use-intl";
import { Button, Icon, Typography } from "@okkly/react";

import { modelMenuOpenAtom } from "../../state/atoms.js";
import { useChatController } from "../../hooks/chat-context.js";
import styles from "./StreamError.module.scss";

export function StreamError({
  message,
  offerSwitchModel,
}: {
  message?: string;
  offerSwitchModel?: boolean;
}) {
  const { retryLast, isStreaming } = useChatController();
  const t = useTranslations("Chat");
  const openModelMenu = useSetAtom(modelMenuOpenAtom);

  return (
    <div className={styles.root} role="alert">
      <Icon name="iconAlertTriangle" fontSize="small" color="danger" className={styles.icon} />
      <div className={styles.body}>
        <Typography variant="body-sm" className={styles.message}>
          {message ?? t("unfinished")}
        </Typography>
        <div className={styles.actions}>
          <Button
            variant="soft"
            color="dante"
            size="small"
            startIcon={<Icon name="iconRotateCcw" fontSize="small" />}
            disabled={isStreaming}
            onClick={retryLast}
          >
            {t("tryAgain")}
          </Button>
          {offerSwitchModel && (
            <Button variant="ghost" size="small" onClick={() => openModelMenu(true)}>
              {t("switchModel")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
