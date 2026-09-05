import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Ensures the parent directory of a `file:` libSQL URL exists.
 *
 * libSQL opens the database file but will not create the directory holding it, so a
 * fresh clone fails with `ConnectionFailed(... 14)` on the first `pnpm ingest` — the
 * default URLs point into `.mastra/`, which is gitignored and therefore absent.
 * Remote (`libsql://`, `http://`) URLs are returned untouched.
 */
export function prepareDbUrl(url: string): string {
  if (!url.startsWith("file:")) return url;

  const path = resolve(url.slice("file:".length));
  mkdirSync(dirname(path), { recursive: true });

  return url;
}
