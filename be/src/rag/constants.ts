/** Vector index holding every chunk of the CV and the surrounding facts. */
export const RESUME_INDEX = "resume_knowledge";

/**
 * Output dimensionality requested from `gemini-embedding-001`.
 *
 * 1536 is the sweet spot: it keeps recall close to the 3072 default at half the
 * storage. Changing this requires dropping the index and re-running `pnpm ingest`,
 * because existing vectors have a fixed width.
 */
export const EMBEDDING_DIMENSION = 1536;

/** Name under which the vector store is registered on the Mastra instance. */
export const VECTOR_STORE_NAME = "resumeVector";
