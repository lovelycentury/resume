import { createContext, useContext, type ReactNode } from "react";

import { useChat } from "./useChat.js";

type ChatController = ReturnType<typeof useChat>;

const ChatContext = createContext<ChatController | null>(null);

/**
 * One `useChat` instance for the whole app — the sidebar's starter prompts and the
 * composer both drive the same engine (and the same in-flight mutation).
 */
export function ChatProvider({ children }: { children: ReactNode }) {
  const controller = useChat();
  return <ChatContext.Provider value={controller}>{children}</ChatContext.Provider>;
}

export function useChatController(): ChatController {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatController must be used within <ChatProvider>");
  return ctx;
}
