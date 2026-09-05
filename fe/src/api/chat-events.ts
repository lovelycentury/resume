import { z } from "zod";

/**
 * The `/chat` SSE wire protocol.
 *
 * This is a hand-kept mirror of `chatEventSchema` in the backend's `src/server/sse.ts`.
 * The two packages don't share a module, so if you change one, change the other — the
 * shapes are small and stable by design.
 */
export const chatEventSchema = z.discriminatedUnion("type", [
  /** A piece of the answer. Concatenate in arrival order. */
  z.object({ type: z.literal("delta"), text: z.string() }),
  /** Retrieval started — show a "searching" affordance. */
  z.object({ type: z.literal("searching") }),
  /** Knowledge-base documents actually retrieved for this answer. */
  z.object({ type: z.literal("sources"), sources: z.array(z.string()) }),
  /** Terminal. The answer is complete. */
  z.object({ type: z.literal("done") }),
  /** Terminal, and the answer is incomplete. Safe to show verbatim. */
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type ChatEvent = z.infer<typeof chatEventSchema>;
