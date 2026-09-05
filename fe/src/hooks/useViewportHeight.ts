import { useEffect } from "react";

/**
 * Pins the phone shell to the *visual* viewport by publishing two variables:
 * `--app-viewport-height` (its height) and `--app-viewport-offset-top` (how far it has
 * been pushed down inside the layout viewport).
 *
 * `100dvh` tracks the browser's own collapsing chrome but not a software keyboard: on
 * iOS the keyboard slides over the page without resizing it, then the page is scrolled
 * up so the focused field clears the keyboard. A shell sized in `dvh` keeps its full
 * height and rides off the top of the screen with that scroll — the composer "flies away".
 *
 * `visualViewport` is the one API that reports what the visitor can actually see. The
 * shell is sized to `viewport.height` (never overlapping the keyboard) and seated at
 * `top: viewport.offsetTop` (cancelling the page scroll), so it sits exactly over the
 * visible strip whether or not the keyboard is open.
 *
 * Both variables are only *read* under the phone breakpoint (see App.module.scss); wider
 * layouts stay on `100dvh`, which is already correct there.
 */
export function useViewportHeight(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;

    const sync = () => {
      root.style.setProperty("--app-viewport-height", `${Math.round(viewport.height)}px`);
      root.style.setProperty("--app-viewport-offset-top", `${Math.round(viewport.offsetTop)}px`);
    };

    sync();
    viewport.addEventListener("resize", sync);
    viewport.addEventListener("scroll", sync);

    return () => {
      viewport.removeEventListener("resize", sync);
      viewport.removeEventListener("scroll", sync);
      root.style.removeProperty("--app-viewport-height");
      root.style.removeProperty("--app-viewport-offset-top");
    };
  }, []);
}
