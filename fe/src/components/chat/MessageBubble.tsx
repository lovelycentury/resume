import { useTranslations } from "use-intl";
import { Icon, Typography } from "@okkly/react";

import { AgentMark } from "../AgentMark.js";
import { ShimmerText } from "../ShimmerText.js";
import type { ChatMessage } from "../../state/types.js";
import { MessageText } from "./MessageText.js";
import { SearchingRow } from "./SearchingRow.js";
import { Sources } from "./Sources.js";
import { StreamError } from "./StreamError.js";
import styles from "./MessageBubble.module.scss";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const t = useTranslations("Chat");

  if (message.role === "user") {
    return (
      <div className={styles.userRow}>
        <div className={styles.userBubble}>{message.text}</div>
      </div>
    );
  }

  const isEmptyStreaming = message.status === "streaming" && message.text.length === 0;
  const showSearching = message.searching && message.text.length === 0;
  const showThinking = isEmptyStreaming && !message.searching;

  return (
    <div className={styles.assistantRow}>
      <AgentMark className={styles.avatar} />
      <div className={styles.assistantBody}>
        {showSearching && <SearchingRow />}
        {showThinking && (
          <div className={styles.thinking} role="status">
            <ShimmerText>{t("thinking")}</ShimmerText>
          </div>
        )}

        {message.text.length > 0 && (
          <div className={styles.answer}>
            <MessageText text={message.text} />
            {message.status === "streaming" && <span className={styles.caret} aria-hidden />}
          </div>
        )}

        {message.sources && message.sources.length > 0 && <Sources titles={message.sources} />}

        {message.status === "error" && (
          <StreamError message={message.error} offerSwitchModel={message.errorSwitchModel} />
        )}

        {message.status === "done" && message.text.length === 0 && !message.error && (
          <Typography variant="body-sm" color="muted" className={styles.empty}>
            <Icon name="iconAlertTriangle" fontSize="small" color="muted" /> {t("noAnswer")}
          </Typography>
        )}
      </div>
    </div>
  );
}
