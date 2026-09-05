import type { ReactNode } from "react";

import styles from "./ShimmerText.module.scss";

/**
 * A highlight sweeping left-to-right through the text itself — the wait indicator
 * ChatGPT and Perplexity use, in place of a spinner.
 *
 * It says the same thing a spinner does but reads better here: the label already carries
 * the meaning ("Searching the CV…"), so the motion belongs *on those words* rather than
 * on a disc beside them competing for the eye.
 */
export function ShimmerText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={[styles.root, className].filter(Boolean).join(" ")}>{children}</span>;
}
