/**
 * Base URL for backend calls.
 *
 * In dev this is `/be` — a relative path the Vite proxy forwards to the backend, so the
 * app is same-origin and CORS never enters the picture. In a production build,
 * `VITE_API_BASE_URL` is baked in and must point at the backend's public origin (which
 * has to be in the backend's `CORS_ORIGINS`).
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "/be";

/** Backend caps the newest message at 2000 chars — mirror it so the UI can warn early. */
export const MAX_MESSAGE_LENGTH = 2000;

/** Backend rejects transcripts longer than this many messages. */
export const MAX_HISTORY_MESSAGES = 60;
