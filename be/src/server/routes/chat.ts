import { registerApiRoute } from "@mastra/core/server";
import { RequestContext } from "@mastra/core/request-context";
import { z } from "zod";

import { MODEL_ID_KEY } from "../../agents/resume-agent.js";
import { env } from "../../config/env.js";
import { modelIdSchema } from "../../config/models.js";
import { ModelUnavailableError } from "../../config/providers.js";
import {
  groundingContextMessage,
  groundingSources,
  retrieveGrounding,
} from "../../rag/grounding.js";
import { RESUME_SEARCH_TOOL_ID, type ResumeSearchResult } from "../../tools/resume-search.js";
import { clientKey, consume } from "../rate-limit.js";
import { type ChatEvent, encodeSse } from "../sse.js";

/**
 * The frontend owns conversation history (it lives in the visitor's `sessionStorage`)
 * and replays the whole transcript here on every turn — so the backend is stateless.
 *
 * Limits are deliberately tight: this is a visitor-facing endpoint, long inputs cost
 * tokens, and a real CV question is never a wall of text. Request *rate* is capped
 * separately, per IP — see `server/rate-limit.ts`.
 */
const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const chatRequestSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1, "At least one message is required.")
    .max(60, "Conversation is too long — start a new one.")
    .refine(
      (messages) => messages.at(-1)?.role === "user",
      "The last message must be from the user.",
    )
    .refine(
      (messages) => (messages.at(-1)?.content.length ?? 0) <= 2000,
      "The latest message is too long (2000 characters max).",
    ),
  modelId: modelIdSchema.optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const chatRoute = registerApiRoute("/chat", {
  method: "POST",
  openapi: {
    summary: "Ask the resume agent",
    description:
      "Streams the answer as Server-Sent Events. Each frame is one JSON object matching " +
      "`chatEventSchema` (`src/server/sse.ts`): `delta` | `searching` | `sources` | `done` | " +
      "`error`. Failures detectable before the stream starts — invalid body, unknown or " +
      "unconfigured model, provider unreachable — return JSON with a 4xx/5xx instead.",
    tags: ["resume"],
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["messages"],
            properties: {
              messages: {
                type: "array",
                minItems: 1,
                maxItems: 60,
                description:
                  "The whole transcript so far, oldest first. The last entry must be the " +
                  "user's new question (2000 chars max).",
                items: {
                  type: "object",
                  required: ["role", "content"],
                  properties: {
                    role: { type: "string", enum: ["user", "assistant"] },
                    content: { type: "string", minLength: 1, maxLength: 4000 },
                  },
                },
              },
              modelId: {
                type: "string",
                description: "One of the `/models` ids. Defaults to `DEFAULT_MODEL_ID`.",
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: "SSE stream of chat events.",
        content: {
          "text/event-stream": {
            schema: {
              type: "string",
              description:
                'Frames like `data: {"type":"delta","text":"…"}`, terminated by ' +
                '`data: {"type":"done"}` or `data: {"type":"error","message":"…"}`.',
            },
          },
        },
      },
      429: {
        description:
          "Per-IP rate limit exceeded. Carries `Retry-After` with the seconds until the " +
          "window frees up.",
        content: {
          "application/json": {
            schema: { type: "object", properties: { error: { type: "string" } } },
          },
        },
      },
      400: {
        description: "Request body failed validation.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { error: { type: "string" }, issues: { type: "object" } },
            },
          },
        },
      },
      502: {
        description: "The model could not be reached.",
        content: {
          "application/json": {
            schema: { type: "object", properties: { error: { type: "string" } } },
          },
        },
      },
      503: {
        description: "The chosen model's provider key is not configured.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: { error: { type: "string" }, modelId: { type: "string" } },
            },
          },
        },
      },
    },
  },
  handler: async (c) => {
    // First thing in the handler, before the body is even read: a flood should cost this
    // process a map lookup, not a parse and a provider call.
    const limit = consume(clientKey(c));

    if (!limit.allowed) {
      return c.json(
        { error: "Too many questions in a row. Give it a minute and try again." },
        429,
        { "Retry-After": String(limit.retryAfter) },
      );
    }

    const body = await c.req.json().catch(() => null);
    const parsed = chatRequestSchema.safeParse(body);

    if (!parsed.success) {
      return c.json({ error: "Invalid request", issues: z.treeifyError(parsed.error) }, 400);
    }

    const { messages, modelId } = parsed.data;
    const mastra = c.get("mastra");
    const logger = mastra.getLogger();
    const agent = mastra.getAgent("resume");

    // The agent's `model` factory reads this key to pick the provider for this request.
    const requestContext = new RequestContext();
    requestContext.set(MODEL_ID_KEY, modelId ?? env.DEFAULT_MODEL_ID);

    // Discriminated per item so each narrows to CoreUserMessage / CoreAssistantMessage
    // rather than a `{ role: "user" | "assistant" }` union the overloads reject.
    const coreMessages = messages.map((m) =>
      m.role === "user"
        ? ({ role: "user", content: m.content } as const)
        : ({ role: "assistant", content: m.content } as const),
    );

    // Grounding is mandatory and happens here, not left to the model: the smaller
    // free-tier models routinely skip `search-resume` — especially on follow-up turns,
    // where the replayed transcript convinces them they already know — and then answer
    // from imagination. Retrieve on the new question and inject the passages as context.
    let grounding: ResumeSearchResult[] = [];
    try {
      grounding = await retrieveGrounding(messages.at(-1)!.content);
    } catch (error) {
      // A retrieval failure (usually the shared Google embedding quota) must not sink
      // the whole answer — fall back to the agent's own `search-resume` tool.
      logger?.error("Pre-answer retrieval failed; falling back to tool-only grounding", { error });
    }

    const context = grounding.length > 0 ? [groundingContextMessage(grounding)] : [];

    let stream;
    try {
      // The whole transcript is passed through; the agent keeps no memory of its own.
      stream = await agent.stream(coreMessages, { requestContext, context });
    } catch (error) {
      // Failures available before the first byte are returned as normal JSON, so the
      // client can show a real error instead of an empty stream that just stops.
      if (error instanceof ModelUnavailableError) {
        return c.json({ error: error.message, modelId: error.modelId }, error.status);
      }

      logger?.error("Chat request failed to start", { error, modelId });
      return c.json({ error: "The model could not be reached. Try again or pick another." }, 502);
    }

    const sse = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: ChatEvent) => controller.enqueue(encodeSse(event));

        // `error` and `done` are mutually exclusive terminals — once one is sent, the
        // stream is closed and nothing else follows.
        let terminated = false;
        const finish = (event: ChatEvent) => {
          if (terminated) return;
          terminated = true;
          send(event);
        };

        // Citations are accumulated, not replaced: the mandatory pre-retrieval seeds
        // them, and a fallback `search-resume` call can only add to the list.
        const citedTitles = new Set<string>();
        const emitSources = (titles: string[]) => {
          const before = citedTitles.size;
          for (const title of titles) citedTitles.add(title);
          if (citedTitles.size > before) send({ type: "sources", sources: [...citedTitles] });
        };

        // Reflect the pre-answer retrieval in the UI exactly as a tool call would: a
        // "searching" affordance, then the sources it pulled.
        if (grounding.length > 0) {
          send({ type: "searching" });
          emitSources(groundingSources(grounding));
        }

        try {
          for await (const chunk of stream.fullStream) {
            if (terminated) break;
            switch (chunk.type) {
              case "text-delta":
                send({ type: "delta", text: chunk.payload.text });
                break;

              // Surfaced so the UI can show "searching the CV…" while retrieval runs,
              // which is most of the perceived latency on the first message.
              case "tool-call":
                if (chunk.payload.toolName === RESUME_SEARCH_TOOL_ID) {
                  send({ type: "searching" });
                }
                break;

              // Citations are derived server-side: the client should show the sources
              // that were actually retrieved, not ones the model claims it used.
              case "tool-result": {
                if (chunk.payload.toolName !== RESUME_SEARCH_TOOL_ID) break;

                emitSources(extractSources(chunk.payload.result));
                break;
              }

              case "error":
                logger?.error("Chat stream errored", { error: chunk.payload.error });
                finish({ type: "error", message: "The model stopped mid-answer. Try again." });
                break;

              default:
                break;
            }
          }

          finish({ type: "done" });
        } catch (error) {
          logger?.error("Chat stream aborted", { error, modelId });
          finish({ type: "error", message: "The model stopped mid-answer. Try again." });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(sse, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        // Tells nginx/Caddy not to buffer the response into whole chunks.
        "X-Accel-Buffering": "no",
      },
    });
  },
});

/** Tool output crosses an `unknown` boundary, so pull citations back out defensively. */
function extractSources(result: unknown): string[] {
  const shape = z.object({ results: z.array(z.object({ title: z.string() })) });
  const parsed = shape.safeParse(result);

  if (!parsed.success) return [];

  return [...new Set(parsed.data.results.map((entry) => entry.title))];
}
