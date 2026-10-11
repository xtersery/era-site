# deploy/regru-api — the lead relay on REG.RU

```
Browser (https://www.era-cosmetology.ru)
  → https://api.era-cosmetology.ru/lead/        this folder, PHP on REG.RU shared hosting
  → https://era-site-eight.vercel.app/api/lead  api/lead.ts → server/lead/ (validation, rate limit, message)
  → Telegram
```

REG.RU can reach Vercel but not `api.telegram.org`, so the PHP is a **relay
only**: it forwards the raw JSON body byte for byte and returns Vercel's
status and JSON. Validation, bot protection, rate limiting and the Telegram
message stay in `server/lead/` — never duplicate them here.

```
deploy/regru-api/
  lead/index.php       POST /lead/ — the relay (PHP 7.4+, ext-curl)
  health/index.php     GET /health/ → {"ok":true}; calls nothing, reads no config
  config.example.php   the private config's shape — an example, NOT uploaded
```

## What the relay does

| Request                                             | Answer                                               |
| --------------------------------------------------- | ---------------------------------------------------- |
| `OPTIONS` from `https://www.era-cosmetology.ru`     | `204` + CORS (POST, OPTIONS · Content-Type · 3600 s) |
| `OPTIONS` / `POST` from any other or no `Origin`    | `403 {"ok":false,"error":"origin"}`                  |
| any other method                                    | `405` (`Allow: POST, OPTIONS`)                       |
| `Content-Type` not `application/json`               | `415 {"ok":false,"error":"type"}`                    |
| body > 8 KB (by `Content-Length` or by reading)     | `413 {"ok":false,"error":"too-large"}`               |
| private config missing / secret is `replace-me`     | `503 {"ok":false,"error":"not-configured"}`          |
| Vercel unreachable, timed out, or answered non-JSON | `502 {"ok":false,"error":"delivery"}`                |
| otherwise                                           | Vercel's status and JSON body, unchanged             |

Upstream: connect 5 s, total 15 s, TLS verified (peer + host), redirects
off, HTTPS only. Upstream headers are never passed on; the relay sets
`Content-Type: application/json; charset=utf-8`, `Cache-Control: no-store`,
`X-Content-Type-Options: nosniff`, `Vary: Origin`, `X-Request-Id` and
`Access-Control-Allow-Origin` (allowed origin only).

### Trusted-proxy protocol (the existing one — `server/lead/proxy.ts`)

| Header sent to Vercel | Value                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| `Content-Type`        | `application/json`                                                    |
| `Accept`              | `application/json`                                                    |
| `Origin`              | `https://www.era-cosmetology.ru` (in Vercel's `LEAD_ALLOWED_ORIGINS`) |
| `x-era-proxy-secret`  | `LEAD_PROXY_SECRET` from the private config                           |
| `x-era-client-ip`     | `$_SERVER['REMOTE_ADDR']` — only if it is a valid IP                  |

Vercel trusts `x-era-client-ip` only with the right secret, so every visitor
gets their own rate-limit bucket (5 per 10 minutes). A visitor's own
`X-Forwarded-For` / `X-Real-IP` is never read. Without the secret all
visitors would share REG.RU's one address — five leads per ten minutes for
the whole site — which is why the relay answers 503 instead.

### Logs

One line per request through PHP's `error_log` (REG.RU → `logs/` of the
site):

```
[lead-relay] id=3f9c0a1b2c3d4e5f status=200 upstream=200 ms=412
[lead-relay] id=… status=502 upstream=none ms=5003 note=curl-28
```

Never the body, a field, an address, the secret or any Telegram credential.
The same id is returned to the browser in `X-Request-Id`.

## Private config

The secret lives **outside the document root**. On REG.RU (ISPmanager) the
account's layout is:

```
/var/www/u1234567/data/                         the account's data folder ($HOME)
  era-private/lead-relay.php                    ← the private config (chmod 600)
  www/api.era-cosmetology.ru/                   the subdomain's document root
    lead/index.php
    health/index.php
```

`lead/index.php` looks for `dirname(__DIR__, 3) . '/era-private/lead-relay.php'`,
i.e. exactly the path above, whatever the account number. If the docroot is
elsewhere, set the env var `ERA_LEAD_RELAY_CONFIG` to the absolute path
(e.g. `SetEnv` in `.htaccess`, where the host allows it).

```php
<?php
return ['LEAD_PROXY_SECRET' => '<the same value as Vercel's LEAD_PROXY_SECRET>'];
```

Never commit the real file; `config.example.php` is the shape only.

## Deployment (manual — nothing here deploys)

1. **Vercel** (already in place for the Cloudflare front — verify, don't change):
   `LEAD_PROXY_SECRET` is set, and `LEAD_ALLOWED_ORIGINS` contains
   `https://www.era-cosmetology.ru`.
2. **REG.RU panel**: create the subdomain `api.era-cosmetology.ru`, issue its
   Let's Encrypt certificate, PHP 8.x (7.4 minimum) with `curl`.
3. Upload `lead/` and `health/` into the subdomain's document root
   (`www/api.era-cosmetology.ru/`). Do **not** upload `config.example.php`
   or this README.
4. Create `~/era-private/lead-relay.php` (outside `www/`), put the secret in
   it, `chmod 600` it.
5. Check:

   ```bash
   curl -i https://api.era-cosmetology.ru/health/
   # 200 {"ok":true}

   curl -i -X OPTIONS https://api.era-cosmetology.ru/lead/ \
     -H 'Origin: https://www.era-cosmetology.ru' \
     -H 'Access-Control-Request-Method: POST'
   # 204 + Access-Control-Allow-Origin

   curl -i -X POST https://api.era-cosmetology.ru/lead/ \
     -H 'Origin: https://www.era-cosmetology.ru' \
     -H 'Content-Type: application/json' --data '{}'
   # 200 {"ok":true} — Vercel's fill-time trap swallows it; nothing reaches Telegram
   ```

   A `503 not-configured` means the private config was not found or still
   says `replace-me`; a `502 delivery` with `note=curl-…` in the log means
   REG.RU could not reach Vercel (curl error number in the note).

6. **Visitor address.** REG.RU fronts Apache with nginx; `REMOTE_ADDR` must
   be the visitor's, not `127.0.0.1` or the server's own. Post two test
   leads from two networks and confirm they rate-limit separately (or
   temporarily add `REMOTE_ADDR` to a private log you then delete — never
   to the relay's log).

### Notes

- Use the URL **with** the trailing slash, `/lead/`: Apache redirects
  `/lead` → `/lead/`, and a redirected POST loses its body.
- The browser's own timeout (`src/lib/inquiry/sendLead.ts`) is 15 s, the
  same as the relay's total; when the frontend is switched to this endpoint,
  give it a few seconds more so the relay's 502 arrives first.
