export type Role = "user" | "assistant";

export type MessageStatus = "streaming" | "done" | "error";

/**
 * A chat turn as the UI holds it. A superset of the wire shape: `sources` and `status`
 * are derived from SSE events and only ever attach to assistant messages.
 */
export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  /** Knowledge-base documents the backend actually retrieved for this answer. */
  sources?: string[];
  status: MessageStatus;
  /** Transient: retrieval is running for this (still-streaming) answer. Not persisted meaningfully. */
  searching?: boolean;
  /** Present when `status === "error"` — safe to render verbatim. */
  error?: string;
  /** True when the error is "pick another model" shaped (backend 503). Shows a Switch model action. */
  errorSwitchModel?: boolean;
  createdAt: number;
}

/** Languages offered in the top-right picker, in the order they are listed. */
export type LanguageCode = "de" | "en" | "uk" | "ru";
