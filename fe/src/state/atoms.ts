import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import { createSessionStorage } from "./storage.js";
import type { ChatMessage, LanguageCode } from "./types.js";

/** Bump when the persisted shape changes so stale sessions fall back to empty. */
const KEY = "resume-chat/v1";

/**
 * The transcript — the single source of truth for history. Persisted to `sessionStorage`,
 * so it survives a reload and is gone when the tab closes. `getOnInit` reads it
 * synchronously on first render so the conversation doesn't flash empty.
 */
export const messagesAtom = atomWithStorage<ChatMessage[]>(
  `${KEY}/messages`,
  [],
  createSessionStorage<ChatMessage[]>(),
  { getOnInit: true },
);

/**
 * The chosen model id, or `null` to follow the backend's default. Also persisted, so a
 * visitor's pick sticks across reloads within the session.
 */
export const modelIdAtom = atomWithStorage<string | null>(
  `${KEY}/model`,
  null,
  createSessionStorage<string | null>(),
  { getOnInit: true },
);

/**
 * The UI language the visitor picked. Persisted like the model choice, so the pick
 * survives a reload inside the session.
 *
 * Nothing is translated yet — this only records the choice and drives the button's
 * label. The agent already answers in whatever language the visitor writes in (see the
 * backend's instructions), so this is about the chrome, not the answers.
 */
export const languageAtom = atomWithStorage<LanguageCode>(
  `${KEY}/language`,
  "en",
  createSessionStorage<LanguageCode>(),
  { getOnInit: true },
);

/** True while a `/chat` request is in flight. Drives the composer's send/stop toggle. */
export const isStreamingAtom = atom(false);

/** Open state for the model picker popover. */
export const modelMenuOpenAtom = atom(false);

/** Open state for the language picker popover. */
export const languageMenuOpenAtom = atom(false);
