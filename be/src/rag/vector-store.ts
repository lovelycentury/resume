import { LibSQLVector } from "@mastra/libsql";

import { prepareDbUrl } from "../config/db-url.js";
import { env } from "../config/env.js";

/**
 * libSQL is used rather than pgvector so the whole RAG stack runs from a single
 * local file with no container to start. The same code points at Turso in
 * production by swapping `VECTOR_DB_URL` for a `libsql://` URL plus an auth token.
 */
export const vectorStore = new LibSQLVector({
  id: "resume-vector",
  url: prepareDbUrl(env.VECTOR_DB_URL),
  authToken: env.VECTOR_DB_AUTH_TOKEN,
});
