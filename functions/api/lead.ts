import { PROXY_IP_HEADER, PROXY_SECRET_HEADER } from '../../server/lead/proxy.ts';

/**
 * Cloudflare Pages Function — POST /api/lead. A proxy only: it forwards the
 * inquiry to the existing Vercel Function, which keeps validation, bot
 * protection, rate limiting and the Telegram call (`server/lead/`). No
 * Telegram secret lives here — TELEGRAM_BOT_TOKEN stays in Vercel's
 * environment.
 *
 * The page posts same-origin, exactly as on Vercel, so the frontend is
 * unchanged. This side checks that the request comes from its own page,
 * then presents it upstream as the production origin, which Vercel's
 * `LEAD_ALLOWED_ORIGINS` admits.
 *
 * The upstream is the Vercel deployment's own domain, not the custom domain:
 * with era-cosmetology.ru pointed at Cloudflare, this proxy must not call
 * itself.
 *
 * Vercel sees Cloudflare's address, so the visitor's (`cf-connecting-ip`)
 * goes along with `LEAD_PROXY_SECRET`, the secret both deployments share —
 * Vercel trusts the address only with it (`server/lead/proxy.ts`). Without
 * the secret the lead still goes through, with every visitor in one
 * rate-limit bucket.
 */

interface Env {
  readonly LEAD_PROXY_SECRET?: string;
}

const UPSTREAM = 'https://era-site-eight.vercel.app/api/lead';
const UPSTREAM_ORIGIN = 'https://www.era-cosmetology.ru';
const MAX_BODY = 8 * 1024;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const sameOrigin = (request: Request) => {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
};

export async function onRequest({
  request,
  env,
}: {
  request: Request;
  env: Env;
}): Promise<Response> {
  if (request.method !== 'POST')
    return new Response(null, { status: 405, headers: { allow: 'POST' } });
  if (!sameOrigin(request)) return json(403, { ok: false, error: 'origin' });

  const body = await request.text().catch(() => null);
  if (body === null) return json(400, { ok: false, error: 'invalid' });
  if (new TextEncoder().encode(body).byteLength > MAX_BODY)
    return json(413, { ok: false, error: 'too-large' });

  const headers: Record<string, string> = {
    'content-type': request.headers.get('content-type') ?? '',
    origin: UPSTREAM_ORIGIN,
  };
  const visitor = request.headers.get('cf-connecting-ip');
  if (env.LEAD_PROXY_SECRET && visitor) {
    headers[PROXY_SECRET_HEADER] = env.LEAD_PROXY_SECRET;
    headers[PROXY_IP_HEADER] = visitor;
  }

  try {
    const upstream = await fetch(UPSTREAM, { method: 'POST', headers, body });
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return json(502, { ok: false, error: 'delivery' });
  }
}
