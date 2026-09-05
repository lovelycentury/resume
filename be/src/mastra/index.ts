import { Mastra } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";

import { resumeAgent } from "../agents/resume-agent.js";
import { env } from "../config/env.js";
import { VECTOR_STORE_NAME } from "../rag/constants.js";
import { vectorStore } from "../rag/vector-store.js";
import { chatRoute } from "../server/routes/chat.js";
import { healthRoute } from "../server/routes/health.js";
import { modelsRoute } from "../server/routes/models.js";
import { storage } from "../storage.js";

/**
 * Mastra's own Hono server handles HTTP here — Fastify would mean running a second
 * process just to proxy into this one, since Mastra already provides routing, streaming,
 * CORS, and the agent playground at `/`. Custom endpoints are plain routes below.
 */
export const mastra = new Mastra({
  agents: { resume: resumeAgent },
  vectors: { [VECTOR_STORE_NAME]: vectorStore },
  storage,
  logger: new PinoLogger({
    name: "resume-be",
    level: env.NODE_ENV === "production" ? "info" : "debug",
  }),
  server: {
    port: env.PORT,
    apiRoutes: [chatRoute, modelsRoute, healthRoute],
    cors: {
      origin: env.CORS_ORIGINS,
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type"],
    },
    // Spec at GET /api/openapi.json, Swagger UI at GET /swagger-ui. Both list the
    // custom routes above (via their `openapi` blocks) plus Mastra's built-ins.
    build: { openAPIDocs: true, swaggerUI: true },
  },
});
