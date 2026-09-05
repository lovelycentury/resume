import { z } from "zod";

/**
 * The wire protocol between `be` and `fe`.
 *
 * Mastra v1's `MastraModelOutput` has no `toUIMessageStreamResponse`, so rather than
 * reaching into its internal AI SDK converters this route defines its own small event
 * set. It is narrower than the AI SDK's UI-message protocol, and everything the chat UI
 * needs is here.
 *
 * The schema is exported so the `fe` app can import it and parse events with the same
 * definition the server writes them with.
 */
export const chatEventSchema = z.discriminatedUnion("type", [
  /** A piece of the answer. Concatenate in arrival order. */
  z.object({ type: z.literal("delta"), text: z.string() }),
  /** Retrieval started — show a "searching" affordance. */
  z.object({ type: z.literal("searching") }),
  /** Knowledge-base documents actually retrieved for this answer. */
  z.object({ type: z.literal("sources"), sources: z.array(z.string()) }),
  /** Terminal. No further events will arrive. */
  z.object({ type: z.literal("done") }),
  /** Terminal, and the answer is incomplete. Safe to display verbatim. */
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type ChatEvent = z.infer<typeof chatEventSchema>;

const encoder = new TextEncoder();

/**
 * Serialises one event as an SSE frame.
 *
 * The payload is JSON on a single line, so it can never contain the raw newline that
 * would otherwise terminate the frame early — an answer containing a blank line would
 * corrupt the stream if the text were written directly.
 */
export function encodeSse(event: ChatEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}
