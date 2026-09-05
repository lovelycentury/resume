import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiGet } from "./http.js";

const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  // Mirrors `providerSchema` in the backend's src/config/models.ts.
  provider: z.enum(["google", "groq", "openrouter", "ollama"]),
  contextWindow: z.number(),
  /** False when the provider's API key is unset on the backend — the picker disables it. */
  available: z.boolean(),
});

const modelsResponseSchema = z.object({
  defaultModelId: z.string(),
  models: z.array(modelSchema),
});

export type ModelInfo = z.infer<typeof modelSchema>;
export type ModelsResponse = z.infer<typeof modelsResponseSchema>;

async function fetchModels(signal?: AbortSignal): Promise<ModelsResponse> {
  return modelsResponseSchema.parse(await apiGet("/models", signal));
}

/** The model registry. Static per deployment, so it's cached hard. */
export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: ({ signal }) => fetchModels(signal),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
