import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { API_BASE_URL } from "../config/env.js";

const statusSchema = z.object({
  status: z.enum(["ok", "degraded", "error"]),
  knowledgeBase: z.enum(["ready", "missing", "empty"]).optional(),
  vectors: z.number().optional(),
  hint: z.string().optional(),
  message: z.string().optional(),
});

export type BackendStatus = z.infer<typeof statusSchema>;

/**
 * `/status` returns 503 when the knowledge base hasn't been ingested — that's a normal
 * state to render, not a fetch failure, so this reads the body regardless of HTTP code.
 */
async function fetchStatus(signal?: AbortSignal): Promise<BackendStatus> {
  const res = await fetch(`${API_BASE_URL}/status`, { signal });
  return statusSchema.parse(await res.json());
}

/** Polls readiness so the UI can warn when answers will be "I don't know". */
export function useStatus() {
  return useQuery({
    queryKey: ["status"],
    queryFn: ({ signal }) => fetchStatus(signal),
    staleTime: 30_000,
    refetchInterval: (query) => (query.state.data?.knowledgeBase === "ready" ? false : 20_000),
    retry: 1,
  });
}
