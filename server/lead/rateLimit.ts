/**
 * Rate limiting behind one interface, so each host gets a store that is
 * honest about its scope:
 *
 *   MemoryRateLimit   one long-lived process — Vite dev/preview, a Node
 *                     server, a container. Exact for that process.
 *   UpstashRateLimit  shared across every serverless instance — Upstash
 *                     Redis over its REST API (plain `fetch`, no package).
 *                     The store for Vercel.
 *   null              no shared store configured: rate limiting is OFF and
 *                     the endpoint says so in its log at start-up; the bot
 *                     protections (origin, honeypot, fill time, size) still
 *                     apply. Never per-instance memory on serverless — that
 *                     would look like a limit and not be one.
 */
export interface RateLimitStore {
  /** records a hit for `key` and says whether it is within `limit` per `windowMs` */
  take(key: string, limit: number, windowMs: number, now: number): Promise<boolean>;
}

/** a sliding window in this process's memory */
export class MemoryRateLimit implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();

  take(key: string, limit: number, windowMs: number, now: number): Promise<boolean> {
    const k = `${key}|${windowMs}`;
    const since = now - windowMs;
    const recent = (this.hits.get(k) ?? []).filter((t) => t > since);
    const allowed = recent.length < limit;
    if (allowed) recent.push(now);
    this.hits.set(k, recent);
    if (this.hits.size > 10_000) {
      for (const [key2, times] of this.hits)
        if (!times.some((t) => t > since)) this.hits.delete(key2);
    }
    return Promise.resolve(allowed);
  }
}

export interface UpstashConfig {
  /** `https://….upstash.io` — `UPSTASH_REDIS_REST_URL` or Vercel's `KV_REST_API_URL` */
  readonly url: string;
  /** `UPSTASH_REDIS_REST_TOKEN` or `KV_REST_API_TOKEN` */
  readonly token: string;
  readonly fetch?: typeof fetch;
}

/**
 * A fixed window in Upstash Redis: one key per (address, window), INCR and
 * PEXPIRE in one pipelined request. The address is stored hashed, never as
 * written. Throws when the store cannot be reached — the handler decides
 * what that means (it lets the lead through: a lost lead costs more than a
 * spam message).
 */
export class UpstashRateLimit implements RateLimitStore {
  private readonly config: UpstashConfig;

  constructor(config: UpstashConfig) {
    this.config = config;
  }

  async take(key: string, limit: number, windowMs: number, now: number): Promise<boolean> {
    const bucket = Math.floor(now / windowMs);
    const id = `era:lead:${await sha256(key)}:${windowMs}:${bucket}`;
    const res = await (this.config.fetch ?? fetch)(
      `${this.config.url.replace(/\/$/u, '')}/pipeline`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.token}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', id],
          ['PEXPIRE', id, String(windowMs)],
        ]),
        signal: AbortSignal.timeout(2_000),
      },
    );
    if (!res.ok) throw new Error(`upstash status ${res.status}`);
    const [incr] = (await res.json()) as [{ result?: unknown; error?: unknown }?];
    if (typeof incr?.result !== 'number') throw new Error('upstash bad reply');
    return incr.result <= limit;
  }
}

/** the shared store from the environment, or `null` when none is configured */
export function upstashFromEnv(env: Record<string, string | undefined>): UpstashRateLimit | null {
  const url = env['UPSTASH_REDIS_REST_URL'] || env['KV_REST_API_URL'];
  const token = env['UPSTASH_REDIS_REST_TOKEN'] || env['KV_REST_API_TOKEN'];
  return url && token ? new UpstashRateLimit({ url, token }) : null;
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
}
