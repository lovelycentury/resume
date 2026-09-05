import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useAtomValue } from "jotai";
import { useTranslations } from "use-intl";
import { Icon } from "@okkly/react";

import { MAX_MESSAGE_LENGTH } from "../../config/env.js";
import { isStreamingAtom, messagesAtom } from "../../state/atoms.js";
import { useChatController } from "../../hooks/chat-context.js";
import { ModelPicker } from "./ModelPicker.js";
import styles from "./Composer.module.scss";

const MAX_ROWS = 8;

export function Composer() {
  const { send, stop } = useChatController();
  const t = useTranslations("Composer");
  const isStreaming = useAtomValue(isStreamingAtom);
  const messages = useAtomValue(messagesAtom);
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow up to MAX_ROWS, then scroll inside.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
    el.style.height = `${Math.min(el.scrollHeight, lineHeight * MAX_ROWS + 24)}px`;
  }, [text]);

  const trimmed = text.trim();
  const tooLong = trimmed.length > MAX_MESSAGE_LENGTH;
  const canSend = trimmed.length > 0 && !tooLong && !isStreaming;

  const submit = () => {
    if (!canSend) return;
    send(text);
    setText("");
  };

  // Pull the previous question back into an empty box, shell-history style — the
  // hint under the composer promises it.
  const recallLastQuestion = () => {
    const last = messages.findLast((m) => m.role === "user");
    if (!last) return false;
    setText(last.text);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      el?.setSelectionRange(last.text.length, last.text.length);
    });
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
      return;
    }
    if (e.key === "Escape" && isStreaming) {
      e.preventDefault();
      stop();
      return;
    }
    if (e.key === "ArrowUp" && text === "" && !isStreaming && recallLastQuestion()) {
      e.preventDefault();
    }
  };

  const remaining = MAX_MESSAGE_LENGTH - trimmed.length;

  return (
    <div className={styles.root}>
      <div className={[styles.box, tooLong && styles.boxError].filter(Boolean).join(" ")}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          rows={1}
          placeholder={t("placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label={t("ariaLabel")}
        />
        <div className={styles.toolbar}>
          {(tooLong || remaining <= 200) && (
            <span
              className={[styles.counter, tooLong && styles.counterError].filter(Boolean).join(" ")}
            >
              {remaining}
            </span>
          )}
          <ModelPicker />
          {isStreaming ? (
            <button
              type="button"
              className={[styles.action, styles.actionStop].join(" ")}
              aria-label={t("stop")}
              onClick={stop}
            >
              <span className={styles.stopGlyph} />
            </button>
          ) : (
            <button
              type="button"
              className={[styles.action, styles.actionSend].join(" ")}
              aria-label={t("send")}
              disabled={!canSend}
              onClick={submit}
            >
              <Icon name="iconArrowUp" fontSize="medium" />
            </button>
          )}
        </div>
      </div>
      <p className={styles.hint}>
        {tooLong ? t("tooLong", { limit: MAX_MESSAGE_LENGTH }) : t("hint")}
      </p>
    </div>
  );
}
