import { upstashFromEnv } from '../../server/lead/rateLimit.ts';
import { createGatewayHandler, type GatewayEvent, type GatewayResponse } from './adapter.ts';

/**
 * Yandex Cloud Function — entry point `index.handler` (Node.js 22), behind
 * API Gateway with `payload_format_version: "2.0"`. Built into one CommonJS
 * file by `npm run build:yandex-lead` (`scripts/build-yandex-lead.mjs`).
 *
 * TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID come from Lockbox as environment
 * variables of the function — never part of any frontend build.
 *
 * Rate limiting needs a store shared by every instance: Upstash Redis
 * (`UPSTASH_REDIS_REST_URL` + `_TOKEN`). Without one it is OFF — logged at
 * cold start — and the bot protections carry the endpoint. A function
 * instance's memory is not shared, so it is never used as a limit here.
 *
 * Created at module scope: a warm instance reuses it.
 */
const gateway = createGatewayHandler({ env: process.env, rateLimit: upstashFromEnv(process.env) });

export function handler(event: GatewayEvent): Promise<GatewayResponse> {
  return gateway(event);
}
