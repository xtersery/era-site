# server/ — `POST /api/lead`

The inquiry form (`spikes/inquiry/Talk.tsx` → `src/lib/inquiry/sendLead.ts`)
posts here; the handler checks the request and sends one message to the
clinic's Telegram chat. The bot token never leaves the server.

```
server/
  lead/handler.ts    createLeadHandler(): Web Request → Web Response (platform-neutral)
  lead/validate.ts   the form's rules + limits, honeypot, fill-time trap
  lead/message.ts    the Telegram message, time in Khabarovsk (UTC+10)
  lead/telegram.ts   sendMessage, 8 s timeout, nothing secret in errors
  lead/rateLimit.ts  RateLimitStore: memory (one process) · Upstash (serverless) · null = off
  lead/lead.test.ts  npm run test:server — against a MOCK Bot API, never the real chat
  node.ts            Node adapter: (req, res) — node:http, Connect, Express
  vite.ts            mounts the Node adapter in `npm run dev` and `npm run preview`
api/
  lead.ts            the Vercel Function — the adapter only
  tsconfig.json      how Vercel compiles it (see below)
```

## Environment (server only — never `VITE_`)

| Variable                                                              | Required | Meaning                                                       |
| --------------------------------------------------------------------- | -------- | ------------------------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`                                                  | yes      | the bot's token from @BotFather                               |
| `TELEGRAM_CHAT_ID`                                                    | yes      | the chat (a group's id starts with `-100`)                    |
| `LEAD_ALLOWED_ORIGINS`                                                | prod     | `https://site.ru,https://www.site.ru`; default: the same host |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` (or `KV_REST_API_URL` / `_TOKEN`) | Vercel   | the shared rate-limit store                                   |
| `TELEGRAM_API_BASE`                                                   | no       | tests only — a mock of `https://api.telegram.org`             |

Locally they live in `.env.local` (git-ignored).

## Production on Vercel — `api/lead.ts`

`api/lead.ts` is the Vercel Function: the client's address (`x-real-ip`,
set by Vercel's edge), `process.env`, and the shared handler — nothing else.
`api/tsconfig.json` exists for Vercel's compiler: it emits JavaScript, so
the `.ts` import paths in `server/` are rewritten to `.js`
(`rewriteRelativeImportExtensions`). Without it the function deploys and
fails on the first request with `ERR_MODULE_NOT_FOUND` — verified with a
local `vercel build`, then by running the emitted function.

Vercel env (Settings → Environment Variables):

| Variable                                        | Production | Preview               |
| ----------------------------------------------- | ---------- | --------------------- |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`        | yes        | only with a TEST chat |
| `LEAD_ALLOWED_ORIGINS`                          | the domain | unset (same host)     |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN`             | yes        | optional              |
| `VITE_SANITY_PROJECT_ID`, `VITE_SANITY_DATASET` | yes        | yes                   |

### Rate limiting on Vercel

Serverless instances share no memory, so `MemoryRateLimit` is never used
there. With an Upstash Redis store (Vercel Marketplace → Upstash, which sets
`KV_REST_API_URL` / `KV_REST_API_TOKEN`; or `UPSTASH_REDIS_REST_*` from
console.upstash.com) the limits are global: 5 per address and 40 overall per
10 minutes. Without a store the function logs
`[lead] rate limiting is OFF — no shared store configured` at every cold
start and relies on the bot protections (same origin, honeypot, ≥ 2 s fill
time, 8 KB body cap). If the store is down, leads are let through and the
failure is logged.

## Other hosts

The handler is a Web-standard `(Request, ip) → Response`:

**Node (VPS, Docker).** Serve `dist/` with nginx and run
`createServer(toNodeListener(createLeadHandler({ env: process.env, rateLimit: new MemoryRateLimit() }), { trustProxy: true }))`
behind it. Turn on `trustProxy` only behind a proxy that sets
`X-Forwarded-For`.

**Netlify** (`netlify/functions/lead.ts`, `context.ip`) and **Cloudflare**
(`functions/api/lead.ts`, `cf-connecting-ip`) — the same few lines as
`api/lead.ts`, with a shared store.

The server needs outbound access to `api.telegram.org`.
