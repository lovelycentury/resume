import { z } from "zod";

/**
 * A `KEY=` line in a `.env` (common when copying `.env.example` and filling in only
 * some values) parses as `""`, not `undefined` — so `.optional()` and `.default()`
 * would not kick in. Coerce blank/whitespace to `undefined` first.
 */
const blankAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => {
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, schema);

/**
 * Provider keys are optional individually: you only need the key for the providers
 * whose models you actually intend to serve. `resolveLanguageModel` turns a missing
 * key into a clear 4xx/503 at request time instead of a cryptic provider 401.
 *
 * The Google key is the one exception — it also powers embeddings, so both
 * ingestion and retrieval fail without it.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5300),

  /** Required: used for chat *and* for the embedding model backing the vector store. */
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1, "required — it also powers embeddings"),

  GROQ_API_KEY: blankAsUndefined(z.string().min(1).optional()),
  OPENROUTER_API_KEY: blankAsUndefined(z.string().min(1).optional()),
  /** Ollama Cloud API key, for the hosted `ollama` provider. */
  OLLAMA_API_KEY: blankAsUndefined(z.string().min(1).optional()),
  OLLAMA_BASE_URL: blankAsUndefined(z.url().default("https://ollama.com/api")),

  /** libSQL/Turso connection. `file:` URLs keep everything on local disk. */
  VECTOR_DB_URL: blankAsUndefined(z.string().min(1).default("file:./.mastra/resume-vector.db")),
  VECTOR_DB_AUTH_TOKEN: blankAsUndefined(z.string().min(1).optional()),
  STORAGE_DB_URL: blankAsUndefined(z.string().min(1).default("file:./.mastra/resume-storage.db")),
  STORAGE_DB_AUTH_TOKEN: blankAsUndefined(z.string().min(1).optional()),

  /** Default model id served when a request does not pick one. Validated against MODELS. */
  DEFAULT_MODEL_ID: blankAsUndefined(z.string().default("minimax-m3")),

  /**
   * Requests one IP may make to `/chat` per minute. The endpoint is public and every
   * turn costs an embedding call plus an LLM call against a shared free-tier quota, so
   * this is what stops one caller from taking the site down for everyone.
   */
  CHAT_RATE_LIMIT: z.coerce.number().int().positive().default(40),

  /**
   * Whether an `X-Forwarded-For` header can be believed — true only when a reverse proxy
   * in front of this server sets it. Left false, the limiter uses the socket address,
   * because a caller-supplied header would otherwise be a free bypass.
   */
  TRUST_PROXY: blankAsUndefined(z.enum(["true", "false"]).default("false")).transform(
    (value) => value === "true",
  ),

  /** Comma-separated allowlist of browser origins for the `fe` app. */
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\n\nSee .env.example.`);
  }

  return parsed.data;
}

export const env = loadEnv();
