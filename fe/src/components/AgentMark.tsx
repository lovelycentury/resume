import styles from "./AgentMark.module.scss";

/**
 * The assistant's mark — wherever the product speaks as itself rather than as Oleksii.
 * One component so the sidebar's byline and every answer in the transcript cannot drift
 * apart; size is driven by `--agent-mark-size`, set by whoever places it.
 *
 * Drawn inline rather than added to `@okkly/icons`: the two-star sparkle is this
 * app's brand, not a general-purpose glyph, and the set's own `sparkles` is a different
 * shape (a stroked wand). Purely decorative — the row it sits in already says who is
 * speaking, so it stays out of the accessibility tree.
 */
export function AgentMark({ className }: { className?: string }) {
  return (
    <span className={[styles.root, className].filter(Boolean).join(" ")} aria-hidden>
      <svg className={styles.glyph} viewBox="0 0 24 24" fill="currentColor" focusable="false">
        {/* Four-pointed stars: each lobe is a cubic whose controls sit near the centre,
            which is what pinches the waist and leaves the tips sharp. */}
        <path d="M9.6 2.2C9.6 8.12 11.08 9.6 17 9.6C11.08 9.6 9.6 11.08 9.6 17C9.6 11.08 8.12 9.6 2.2 9.6C8.12 9.6 9.6 8.12 9.6 2.2Z" />
        <path d="M18.2 14C18.2 17.36 19.04 18.2 22.4 18.2C19.04 18.2 18.2 19.04 18.2 22.4C18.2 19.04 17.36 18.2 14 18.2C17.36 18.2 18.2 17.36 18.2 14Z" />
      </svg>
    </span>
  );
}
