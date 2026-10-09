/**
 * The Yandex adapter: API Gateway 2.0 events in, gateway responses out, the
 * shared `server/lead/` handler in between. Telegram is a fake `fetch` —
 * nothing here can reach the clinic's chat.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { MemoryRateLimit, type RateLimitStore } from '../../server/lead/rateLimit.ts';
import { createGatewayHandler, type GatewayEvent } from './adapter.ts';

const FAKE_TOKEN = '000000:TEST-TOKEN-never-real';
const PROD = 'https://www.era-cosmetology.ru';
const clock = Date.parse('2026-10-08T05:00:00Z');

let sent: { url: string; body: { chat_id: string; text: string } }[] = [];
let telegramOk = true;
let logs: string[] = [];

const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
  sent.push({ url: String(url), body: JSON.parse(String(init?.body)) });
  return telegramOk
    ? Response.json({ ok: true })
    : new Response('{"ok":false}', {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
}) as typeof fetch;

const gateway = (env: Record<string, string> = {}, rateLimit: RateLimitStore | null = null) =>
  createGatewayHandler({
    env: { TELEGRAM_BOT_TOKEN: FAKE_TOKEN, TELEGRAM_CHAT_ID: '-100123', ...env },
    rateLimit,
    fetch: fakeFetch,
    now: () => clock,
    log: (l) => logs.push(l),
  });

const validLead = (over: Record<string, unknown> = {}) => ({
  name: 'Анна',
  contact: '+7 914 000-00-00',
  procedure: 'Консультация',
  specialist: 'Любой',
  message: '',
  consent: true,
  website: '',
  startedAt: clock - 30_000,
  ...over,
});

/** an API Gateway payload-format-2.0 event, as Yandex sends it */
const event = (
  body: unknown,
  { origin = PROD, ip = '203.0.113.7', method = 'POST', headers = {}, base64 = false } = {} as {
    origin?: string | null;
    ip?: string;
    method?: string;
    headers?: Record<string, string>;
    base64?: boolean;
  },
): GatewayEvent => {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    version: '2.0',
    rawPath: '/lead',
    rawQueryString: '',
    headers: {
      Host: 'api.era-cosmetology.ru',
      'Content-Type': 'application/json',
      ...(origin ? { Origin: origin } : {}),
      ...headers,
    },
    body: base64 ? Buffer.from(raw).toString('base64') : raw,
    isBase64Encoded: base64,
    requestContext: {
      domainName: 'api.era-cosmetology.ru',
      http: { method, path: '/lead', sourceIp: ip },
    },
  };
};

beforeEach(() => {
  sent = [];
  telegramOk = true;
  logs = [];
});

