import { registerApiRoute } from "@mastra/core/server";

import { RESUME_INDEX } from "../../rag/constants.js";
import { vectorStore } from "../../rag/vector-store.js";

/**
 * Reports whether the vector index exists and holds anything. A freshly cloned
 * checkout answers questions with a confident "I don't know" until `pnpm ingest`
 * has run, and this is the endpoint that explains why.
 */
export const healthRoute = registerApiRoute("/status", {
  method: "GET",
  openapi: {
    summary: "Knowledge-base readiness",
    description:
      "`200` when the vector index exists and holds vectors. `503` (with a `hint`) when " +
      "it is missing or empty — run `pnpm ingest` — or when the vector store is unreachable.",
    tags: ["resume"],
    responses: {
      200: {
        description: "Index is populated; the agent can answer.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["status", "knowledgeBase", "vectors"],
              properties: {
                status: { type: "string", enum: ["ok"] },
                knowledgeBase: { type: "string", enum: ["ready"] },
                vectors: { type: "integer" },
              },
            },
          },
        },
      },
      503: {
        description: "Index missing, empty, or unreachable.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["status"],
              properties: {
                status: { type: "string", enum: ["degraded", "error"] },
                knowledgeBase: { type: "string", enum: ["missing", "empty"] },
                hint: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
  handler: async (c) => {
    try {
      const indexes = await vectorStore.listIndexes();

      if (!indexes.includes(RESUME_INDEX)) {
        return c.json(
          { status: "degraded", knowledgeBase: "missing", hint: "Run `pnpm ingest`." },
          503,
        );
      }

      const stats = await vectorStore.describeIndex({ indexName: RESUME_INDEX });

      if (stats.count === 0) {
        return c.json(
          { status: "degraded", knowledgeBase: "empty", hint: "Run `pnpm ingest`." },
          503,
        );
      }

      return c.json({ status: "ok", knowledgeBase: "ready", vectors: stats.count });
    } catch (error) {
      return c.json(
        { status: "error", message: error instanceof Error ? error.message : "Unknown error" },
        503,
      );
    }
  },
});
