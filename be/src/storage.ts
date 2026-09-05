import { LibSQLStore } from "@mastra/libsql";

import { prepareDbUrl } from "./config/db-url.js";
import { env } from "./config/env.js";

/**
 * Backs Mastra's own telemetry / eval / trace tables. Conversation history is NOT here —
 * the frontend owns that (sessionStorage) and the agent is stateless. Kept in a separate
 * database from the vector index so re-running `pnpm ingest` (which drops and rebuilds
 * the index) can't touch it.
 */
export const storage = new LibSQLStore({
  id: "resume-storage",
  url: prepareDbUrl(env.STORAGE_DB_URL),
  authToken: env.STORAGE_DB_AUTH_TOKEN,
});
