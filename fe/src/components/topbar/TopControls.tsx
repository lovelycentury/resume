import { LanguagePicker } from "./LanguagePicker.js";
import { ThemeToggle } from "./ThemeToggle.js";
import styles from "./TopControls.module.scss";

/**
 * The chat's own chrome, above the transcript. A real row rather than an absolutely
 * positioned overlay: the transcript scrolls in its own box below, so nothing ever
 * passes under these two, and the status banner keeps its place.
 */
export function TopControls() {
  return (
    <div className={styles.root}>
      <LanguagePicker />
      <ThemeToggle />
    </div>
  );
}
