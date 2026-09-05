import { MessageBubble } from "./MessageBubble.js";
import type { ChatMessage } from "../../state/types.js";
import styles from "./Transcript.module.scss";

export function Transcript({
  messages,
  anchorId,
}: {
  messages: ChatMessage[];
  /**
   * The latest question. On phones it is scrolled to the top of the screen and stays
   * there while the answer forms — `useComposeScroll` finds it by this attribute.
   */
  anchorId?: string | null;
}) {
  return (
    <ol className={styles.list}>
      {messages.map((message) => (
        <li
          key={message.id}
          className={styles.item}
          data-anchor={message.id === anchorId ? "" : undefined}
        >
          <MessageBubble message={message} />
        </li>
      ))}
    </ol>
  );
}
