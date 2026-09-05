import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import { RESUME_INDEX } from "../rag/constants.js";
import { embedQuery } from "../rag/embedder.js";
import { chunkMetadataSchema } from "../rag/knowledge.js";
import { vectorStore } from "../rag/vector-store.js";

const inputSchema = z.object({
  query: z.string().min(1).describe("A natural-language question about Oleksii, in English."),
  topK: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe("How many passages to retrieve. Raise it for broad questions."),
});

const resultSchema = z.object({
  text: z.string(),
  source: z.string(),
  title: z.string(),
  /** Cosine similarity, 0–1. Useful for the agent to gauge how much to trust a passage. */
  score: z.number(),
});

const outputSchema = z.object({
  results: z.array(resultSchema),
});

export type ResumeSearchResult = z.infer<typeof resultSchema>;

/**
 * Drops passages the vector store considered only loosely related. Without a floor,
 * a question with no answer in the corpus still returns the five least-bad chunks,
 * and the model treats them as evidence.
 */
const MIN_SCORE = 0.4;

/** Shared so the chat route can recognise this tool's chunks in the agent stream. */
export const RESUME_SEARCH_TOOL_ID = "search-resume";

/**
 * Vector search over the CV + personal notes, shared by the agent tool and the chat
 * route's mandatory pre-answer retrieval. Kept as a plain function so grounding never
 * depends on the model choosing to call the tool — the smaller free-tier models skip
 * it often, especially on follow-up turns.
 */
export async function searchResume({
  query,
  topK = 5,
}: {
  query: string;
  topK?: number;
}): Promise<ResumeSearchResult[]> {
  const queryVector = await embedQuery(query);

  const matches = await vectorStore.query({ indexName: RESUME_INDEX, queryVector, topK });

  return matches.flatMap((match) => {
    if (match.score < MIN_SCORE) return [];

    // Metadata comes back as `Record<string, any>` from the store, so re-validate it
    // rather than trusting the shape written by a possibly older ingest run.
    const parsed = chunkMetadataSchema.safeParse(match.metadata);
    if (!parsed.success) return [];

    return [
      {
        text: parsed.data.text,
        source: parsed.data.source,
        title: parsed.data.title,
        score: match.score,
      },
    ];
  });
}

export const resumeSearchTool = createTool({
  id: RESUME_SEARCH_TOOL_ID,
  description:
    "Search Oleksii Kryshtopa's CV and personal knowledge base for passages relevant to a " +
    "question. Returns verbatim excerpts with their source file. Passages for the visitor's " +
    "latest question are already provided to you; call this only to look again with different " +
    "wording when those passages look thin or miss the question.",
  inputSchema,
  outputSchema,
  execute: async ({ query, topK }) => ({ results: await searchResume({ query, topK }) }),
});
