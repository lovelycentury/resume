import { API_BASE_URL } from "../config/env.js";
import { chatEventSchema, type ChatEvent } from "./chat-events.js";
import { ApiError } from "./http.js";

/** One turn on the wire. Matches the backend's `chatMessageSchema`. */
export interface WireMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamChatArgs {
  messages: WireMessage[];
  modelId?: string;
  signal: AbortSignal;
  /** Called once per parsed SSE frame, in arrival order. */
  onEvent: (event: ChatEvent) => void;
}

/**
 * POSTs a transcript to `/chat` and drives {@link StreamChatArgs.onEvent} from the SSE
 * response.
 *
 * Two failure shapes, kept distinct so the UI can tell them apart:
 *  - the request never streamed (bad body, unknown/unconfigured model, provider down) →
 *    a JSON body with a 4xx/5xx, surfaced as {@link ApiError};
 *  - the stream opened and then died → an `error` event through `onEvent`, or a thrown
 *    error from the reader if the connection itself dropped.
 *
 * Aborting via `signal` resolves normally — a half-written answer is kept, not discarded.
 */
export async function streamChat({
  messages,
  modelId,
  signal,
  onEvent,
}: StreamChatArgs): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(modelId ? { messages, modelId } : { messages }),
    signal,
  });

  if (!res.ok || !res.body) {
    const body: unknown = await res.json().catch(() => undefined);
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, body);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += value;

      // SSE frames are separated by a blank line. Keep the trailing partial in `buffer`.
      let boundary = buffer.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        const data = frame
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim())
          .join("");
        if (!data) continue;

        const parsed = chatEventSchema.safeParse(JSON.parse(data));
        if (parsed.success) onEvent(parsed.data);
      }
    }
  } catch (error) {
    // An abort is a normal end of stream here, not a failure.
    if (signal.aborted) return;
    throw error;
  } finally {
    reader.releaseLock();
  }
}
