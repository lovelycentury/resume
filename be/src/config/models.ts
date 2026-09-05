import { z } from "zod";

/** Providers the backend knows how to instantiate. Adding one means extending `providers.ts`. */
export const providerSchema = z.enum(["google", "groq", "openrouter", "ollama"]);
export type Provider = z.infer<typeof providerSchema>;

export const modelInfoSchema = z.object({
  /** Stable public id — what the client sends and what URLs/analytics reference. */
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  provider: providerSchema,
  /** Provider-native model identifier, which often differs from our public `id`. */
  providerModel: z.string().min(1),
  contextWindow: z.number().int().positive(),
});

export type ModelInfo = z.infer<typeof modelInfoSchema>;

/**
 * Every model the chat can serve, all on their providers' free tiers.
 *
 * The per-entry limits were read off each provider's docs on 2026-09-01. They drift —
 * treat them as orientation for "which one runs out first", not as a contract. Every
 * provider signals exhaustion the same way (HTTP 429), which `/chat` surfaces as a 503
 * so the UI can offer another model.
 *
 * One limit applies no matter which entry is picked: retrieval embeds the visitor's
 * question with Google's `gemini-embedding-001` on *every* turn, so Google's quota is
 * the shared floor under the whole app.
 */
export const MODELS = [
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    description:
      "Google's fast multimodal model, with a 1M-token context window — the widest here.",
    provider: "google",
    providerModel: "gemini-3.6-flash",
    contextWindow: 1_048_576,
    // Limits: Google no longer publishes free-tier numbers — they're account-specific and
    // only visible at aistudio.google.com/rate-limit. This tier binds hardest in practice
    // because the embedding model draws on the same account: light manual testing already
    // produced `429 … global_embed_content_requests_per_minute_per_base_model`, plus
    // `503 UNAVAILABLE — high demand` on the chat model itself.
  },
  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B",
    description:
      "OpenAI's open-weight 120B model on Groq's LPUs — the fastest of the four, and the " +
      "free tier that has held up best under repeated testing.",
    provider: "groq",
    providerModel: "openai/gpt-oss-120b",
    contextWindow: 131_072,
    // Limits (Groq free): 30 req/min, 1 000 req/day, 8 000 tokens/min, 200 000 tokens/day.
    // Tokens run out long before requests — a grounded answer carries the retrieved
    // passages in the prompt, so 8k TPM is roughly two or three turns a minute. The 429
    // carries a `retry-after` header worth honouring.
  },
  {
    id: "minimax-m3",
    name: "MiniMax M3",
    description:
      "Strong general-purpose model with a 1M-token context. The default here, via " +
      "OpenRouter's free tier.",
    provider: "openrouter",
    providerModel: "minimax/minimax-m3:free",
    contextWindow: 1_048_576,
    // Limits (OpenRouter `:free` variants): 20 req/min, and only 50 req/day until the
    // account has ever bought $10 of credits — after that 1 000/day, permanently. On a
    // fresh key 50/day makes this a demo model, not something to leave as the default.
  },
  {
    id: "gemma-4-31b",
    name: "Gemma 4 31B",
    description: "Google's open-weight mid-size model, hosted on Ollama Cloud's free tier.",
    provider: "ollama",
    providerModel: "gemma4:31b",
    contextWindow: 262_144,
    // Limits (Ollama Cloud free): no published req/min or req/day — it's a monthly credit
    // allowance plus **one concurrent request**. That concurrency cap is the real
    // constraint for a public page: a second visitor queues behind the first's answer.
  },
] as const satisfies readonly ModelInfo[];

export type ModelId = (typeof MODELS)[number]["id"];

const MODELS_BY_ID = new Map<string, ModelInfo>(MODELS.map((model) => [model.id, model]));

/** Zod schema accepting only ids present in `MODELS` — reuse it in every request body. */
export const modelIdSchema = z.enum(MODELS.map((model) => model.id) as [ModelId, ...ModelId[]]);

export function getModel(id: string): ModelInfo | undefined {
  return MODELS_BY_ID.get(id);
}

export function listModels(): readonly ModelInfo[] {
  return MODELS;
}
