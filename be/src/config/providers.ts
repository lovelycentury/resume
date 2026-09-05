import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
// `MastraModelConfig` is the authoring-side type (a raw AI SDK model); the exported
// `LanguageModel` alias is Mastra's internally-wrapped shape and rejects provider output.
import type { MastraModelConfig } from "@mastra/core/llm";
import type { EmbeddingModel } from "ai";
import { createOllama } from "ollama-ai-provider-v2";

import { env } from "./env.js";
import { getModel, type ModelInfo, type Provider } from "./models.js";

/**
 * Provider clients are created once and reused. They are cheap objects, but a
 * single instance keeps connection pooling and retry state shared across requests.
 */
const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });

const groq = env.GROQ_API_KEY ? createGroq({ apiKey: env.GROQ_API_KEY }) : undefined;

const openrouter = env.OPENROUTER_API_KEY
  ? createOpenRouter({ apiKey: env.OPENROUTER_API_KEY })
  : undefined;

// Ollama Cloud. Constructed unconditionally — the key is only an Authorization header.
const ollama = createOllama({
  baseURL: env.OLLAMA_BASE_URL,
  headers: env.OLLAMA_API_KEY ? { Authorization: `Bearer ${env.OLLAMA_API_KEY}` } : undefined,
});

/** Env var a user must set to unlock each provider, for error messages. */
const REQUIRED_KEY: Record<Provider, string | null> = {
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  ollama: null,
};

export class ModelUnavailableError extends Error {
  constructor(
    message: string,
    readonly modelId: string,
    /** HTTP status the route layer should surface. */
    readonly status: 400 | 503,
  ) {
    super(message);
    this.name = "ModelUnavailableError";
  }
}

/** Providers whose credentials are present, so the client can grey out the rest. */
export function isProviderConfigured(provider: Provider): boolean {
  switch (provider) {
    case "google":
      return true;
    case "groq":
      return groq !== undefined;
    case "openrouter":
      return openrouter !== undefined;
    case "ollama":
      return true;
  }
}

function toLanguageModel(model: ModelInfo): MastraModelConfig {
  switch (model.provider) {
    case "google":
      return google(model.providerModel);
    case "groq":
      if (!groq) break;
      return groq(model.providerModel);
    case "openrouter":
      if (!openrouter) break;
      return openrouter.chat(model.providerModel);
    case "ollama":
      return ollama(model.providerModel);
  }

  throw new ModelUnavailableError(
    `Model "${model.id}" needs ${REQUIRED_KEY[model.provider]} to be set.`,
    model.id,
    503,
  );
}

/**
 * Resolves a public model id to a ready-to-use language model.
 *
 * Throws `ModelUnavailableError` for unknown ids (400) and for known models whose
 * provider key is missing (503) — the route layer maps both onto a JSON error.
 */
export function resolveLanguageModel(modelId: string): MastraModelConfig {
  const model = getModel(modelId);

  if (!model) {
    throw new ModelUnavailableError(`Unknown model id "${modelId}".`, modelId, 400);
  }

  return toLanguageModel(model);
}

/**
 * Embedding model backing the vector store.
 *
 * This must stay in lockstep with `EMBEDDING_DIMENSION` and with whatever was used
 * at ingest time — changing either one invalidates the index and requires a re-ingest.
 */
// The annotation is required: the inferred `EmbeddingModelV4` lives in a pnpm-hoisted
// path that TypeScript cannot name from here.
export const embeddingModel: EmbeddingModel = google.embeddingModel("gemini-embedding-001");
