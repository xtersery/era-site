/**
 * `npm run test:server` — the endpoint end to end against a MOCK Telegram
 * Bot API on localhost: a real HTTP server for `/api/lead` (the Node
 * adapter) and a second one standing in for api.telegram.org. Nothing here
 * can reach the clinic's chat: the token is fake and `TELEGRAM_API_BASE`
 * points at the mock.
 */
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, beforeEach, describe, it } from 'node:test';

import { toNodeListener } from '../node.ts';
import { createLeadHandler } from './handler.ts';
import { formatKhabarovsk, formatLead } from './message.ts';
import { PROXY_IP_HEADER, PROXY_SECRET_HEADER, proxiedClientIp } from './proxy.ts';
import { MemoryRateLimit, UpstashRateLimit, upstashFromEnv } from './rateLimit.ts';

interface Received {
  path: string;
  body: { chat_id: string; text: string; parse_mode: string };
}

const FAKE_TOKEN = '000000:TEST-TOKEN-never-real';
let telegramMode: 'ok' | 'error' = 'ok';
let received: Received[] = [];
const logs: string[] = [];

const listen = (server: Server) =>
  new Promise<string>((resolve) =>
    server.listen(0, '127.0.0.1', () =>
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`),
    ),
  );

const mock = createServer((req, res) => {
  let raw = '';
  req.on('data', (c: Buffer) => (raw += c.toString()));
  req.on('end', () => {
    received.push({ path: req.url ?? '', body: JSON.parse(raw) as Received['body'] });
    res.setHeader('content-type', 'application/json');
    if (telegramMode === 'error') {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error_code: 500, description: 'Internal Server Error' }));
    } else {
      res.end(JSON.stringify({ ok: true, result: { message_id: 1 } }));
    }
  });
});

let api: Server;
let apiUrl = '';
let apiHost = '';
let clock = Date.parse('2026-10-08T05:00:00Z');

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

const post = (body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${apiUrl}/api/lead`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: `http://${apiHost}`, ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

before(async () => {
  const mockUrl = await listen(mock);
  const handler = createLeadHandler({
    env: {
      TELEGRAM_BOT_TOKEN: FAKE_TOKEN,
      TELEGRAM_CHAT_ID: '-100123',
      TELEGRAM_API_BASE: mockUrl,
    },
    rateLimit: new MemoryRateLimit(),
    now: () => clock,
    log: (l) => logs.push(l),
  });
  const listener = toNodeListener(handler);
  api = createServer((req, res) => void listener(req, res));
  apiUrl = await listen(api);
  apiHost = new URL(apiUrl).host;
});

after(() => {
  api.close();
  mock.close();
});

beforeEach(() => {
  telegramMode = 'ok';
  received = [];
  logs.length = 0;
  clock += 11 * 60_000; // a fresh rate-limit window for every test
});

describe('POST /api/lead', () => {
  it('delivers a valid lead to Telegram in the agreed format', async () => {
    const res = await post(validLead({ message: 'Хочу записаться <на> вечер & субботу' }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
    assert.equal(received.length, 1);
    const [msg] = received;
    assert.equal(msg?.path, `/bot${FAKE_TOKEN}/sendMessage`);
    assert.equal(msg?.body.chat_id, '-100123');
    assert.equal(msg?.body.parse_mode, 'HTML');
    const text = msg?.body.text ?? '';
    assert.match(
      text,
      /^<b>НОВАЯ ЗАЯВКА — ERA COSMETOLOGY<\/b>\n\nИмя: Анна\n\nКонтакт: \+7 914 000-00-00\n\n/u,
    );
    assert.match(text, /Процедура: Консультация\n\nСпециалист: Любой\n\n/u);
    assert.match(text, /Сообщение: Хочу записаться &lt;на&gt; вечер &amp; субботу/u);
    assert.match(text, /Источник: сайт ERA\n\nДата и время: .+\(Хабаровск\)$/u);
  });

  it('leaves out the message line when the message is empty', async () => {
    await post(validLead());
    assert.doesNotMatch(received[0]?.body.text ?? '', /Сообщение/u);
  });

  it('rejects missing required fields and consent without calling Telegram', async () => {
    const res = await post(validLead({ name: 'А', contact: '12', consent: false }));
    assert.equal(res.status, 400);
    const body = (await res.json()) as { fields: string[] };
    assert.deepEqual(body.fields, ['name', 'contact', 'consent']);
    assert.equal(received.length, 0);
  });

  it('accepts a lead without a specialist — optional, as in the form', async () => {
    for (const specialist of [undefined, '', '   ']) {
      received = [];
      const res = await post(validLead({ specialist }));
      assert.equal(res.status, 200);
      assert.match(received[0]?.body.text ?? '', /Специалист: Любой\n\n/u);
    }
  });

  it('still rejects an over-long specialist', async () => {
    const res = await post(validLead({ specialist: 'а'.repeat(161) }));
    assert.equal(res.status, 400);
    assert.deepEqual(((await res.json()) as { fields: string[] }).fields, ['specialist']);
    assert.equal(received.length, 0);
  });

  it('answers 502 when Telegram fails — and logs no personal data, no token', async () => {
    telegramMode = 'error';
    const res = await post(validLead({ name: 'Мария', message: 'аллергия на лидокаин' }));
    assert.equal(res.status, 502);
    assert.deepEqual(await res.json(), { ok: false, error: 'delivery' });
    const all = logs.join('\n');
    assert.match(all, /delivery failed: telegram status 500/u);
    for (const secret of ['Мария', 'лидокаин', '914', FAKE_TOKEN])
      assert.ok(!all.includes(secret), secret);
  });

  it('swallows a bot silently: honeypot filled or sent too fast', async () => {
    for (const lead of [
      validLead({ website: 'http://spam' }),
      validLead({ startedAt: clock - 500 }),
    ]) {
      const res = await post(lead);
      assert.equal(res.status, 200);
    }
    assert.equal(received.length, 0);
  });

  it('rate-limits one address to 5 sends in 10 minutes', async () => {
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) codes.push((await post(validLead())).status);
    assert.deepEqual(codes, [200, 200, 200, 200, 200, 429]);
    assert.equal(received.length, 5);
  });

  it('refuses other origins, other methods, other content types and large bodies', async () => {
    assert.equal((await post(validLead(), { origin: 'https://evil.example' })).status, 403);
    assert.equal((await fetch(`${apiUrl}/api/lead`)).status, 405);
    assert.equal(
      (await post('name=x', { 'content-type': 'application/x-www-form-urlencoded' })).status,
      415,
    );
    assert.equal((await post(validLead({ message: 'я'.repeat(9_000) }))).status, 413);
    assert.equal(received.length, 0);
  });

  it('answers 503 when the bot is not configured', async () => {
    const handler = createLeadHandler({ env: {}, rateLimit: null, log: () => {} });
    const res = await handler(
      new Request('http://x/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'http://x', host: 'x' },
        body: JSON.stringify(validLead({ startedAt: Date.now() - 30_000 })),
      }),
      '1.1.1.1',
    );
    assert.equal(res.status, 503);
  });
});

describe('rate limiting', () => {
  const lead = () =>
    new Request('http://x/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'http://x', host: 'x' },
      body: JSON.stringify(validLead({ startedAt: Date.now() - 30_000 })),
    });
  const okTelegram = (async () =>
    new Response(JSON.stringify({ ok: true }), { status: 200 })) as unknown as typeof fetch;
  const env = {
    TELEGRAM_BOT_TOKEN: FAKE_TOKEN,
    TELEGRAM_CHAT_ID: '-1',
    TELEGRAM_API_BASE: 'http://mock',
  };

  it('says so in the log when there is no shared store — and does not pretend to limit', async () => {
    const lines: string[] = [];
    const handler = createLeadHandler({
      env,
      rateLimit: null,
      fetch: okTelegram,
      log: (l) => lines.push(l),
    });
    assert.match(lines.join('\n'), /rate limiting is OFF/u);
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await handler(lead(), '9.9.9.9')).status);
    assert.ok(codes.every((c) => c === 200));
  });

  it('Upstash store: INCR + PEXPIRE in one pipeline, hashed key, limit from the counter', async () => {
    const counts = new Map<string, number>();
    const calls: { url: string; auth: string; body: unknown[][] }[] = [];
    const redis = (async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as unknown[][];
      calls.push({ url, auth: new Headers(init.headers).get('authorization') ?? '', body });
      const key = String(body[0]?.[1]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return new Response(JSON.stringify([{ result: counts.get(key) }, { result: 1 }]));
    }) as unknown as typeof fetch;
    const store = new UpstashRateLimit({
      url: 'https://r.upstash.io/',
      token: 'tkn',
      fetch: redis,
    });
    const results: boolean[] = [];
    for (let i = 0; i < 3; i++) results.push(await store.take('ip:1.2.3.4', 2, 60_000, 1_000));
    assert.deepEqual(results, [true, true, false]);
    assert.equal(calls[0]?.url, 'https://r.upstash.io/pipeline');
    assert.equal(calls[0]?.auth, 'Bearer tkn');
    assert.equal(calls[0]?.body[0]?.[0], 'INCR');
    assert.deepEqual(calls[0]?.body[1]?.slice(0, 1), ['PEXPIRE']);
    assert.ok(!String(calls[0]?.body[0]?.[1]).includes('1.2.3.4'), 'the address is hashed');
  });

  it('a store that cannot be reached lets the lead through, and logs it', async () => {
    const lines: string[] = [];
    const down = (async () => new Response('', { status: 503 })) as unknown as typeof fetch;
    const handler = createLeadHandler({
      env,
      rateLimit: new UpstashRateLimit({ url: 'https://r', token: 't', fetch: down }),
      fetch: okTelegram,
      log: (l) => lines.push(l),
    });
    assert.equal((await handler(lead(), '1.1.1.1')).status, 200);
    assert.match(
      lines.join('\n'),
      /rate-limit store unavailable \(upstash status 503\) — allowed/u,
    );
  });

  it('reads the store from either naming of the env', () => {
    assert.equal(upstashFromEnv({}), null);
    assert.ok(
      upstashFromEnv({ UPSTASH_REDIS_REST_URL: 'https://a', UPSTASH_REDIS_REST_TOKEN: 'b' }),
    );
    assert.ok(upstashFromEnv({ KV_REST_API_URL: 'https://a', KV_REST_API_TOKEN: 'b' }));
  });
});