describe('Yandex Cloud Function — POST /lead', () => {
  it('delivers a valid lead and answers in the gateway shape with CORS for the page', async () => {
    const res = await gateway()(event(validLead()));
    assert.equal(res.statusCode, 200);
    assert.equal(res.isBase64Encoded, false);
    assert.deepEqual(JSON.parse(res.body), { ok: true });
    assert.equal(res.headers['access-control-allow-origin'], PROD);
    assert.equal(res.headers['vary'], 'Origin');
    assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.url, `https://api.telegram.org/bot${FAKE_TOKEN}/sendMessage`);
    assert.equal(sent[0]?.body.chat_id, '-100123');
    assert.match(sent[0]?.body.text ?? '', /^<b>НОВАЯ ЗАЯВКА — ERA COSMETOLOGY<\/b>\n\nИмя: Анна/u);
  });

  it('reads a base64 body', async () => {
    const res = await gateway()(event(validLead(), { base64: true }));
    assert.equal(res.statusCode, 200);
    assert.equal(sent.length, 1);
  });

  it('refuses other origins — and gives them no CORS header', async () => {
    for (const origin of ['https://evil.example', 'https://era-cosmetology.ru', null]) {
      const res = await gateway()(event(validLead(), { origin }));
      assert.equal(res.statusCode, 403, String(origin));
      assert.equal(res.headers['access-control-allow-origin'], undefined);
    }
    assert.equal(sent.length, 0);
  });

  it('LEAD_ALLOWED_ORIGINS replaces the list — a test origin during migration', async () => {
    const test = 'https://era-test.website.yandexcloud.net';
    const g = gateway({ LEAD_ALLOWED_ORIGINS: `${PROD}, ${test}/` });
    const res = await g(event(validLead(), { origin: test }));
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['access-control-allow-origin'], test);
    assert.equal((await g(event(validLead())))?.statusCode, 200);
    assert.equal(
      (await gateway({ LEAD_ALLOWED_ORIGINS: test })(event(validLead()))).statusCode,
      403,
    );
  });

  it('rejects missing fields and consent with the field list, without calling Telegram', async () => {
    const res = await gateway()(event(validLead({ name: '', consent: false })));
    assert.equal(res.statusCode, 400);
    assert.deepEqual(JSON.parse(res.body), {
      ok: false,
      error: 'invalid',
      fields: ['name', 'consent'],
    });
    assert.equal(res.headers['access-control-allow-origin'], PROD);
    assert.equal(sent.length, 0);
  });

  it('swallows a bot silently: honeypot filled or sent too fast', async () => {
    for (const lead of [
      validLead({ website: 'http://spam' }),
      validLead({ startedAt: clock - 500 }),
    ]) {
      const res = await gateway()(event(lead));
      assert.equal(res.statusCode, 200);
      assert.deepEqual(JSON.parse(res.body), { ok: true });
    }
    assert.equal(sent.length, 0);
  });

  it('answers 405, 415 and 413 for other methods, types and large bodies', async () => {
    const g = gateway();
    assert.equal((await g(event('', { method: 'GET' }))).statusCode, 405);
    assert.equal(
      (await g(event(validLead(), { headers: { 'Content-Type': 'text/plain' } }))).statusCode,
      415,
    );
    assert.equal((await g(event(validLead({ message: 'x'.repeat(9000) })))).statusCode, 413);
    assert.equal(sent.length, 0);
  });

  it('502 when Telegram fails — and logs no personal data, no token', async () => {
    telegramOk = false;
    const res = await gateway()(
      event(validLead({ name: 'Мария', message: 'аллергия на лидокаин' })),
    );
    assert.equal(res.statusCode, 502);
    assert.deepEqual(JSON.parse(res.body), { ok: false, error: 'delivery' });
    const all = logs.join('\n');
    assert.match(all, /delivery failed: telegram status 500/u);
    for (const secret of ['Мария', 'лидокаин', '914', FAKE_TOKEN, '203.0.113.7'])
      assert.ok(!all.includes(secret), secret);
  });

  it('503 when the bot is not configured', async () => {
    const g = createGatewayHandler({ env: {}, rateLimit: null, log: () => {} });
    assert.equal((await g(event(validLead()))).statusCode, 503);
  });
});

describe('the client address', () => {
  it('rate-limits by the gateway’s sourceIp — forwarded headers cannot change it', async () => {
    const g = gateway({}, new MemoryRateLimit());
    const codes: number[] = [];
    for (let i = 0; i < 6; i++)
      codes.push(
        (
          await g(
            event(validLead(), {
              headers: { 'X-Forwarded-For': `198.51.100.${i}`, 'X-Real-IP': `198.51.100.${i}` },
            }),
          )
        ).statusCode,
      );
    assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
    // another address is its own bucket
    assert.equal((await g(event(validLead(), { ip: '203.0.113.8' }))).statusCode, 200);
  });

  it('logs that rate limiting is OFF when no shared store is configured', () => {
    gateway({}, null);
    assert.ok(logs.some((l) => /rate limiting is OFF/u.test(l)));
  });
});
