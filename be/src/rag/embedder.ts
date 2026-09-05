import { embed, embedMany } from "ai";

import { embeddingModel } from "../config/providers.js";
import { EMBEDDING_DIMENSION } from "./constants.js";

/**
 * Embedding helpers call the AI SDK directly rather than going through
 * `@mastra/rag`'s vector-query tool. That tool's `MastraEmbeddingModel` type only
 * accepts spec v1–v3 models, while `@ai-sdk/google@4` emits v4 — and going direct
 * also lets the retrieval tool own its own zod-validated output shape.
 */
const providerOptions = {
  google: { outputDimensionality: EMBEDDING_DIMENSION },
} as const;

/** Embeds stored documents. `RETRIEVAL_DOCUMENT` is the asymmetric counterpart to a query. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: texts,
    providerOptions: {
      google: { ...providerOptions.google, taskType: "RETRIEVAL_DOCUMENT" },
    },
  });

  return embeddings;
}

/**
 * Embeds a user question. Tagging it `RETRIEVAL_QUERY` is what makes short questions
 * match long passages — without it, a 6-word question and a 200-word CV paragraph land
 * in noticeably different regions of the space.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: embeddingModel,
    value: text,
    providerOptions: {
      google: { ...providerOptions.google, taskType: "RETRIEVAL_QUERY" },
    },
  });

  return embedding;
}
