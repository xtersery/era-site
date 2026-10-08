import { formatLead } from './message.ts';
import type { RateLimitStore } from './rateLimit.ts';
import { sendTelegram, type TelegramConfig } from './telegram.ts';
import { validateLead } from './validate.ts';

/**
 * POST /api/lead — the inquiry, delivered to the clinic's Telegram chat.
 *
 * Platform-neutral: a Web `Request` in, a Web `Response` out, so the same
 * handler runs under Vite (dev/preview, `server/vite.ts`), a plain Node
 * server (`server/node.ts`) and Vercel (`api/lead.ts`); Netlify, Cloudflare
 * Workers or Deno need a few lines of adapter (see `server/README.md`).
 *
 * The answer is a small JSON: `{ ok: true }` or `{ ok: false, error }` with
 *   400 invalid · 403 origin · 405 method · 413 too large · 415 type ·
 *   429 rate · 502 delivery (Telegram refused or did not answer) ·
 *   503 not-configured.
 *
 * LOGS carry the outcome and the status code only — never a field of the
 * request (names, phones and messages can be medical), never the token.
 */

export interface LeadEnv {
  readonly TELEGRAM_BOT_TOKEN?: string | undefined;
  readonly TELEGRAM_CHAT_ID?: string | undefined;
  /** override for tests — a local mock of the Bot API */
  readonly TELEGRAM_API_BASE?: string | undefined;
  /** comma-separated origins allowed to post, e.g. `https://era-clinic.ru`; empty = same host only */
  readonly LEAD_ALLOWED_ORIGINS?: string | undefined;
}

export interface LeadHandlerOptions {
  readonly env: LeadEnv;
  /**
   * Required, and explicit: `MemoryRateLimit` for one long-lived process,
   * `UpstashRateLimit` for serverless, `null` = OFF (logged once at start).
   * See `rateLimit.ts`.
   */
  readonly rateLimit: RateLimitStore | null;
  readonly fetch?: typeof fetch;
  readonly now?: () => number;
  readonly log?: (line: string) => void;
}

/** the request as a platform adapter sees it: the Web request and the client's address */
export type LeadHandler = (request: Request, clientIp: string) => Promise<Response>;

const MAX_BODY = 8 * 1024;
/** per address: 5 sends in 10 minutes; for the whole endpoint: 40 in 10 minutes */
const PER_IP = { limit: 5, windowMs: 10 * 60_000 };
const OVERALL = { limit: 40, windowMs: 10 * 60_000 };

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export function createLeadHandler(options: LeadHandlerOptions): LeadHandler {
  const { env } = options;
  const now = options.now ?? Date.now;
  const log = options.log ?? ((l: string) => console.warn(l));
  const { rateLimit } = options;
  if (!rateLimit)
    log('[lead] rate limiting is OFF — no shared store configured (bot protections still apply)');
  /** within the limits? A store that cannot be reached lets the lead through — a lost lead costs more than one spam message */
  const withinLimits = async (ip: string, t: number) => {
    if (!rateLimit) return true;
    try {
      return (
        (await rateLimit.take(`ip:${ip}`, PER_IP.limit, PER_IP.windowMs, t)) &&
        (await rateLimit.take('all', OVERALL.limit, OVERALL.windowMs, t))
      );
    } catch (error) {
      log(
        `[lead] rate-limit store unavailable (${error instanceof Error ? error.message : 'unknown'}) — allowed`,
      );
      return true;
    }
  };
  const allowed = (env.LEAD_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/u, ''))
    .filter(Boolean);

  const telegram: TelegramConfig | null =
    env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID
      ? {
          token: env.TELEGRAM_BOT_TOKEN,
          chatId: env.TELEGRAM_CHAT_ID,
          apiBase: (env.TELEGRAM_API_BASE || 'https://api.telegram.org').replace(/\/$/u, ''),
          fetch: options.fetch ?? fetch,
          timeoutMs: 8_000,
        }
      : null;

  const originOk = (request: Request) => {
    const origin = request.headers.get('origin');
    if (!origin) return false; // every browser sends it on a cross- or same-origin POST
    if (allowed.length) return allowed.includes(origin);
    try {
      return new URL(origin).host === (request.headers.get('host') ?? new URL(request.url).host);
    } catch {
      return false;
    }
  };

  return async (request, clientIp) => {
    if (request.method !== 'POST') {
      return new Response(null, { status: 405, headers: { allow: 'POST' } });
    }
    if (!originOk(request)) return json(403, { ok: false, error: 'origin' });
    if (!(request.headers.get('content-type') ?? '').startsWith('application/json'))
      return json(415, { ok: false, error: 'type' });

    const raw = await request.text().catch(() => null);
    if (raw === null) return json(400, { ok: false, error: 'invalid' });
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY)
      return json(413, { ok: false, error: 'too-large' });

    const t = now();
    if (!(await withinLimits(clientIp, t))) {
      log('[lead] rate limited');
      return json(429, { ok: false, error: 'rate' });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(400, { ok: false, error: 'invalid' });
    }

    const verdict = validateLead(body, t);
    if (verdict.kind === 'trap') {
      log('[lead] spam trap — not delivered');
      return json(200, { ok: true });
    }
    if (verdict.kind === 'invalid')
      return json(400, { ok: false, error: 'invalid', fields: verdict.fields });

    if (!telegram) {
      log('[lead] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID are not set — not delivered');
      return json(503, { ok: false, error: 'not-configured' });
    }

    const failure = await sendTelegram(telegram, formatLead(verdict.lead, new Date(t)));
    if (failure !== null) {
      log(`[lead] delivery failed: ${failure}`);
      return json(502, { ok: false, error: 'delivery' });
    }
    return json(200, { ok: true });
  };
}