describe('the message', () => {
  it('stamps the time in Khabarovsk (UTC+10)', () => {
    assert.equal(
      formatKhabarovsk(new Date('2026-10-08T05:07:00Z')),
      '08.10.2026, 15:07 (Хабаровск)',
    );
  });

  it('matches the agreed layout', () => {
    const text = formatLead(
      {
        name: 'Анна',
        contact: '@anna',
        procedure: 'Консультация',
        specialist: 'Любой',
        message: 'Здравствуйте',
      },
      new Date('2026-10-08T05:07:00Z'),
    );
    assert.equal(
      text,
      [
        '<b>НОВАЯ ЗАЯВКА — ERA COSMETOLOGY</b>',
        'Имя: Анна',
        'Контакт: @anna',
        'Процедура: Консультация',
        'Специалист: Любой',
        'Сообщение: Здравствуйте',
        'Источник: сайт ERA',
        'Дата и время: 08.10.2026, 15:07 (Хабаровск)',
      ].join('\n\n'),
    );
  });
});

describe('the address through our own proxy', () => {
  const req = (headers: Record<string, string>) =>
    new Request('https://example.test/api/lead', { method: 'POST', headers });
  const SECRET = 'proxy-secret-for-tests';

  it('trusts the forwarded address only with the shared secret', () => {
    const ip = { [PROXY_IP_HEADER]: '203.0.113.7' };
    assert.equal(
      proxiedClientIp(req({ ...ip, [PROXY_SECRET_HEADER]: SECRET }), SECRET),
      '203.0.113.7',
    );
    assert.equal(proxiedClientIp(req({ ...ip, [PROXY_SECRET_HEADER]: 'wrong' }), SECRET), null);
    assert.equal(proxiedClientIp(req(ip), SECRET), null);
    assert.equal(proxiedClientIp(req({ ...ip, [PROXY_SECRET_HEADER]: SECRET }), undefined), null);
  });

  it('keeps anything but an address out of the rate-limit key', () => {
    const h = (v: string) => req({ [PROXY_IP_HEADER]: v, [PROXY_SECRET_HEADER]: SECRET });
    assert.equal(proxiedClientIp(h('2001:db8::1'), SECRET), '2001:db8::1');
    assert.equal(proxiedClientIp(h('all'), SECRET), null);
    assert.equal(proxiedClientIp(h('1.2.3.4, 5.6.7.8'), SECRET), null);
  });
});
