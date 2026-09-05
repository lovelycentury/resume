import { API_BASE_URL } from "../config/env.js";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Parsed JSON body, when the server sent one. */
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Pulls the most useful human-readable string out of the backend's error JSON. */
function messageFromBody(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
    return body.error;
  }
  return fallback;
}

/** `fetch` against the backend that throws {@link ApiError} on a non-2xx JSON response. */
export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { signal });

  const body: unknown = await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new ApiError(messageFromBody(body, `${res.status} ${res.statusText}`), res.status, body);
  }
  return body as T;
}
