import { useMutation } from "@tanstack/react-query";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { useCallback, useRef } from "react";
import { useTranslations } from "use-intl";

import { streamChat, type WireMessage } from "../api/chat.js";
import { ApiError } from "../api/http.js";
import { MAX_HISTORY_MESSAGES } from "../config/env.js";
import { isStreamingAtom, messagesAtom, modelIdAtom } from "../state/atoms.js";
import type { ChatMessage } from "../state/types.js";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** A message worth replaying to the backend: real content, not a failed turn. */
function toWire(messages: ChatMessage[]): WireMessage[] {
  return messages
    .filter((m) => m.status !== "error" && m.text.trim().length > 0)
    .map((m) => ({ role: m.role, content: m.text }));
}

/**
 * The chat engine. `send` appends the user turn plus a streaming assistant placeholder,
 * POSTs the whole transcript, and folds each SSE event into the placeholder. `stop`
 * aborts and keeps whatever streamed so far.
 *
 * History lives entirely in `messagesAtom` (persisted to sessionStorage); this hook
 * never holds its own copy, reading fresh from the jotai store on each call so a rapid
 * second send still sees the first.
 */
export function useChat() {
  const store = useStore();
  const setMessages = useSetAtom(messagesAtom);
  const setStreaming = useSetAtom(isStreamingAtom);
  const isStreaming = useAtomValue(isStreamingAtom);
  const abortRef = useRef<AbortController | null>(null);
  const t = useTranslations("Chat");

  const patch = useCallback(
    (id: string, fn: (m: ChatMessage) => ChatMessage) => {
      setMessages((prev) => prev.map((m) => (m.id === id ? fn(m) : m)));
    },
    [setMessages],
  );

  const mutation = useMutation({
    mutationFn: async ({ wire, assistantId }: { wire: WireMessage[]; assistantId: string }) => {
      const controller = new AbortController();
      abortRef.current = controller;
      const modelId = store.get(modelIdAtom) ?? undefined;

      await streamChat({
        messages: wire,
        modelId,
        signal: controller.signal,
        onEvent: (event) => {
          switch (event.type) {
            case "searching":
              patch(assistantId, (m) => ({ ...m, searching: true }));
              break;
            case "delta":
              patch(assistantId, (m) => ({ ...m, text: m.text + event.text, searching: false }));
              break;
            case "sources":
              patch(assistantId, (m) => ({ ...m, sources: event.sources }));
              break;
            case "done":
              // Never overwrite a terminal error the stream already reported.
              patch(assistantId, (m) =>
                m.status === "error" ? m : { ...m, status: "done", searching: false },
              );
              break;
            case "error":
              patch(assistantId, (m) => ({
                ...m,
                status: "error",
                searching: false,
                error: event.message,
              }));
              break;
          }
        },
      });
    },
    onError: (error, { assistantId }) => {
      // Aborts resolve, not reject — so anything here is a real failure.
      const is503 = error instanceof ApiError && error.status === 503;
      patch(assistantId, (m) => ({
        ...m,
        status: "error",
        searching: false,
        error:
          error instanceof ApiError
            ? // An `ApiError` carries the backend's own message, which is more specific
              // than anything here — and untranslated, since the backend has no locale.
              error.message
            : t("connectionLost"),
        errorSwitchModel: is503,
      }));
    },
    onSettled: (_data, _error, { assistantId }) => {
      abortRef.current = null;
      setStreaming(false);
      // Settle a placeholder the stream left open (a clean abort mid-answer). An
      // abort with nothing streamed yet is an error, not an empty "done".
      patch(assistantId, (m) => {
        if (m.status !== "streaming") return m;
        return m.text.length > 0
          ? { ...m, status: "done", searching: false }
          : {
              ...m,
              status: "error",
              searching: false,
              error: t("stopped"),
            };
      });
    },
  });

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || store.get(isStreamingAtom)) return;

      const now = Date.now();
      const user: ChatMessage = { id: newId(), role: "user", text, status: "done", createdAt: now };
      const assistant: ChatMessage = {
        id: newId(),
        role: "assistant",
        text: "",
        status: "streaming",
        searching: false,
        createdAt: now + 1,
      };

      const wire = [
        ...toWire(store.get(messagesAtom)),
        { role: "user" as const, content: text },
      ].slice(-MAX_HISTORY_MESSAGES);

      setMessages((prev) => [...prev, user, assistant]);
      setStreaming(true);
      mutation.mutate({ wire, assistantId: assistant.id });
    },
    [store, setMessages, setStreaming, mutation],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retryLast = useCallback(() => {
    const messages = store.get(messagesAtom);
    const lastUser = messages.toReversed().find((m) => m.role === "user");
    if (!lastUser || store.get(isStreamingAtom)) return;
    // Drop the failed assistant turn(s) after the last user message, then resend it.
    const upToUser = messages.slice(0, messages.lastIndexOf(lastUser) + 1);
    setMessages(upToUser);
    setStreaming(true);
    const assistant: ChatMessage = {
      id: newId(),
      role: "assistant",
      text: "",
      status: "streaming",
      searching: false,
      createdAt: Date.now(),
    };
    setMessages((prev) => [...prev, assistant]);
    mutation.mutate({
      wire: toWire(upToUser).slice(-MAX_HISTORY_MESSAGES),
      assistantId: assistant.id,
    });
  }, [store, setMessages, setStreaming, mutation]);

  return { send, stop, retryLast, isStreaming };
}
