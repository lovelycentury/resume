import { useRef } from "react";
import { useAtomValue } from "jotai";

import { messagesAtom } from "../../state/atoms.js";
import { useChatController } from "../../hooks/chat-context.js";
import { useAutoScroll } from "../../hooks/useAutoScroll.js";
import { useComposeScroll } from "../../hooks/useComposeScroll.js";
import { useIsPhone } from "../../hooks/useIsPhone.js";
import { StatusBanner } from "./StatusBanner.js";
import { EmptyState } from "./EmptyState.js";
import { Transcript } from "./Transcript.js";
import { Composer } from "./Composer.js";
import styles from "./ChatPanel.module.scss";

export function ChatPanel() {
  const messages = useAtomValue(messagesAtom);
  const { send } = useChatController();
  const scrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const isPhone = useIsPhone();

  // Two reading patterns for two screen sizes. Wide: re-pin to the bottom on every count
  // change and every streamed token. Phone: anchor the question at the top instead and
  // let the answer fill the room reserved below it.
  useAutoScroll(scrollRef, `${messages.length}:${messages.at(-1)?.text.length ?? 0}`, !isPhone);

  const lastUserId = messages.findLast((m) => m.role === "user")?.id ?? null;
  const spacerHeight = useComposeScroll({
    scrollRef,
    listRef,
    messages,
    enabled: isPhone,
  });

  return (
    <div className={styles.root}>
      <StatusBanner />
      <div className={styles.scroll} ref={scrollRef}>
        <div className={styles.column}>
          {messages.length === 0 ? (
            <EmptyState onPick={send} />
          ) : (
            <div ref={listRef} className={styles.transcript}>
              <Transcript messages={messages} anchorId={lastUserId} />
            </div>
          )}

          {/* Room for the answer still being written, so the question above it can sit at
              the top of the screen. Collapses to nothing once the answer fills the view. */}
          {spacerHeight > 0 && (
            <div className={styles.spacer} style={{ height: spacerHeight }} aria-hidden />
          )}
        </div>
      </div>
      <div className={styles.composer}>
        <div className={styles.composerColumn}>
          <Composer />
        </div>
      </div>
    </div>
  );
}
