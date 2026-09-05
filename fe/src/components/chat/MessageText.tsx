import { Fragment, type ReactNode } from "react";

import styles from "./MessageText.module.scss";

/**
 * A deliberately tiny Markdown-ish renderer for assistant answers — the model is asked
 * for short prose, so this covers paragraphs, line breaks, `-` bullets, `**bold**` and
 * `` `code` ``. Not a full parser; anything fancier renders as plain text.
 */

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/** Splits on whitespace but keeps it, so `white-space: pre-wrap` still sees every space. */
const WORDS = /(\s+)/;

/**
 * Each word is its own element so streamed text can fade in a word at a time.
 *
 * The animation comes for free from React's reconciliation rather than from any
 * bookkeeping: a delta appends to the string, the spans that already exist keep their
 * index (and so their identity) and are only mutated, while the words that just arrived
 * are *mounted* — and a CSS animation on a fresh element runs exactly once. Text that is
 * already on screen therefore never re-fades, including when a delta lands mid-word.
 *
 * Whitespace stays outside the spans: it must remain plain text for copy/paste and for
 * line breaking to work as it does now.
 */
function renderWords(text: string, keyBase: string): ReactNode[] {
  return text.split(WORDS).map((token, i) => {
    if (token === "") return null;
    const key = `${keyBase}-w${i}`;

    if (/^\s+$/.test(token)) return <Fragment key={key}>{token}</Fragment>;

    return (
      <span key={key} className={styles.word}>
        {token}
      </span>
    );
  });
}

function renderInline(text: string, keyBase: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyBase}-${i}`;
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={key}>{renderWords(part.slice(2, -2), key)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      // A code span is one visual object, so it fades as a unit rather than per word.
      return (
        <code key={key} className={`${styles.code} ${styles.word}`}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={key}>{renderWords(part, key)}</Fragment>;
  });
}

export function MessageText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);

  return (
    <>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^[-*]\s+/.test(l.trim()));

        if (isList) {
          return (
            <ul key={bi} className={styles.list}>
              {lines.map((l, li) => (
                <li key={li}>{renderInline(l.trim().replace(/^[-*]\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={bi} className={styles.paragraph}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {renderInline(l, `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
