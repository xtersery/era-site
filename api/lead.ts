import { createLeadHandler } from '../server/lead/handler.ts';
import { proxiedClientIp } from '../server/lead/proxy.ts';
import { upstashFromEnv } from '../server/lead/rateLimit.ts';

/**
 * Vercel Function — POST /api/lead. The adapter only: the request, the
 * client's address, the environment. Validation, consent, bot protection,
 * the message and the Telegram call are all `server/lead/`.
 *
 * Rate limiting needs a store shared by every instance: Upstash Redis
 * (`UPSTASH_REDIS_REST_URL` + `_TOKEN`, or the Vercel integration's
 * `KV_REST_API_URL` + `_TOKEN`). Without one it is OFF — logged at cold
 * start — and the bot protections carry the endpoint (server/README.md).
 *
 * Created at module scope: a warm instance reuses it.
 */
const handler = createLeadHandler({ env: process.env, rateLimit: upstashFromEnv(process.env) });

/**
 * Vercel's edge sets `x-real-ip` and overwrites `x-forwarded-for` with the
 * client's address, so either can be trusted here (unlike behind an
 * arbitrary proxy — see `server/node.ts → trustProxy`). Through the
 * Cloudflare Pages front that address is Cloudflare's; the front then sends
 * the visitor's, trusted only with `LEAD_PROXY_SECRET` (`server/lead/proxy.ts`).
 */
const clientIp = (request: Request) =>
  proxiedClientIp(request, process.env['LEAD_PROXY_SECRET']) ??
  request.headers.get('x-real-ip') ??
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
  'unknown';

export function POST(request: Request): Promise<Response> {
  return handler(request, clientIp(request));
}
