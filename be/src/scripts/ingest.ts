import { EMBEDDING_DIMENSION, RESUME_INDEX } from "../rag/constants.js";
import { embedDocuments } from "../rag/embedder.js";
import { loadKnowledgeChunks } from "../rag/knowledge.js";
import { vectorStore } from "../rag/vector-store.js";

/** Google's embedding endpoint rejects oversized batches, so send them in slices. */
const BATCH_SIZE = 64;

/**
 * Rebuilds the index from scratch on every run.
 *
 * The corpus is small enough that a full re-embed costs seconds, and dropping first is
 * the only way to guarantee no stale vectors survive — editing a knowledge file changes
 * the chunk boundaries, so an in-place upsert would leave orphaned chunks behind that
 * still match queries and would be cited as fact.
 */
async function recreateIndex(): Promise<void> {
  const indexes = await vectorStore.listIndexes();

  if (indexes.includes(RESUME_INDEX)) {
    await vectorStore.deleteIndex({ indexName: RESUME_INDEX });
  }

  await vectorStore.createIndex({
    indexName: RESUME_INDEX,
    dimension: EMBEDDING_DIMENSION,
    metric: "cosine",
  });
}

/** This is a CLI, so progress goes to stdout rather than through the app logger. */
const report = (message: string) => process.stdout.write(`${message}\n`);

async function main(): Promise<void> {
  report("Loading knowledge files…");
  const chunks = await loadKnowledgeChunks();
  const fileCount = new Set(chunks.map((chunk) => chunk.source)).size;
  report(`  ${chunks.length} chunks across ${fileCount} files`);

  await recreateIndex();

  report("Embedding and upserting…");
  for (let offset = 0; offset < chunks.length; offset += BATCH_SIZE) {
    const batch = chunks.slice(offset, offset + BATCH_SIZE);
    const vectors = await embedDocuments(batch.map((chunk) => chunk.text));

    await vectorStore.upsert({
      indexName: RESUME_INDEX,
      vectors,
      // Safe to be positional: `recreateIndex` dropped everything first.
      ids: batch.map((_, index) => `chunk-${offset + index}`),
      metadata: batch,
    });

    report(`  ${Math.min(offset + BATCH_SIZE, chunks.length)}/${chunks.length}`);
  }

  const stats = await vectorStore.describeIndex({ indexName: RESUME_INDEX });
  report(`Done. Index "${RESUME_INDEX}" holds ${stats.count} vectors.`);
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    process.stderr.write(`Ingest failed: ${error instanceof Error ? error.stack : error}\n`);
    process.exit(1);
  });
