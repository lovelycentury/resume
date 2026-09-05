import type { LanguageCode } from "../state/types.js";

/**
 * Facts and structure around the chat — the person, the product, the option lists.
 * Everything a visitor *reads* lives in `messages/<locale>.json` instead; what stays here
 * is either a proper noun or an ordering that the dictionaries key off.
 */

export const PROFILE = {
  name: "Oleksii Kryshtopa",
  role: "Senior Frontend Engineer · Design Systems",
  email: "oleksii.kryshtopa@tutamail.com",
  /** Personal site — shown in the sidebar footer, labelled by its bare domain. */
  website: "https://okryshto.dev",
  /** Profile links — rendered as icon buttons in the sidebar footer. */
  github: "https://github.com/lovelycentury",
  linkedin: "https://www.linkedin.com/in/oleksii-k-412625261",
  /**
   * Served from `public/assets/` (copied verbatim into the build), not imported — the
   * file is a 192px square, four times the 48px the avatar renders at, which covers
   * every pixel ratio without shipping the 2892px original.
   */
  photo: "/assets/avatar.jpg",
} as const;

/**
 * Product name and badge — untranslated on purpose, they read the same in every locale.
 * The block's prose lives in `Sidebar.disclaimer`, and it has to stay true to the
 * architecture: one conversation per tab, held in `sessionStorage` (`state/storage.ts`)
 * and gone with the tab; the agent has no `Memory` and the backend keeps no thread
 * store, so the transcript is replayed on each `/chat` call and never written down.
 */
export const SIDEBAR_FOOTER = {
  product: "Resume",
  badge: "AI",
} as const;

/**
 * Keys into the `Starters` namespace, in display order. The prompt text itself is
 * translated: a visitor picking a chip sends the question in their own language, and the
 * agent answers in the language it was asked in.
 */
export const STARTER_KEYS = [
  "strongest",
  "leadership",
  "chaos",
  "craft",
  "learning",
  "outsideWork",
] as const;

/**
 * The language picker's options, in display order. Each is labelled in its own language —
 * a visitor looking for their language recognises "Українська" faster than "Ukrainian".
 */
export const LANGUAGES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "English" },
  { code: "uk", label: "Українська" },
  { code: "ru", label: "Русский" },
] as const satisfies readonly { code: LanguageCode; label: string }[];
