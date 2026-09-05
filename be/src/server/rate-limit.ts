import { env } from "../config/env.js";

/**
 * The slice of Hono's context this needs, described structurally: `be` only sees `hono`
 * transitively through `@mastra/core`, and adding it as a direct dependency to name one
 * type would be a real version to keep in step for no gain.
 */
interface RequestLike {
  req: { header(name: string): string | undefined };
  env?: unknown;
}

/** One minute, fixed. The configurable part is how many requests fit in it. */
const WINDOW_MS = 60_000;

/**
 * Timestamps of recent requests, newest last, per client key. A sliding window rather
 * than a fixed one: a fixed window lets a caller land the full allowance twice across a
 * boundary — 80 requests in the two seconds either side of a minute mark — which is
 * exactly the burst a provider's per-minute token budget cannot absorb.
 *
 * At most `CHAT_RATE_LIMIT` numbers per active client, so the cost is negligible; the
 * sweep below is what keeps the map itself from becoming the leak.
 */
const hits = new Map<string, number[]>();

/**
 * Drops clients that have gone quiet. Without this, every distinct source address ever
 * seen stays in memory forever — an open endpoint keyed by caller-controlled values is
 * its own slow denial of service. `unref` so this timer never holds the process open.
 */
const sweep = setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, times] of hits) {
    if ((times.at(-1) ?? 0) <= cutoff) hits.delete(key);
  }
}, WINDOW_MS);
sweep.unref?.();

/** Node reports IPv4 clients as `::ffff:1.2.3.4`; count them as one client, not two. */
function normalize(address: string): string {
  return address.startsWith("::ffff:") ? address.slice(7) : address;
}

/** `@hono/node-server` puts the raw request on `c.env`; nothing else exposes the socket. */
function socketAddress(c: RequestLike): string | undefined {
  const runtime = c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined;
  return runtime?.incoming?.socket?.remoteAddress;
}

/**
 * Who to count this request against.
 *
 * `X-Forwarded-For` is only consulted when `TRUST_PROXY` says a proxy actually sets it.
 * The header is caller-supplied: honouring it on a directly exposed server would let
 * anyone send a fresh value per request and never reach the limit at all — a limiter that
 * can be opted out of is worse than none, because it reads as protection.
 *
 * If the address cannot be determined, everything falls into one shared bucket. That caps
 * the whole endpoint rather than letting it through: the point of this limiter is
 * protecting a shared provider quota, so the safe direction on failure is fewer calls.
 */
export function clientKey(c: RequestLike): string {
  if (env.TRUST_PROXY) {
    const forwarded = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded) return normalize(forwarded);

    const real = c.req.header("x-real-ip")?.trim();
    if (real) return normalize(real);
  }

  const socket = socketAddress(c);
  return socket ? normalize(socket) : "unidentified";
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the oldest hit leaves the window. Only meaningful when blocked. */
  retryAfter: number;
  remaining: number;
}

/** Records a request against `key` and reports whether it may proceed. */
export function consume(key: string): RateLimitResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const recent = (hits.get(key) ?? []).filter((at) => at > cutoff);

  if (recent.length >= env.CHAT_RATE_LIMIT) {
    hits.set(key, recent);
    const oldest = recent[0] ?? now;
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000)),
      remaining: 0,
    };
  }

  recent.push(now);
  hits.set(key, recent);

  return { allowed: true, retryAfter: 0, remaining: env.CHAT_RATE_LIMIT - recent.length };
}
