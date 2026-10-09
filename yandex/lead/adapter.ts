import { createLeadHandler, type LeadHandlerOptions } from '../../server/lead/handler.ts';

/**
 * Yandex API Gateway → Cloud Function adapter for POST /lead. The adapter
 * only: the gateway's event becomes a Web `Request`, the shared handler
 * (`server/lead/` — validation, consent, honeypot, fill-time trap, origin,
 * rate limit, the message, the Telegram call, the logging rules) answers,
 * and its `Response` becomes the gateway's response object.
 *
 * Payload format 2.0 (the HTTP-API shape). The client's address is the
 * gateway's own `requestContext.http.sourceIp` — never a header the client
 * can write (`x-forwarded-for`, `x-real-ip`, …).
 *
 * CORS: the gateway answers OPTIONS; every application response here carries
 * `Access-Control-Allow-Origin` for an allowed origin, so the browser can
 * read the answer.
 */

export interface GatewayEvent {
  readonly version?: string;
  readonly rawPath?: string;
  readonly rawQueryString?: string;
  readonly headers?: Readonly<Record<string, string | undefined>> | null;
  readonly body?: string | null;
  readonly isBase64Encoded?: boolean;
  readonly requestContext?: {
    readonly domainName?: string;
    readonly http?: {
      readonly method?: string;
      readonly path?: string;
      readonly sourceIp?: string;
    };
  };
}

export interface GatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded: false;
}

export type GatewayHandler = (event: GatewayEvent) => Promise<GatewayResponse>;

/** the production page; `LEAD_ALLOWED_ORIGINS`, when set, replaces this list */
export const DEFAULT_ALLOWED_ORIGINS = 'https://www.era-cosmetology.ru';
const FALLBACK_HOST = 'api.era-cosmetology.ru';

const origins = (list: string) =>
  list
    .split(',')
    .map((o) => o.trim().replace(/\/$/u, ''))
    .filter(Boolean);

export function createGatewayHandler(options: LeadHandlerOptions): GatewayHandler {
  // the gateway's host is not the page's, so «same host only» would refuse every
  // browser — an explicit list always applies here
  const allowedList = options.env.LEAD_ALLOWED_ORIGINS?.trim() || DEFAULT_ALLOWED_ORIGINS;
  const allowed = new Set(origins(allowedList));
  const lead = createLeadHandler({
    ...options,
    env: { ...options.env, LEAD_ALLOWED_ORIGINS: allowedList },
  });

  return async (event) => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(event.headers ?? {}))
      if (typeof value === 'string') headers.set(key, value);

    const method = (event.requestContext?.http?.method ?? 'GET').toUpperCase();
    const host = headers.get('host') ?? event.requestContext?.domainName ?? FALLBACK_HOST;
    const path = event.rawPath ?? event.requestContext?.http?.path ?? '/lead';
    const query = event.rawQueryString ? `?${event.rawQueryString}` : '';
    const body =
      method === 'GET' || method === 'HEAD' || event.body == null
        ? undefined
        : event.isBase64Encoded
          ? Buffer.from(event.body, 'base64').toString('utf8')
          : event.body;

    let request: Request;
    try {
      request = new Request(`https://${host}${path}${query}`, { method, headers, body });
    } catch {
      return toGateway(new Response(null, { status: 400 }), null);
    }
    const sourceIp = event.requestContext?.http?.sourceIp?.trim() || 'unknown';
    const response = await lead(request, sourceIp);

    const origin = headers.get('origin');
    return toGateway(response, origin !== null && allowed.has(origin) ? origin : null);
  };
}

async function toGateway(response: Response, allowOrigin: string | null): Promise<GatewayResponse> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => (headers[key] = value));
  if (allowOrigin) headers['access-control-allow-origin'] = allowOrigin;
  headers['vary'] = 'Origin';
  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
    isBase64Encoded: false,
  };
}
