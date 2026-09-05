import { registerApiRoute } from "@mastra/core/server";

import { env } from "../../config/env.js";
import { listModels } from "../../config/models.js";
import { isProviderConfigured } from "../../config/providers.js";

const modelSchema = {
  type: "object",
  required: ["id", "name", "description", "provider", "contextWindow", "available"],
  properties: {
    id: { type: "string", example: "gemini-3.6-flash" },
    name: { type: "string" },
    description: { type: "string" },
    provider: { type: "string", enum: ["google", "groq", "openrouter", "ollama"] },
    contextWindow: { type: "integer" },
    available: {
      type: "boolean",
      description: "False when the provider's API key is unset — the picker should disable it.",
    },
  },
} as const;

/**
 * Feeds the model picker in the `fe` app. `available` reflects whether the provider's
 * key is actually set, so the UI can disable a model instead of letting a visitor
 * pick one that will fail on send.
 */
export const modelsRoute = registerApiRoute("/models", {
  method: "GET",
  openapi: {
    summary: "List the model registry",
    description: "Every chat model the backend can serve, plus which one is the default.",
    tags: ["resume"],
    responses: {
      200: {
        description: "The model registry.",
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["defaultModelId", "models"],
              properties: {
                defaultModelId: { type: "string", example: "minimax-m3" },
                models: { type: "array", items: modelSchema },
              },
            },
          },
        },
      },
    },
  },
  handler: (c) =>
    c.json({
      defaultModelId: env.DEFAULT_MODEL_ID,
      models: listModels().map((model) => ({
        id: model.id,
        name: model.name,
        description: model.description,
        provider: model.provider,
        contextWindow: model.contextWindow,
        available: isProviderConfigured(model.provider),
      })),
    }),
});
