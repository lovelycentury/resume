/**
 * Theme plumbing, ported from `apps/profile/src/lib/theme.ts`. Same contract: an explicit
 * pick lives on `data-theme` and in `localStorage`, and until one is made the OS
 * preference decides.
 *
 * `localStorage`, not the `sessionStorage` the conversation uses — a theme is a standing
 * preference about the person's eyes, not something that should reset with a new tab.
 */

export const THEME_STORAGE_KEY = "okkly-resume-theme";
export const THEME_TRANSITION_MS = 220;

export type Theme = "light" | "dark";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function readDocumentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function readSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function applyTheme(theme: Theme, options?: { persist?: boolean }): void {
  const root = document.documentElement;
  const persist = options?.persist !== false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // `okkly-transition-active` is the design system's own hook (`styles/root.scss`): it
  // gives every element a colour transition for the length of the swap, then gets out of
  // the way so nothing carries a permanent transition it never asked for.
  if (!reduceMotion) {
    root.classList.add("okkly-transition-active");
    window.setTimeout(() => {
      root.classList.remove("okkly-transition-active");
    }, THEME_TRANSITION_MS);
  }

  root.setAttribute("data-theme", theme);
  // The design system keys `color-scheme` and its shadow set off this class.
  root.classList.toggle("dark", theme === "dark");

  if (!persist) return;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode or blocked storage — the session still switches, it just won't stick.
  }
}
