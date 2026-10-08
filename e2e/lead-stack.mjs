// The mocked lead stack for `e2e/production.spec.ts` — started by Playwright
// (playwright.config.ts → webServer), never reused:
//
//   :5191  a MOCK Telegram Bot API — records every sendMessage, answers ok;
//          GET /__got returns what it received, POST /__reset clears it
//   :5174  a Vite dev server of the site whose /api/lead is the real handler,
//          pointed at the mock
//
// Safety: the Bot API base is set HERE, in the process environment, which
// Vite's loadEnv ranks above `.env.local` — and the token and chat are fake.
// A test lead cannot reach the clinic's chat.
import { createServer as createHttp } from 'node:http';

import { createServer as createVite } from 'vite';

const MOCK_PORT = 5191;
const SITE_PORT = 5174;

const got = [];
createHttp((req, res) => {
  res.setHeader('content-type', 'application/json');
  if (req.url === '/__got') return res.end(JSON.stringify(got));
  if (req.url === '/__reset') {
    got.length = 0;
    return res.end('{}');
  }
  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    got.push({ path: req.url, body: JSON.parse(raw || '{}') });
    res.end(JSON.stringify({ ok: true, result: { message_id: got.length } }));
  });
}).listen(MOCK_PORT, '127.0.0.1');

Object.assign(process.env, {
  TELEGRAM_BOT_TOKEN: '000000:MOCK-ONLY',
  TELEGRAM_CHAT_ID: '-100000',
  TELEGRAM_API_BASE: `http://127.0.0.1:${MOCK_PORT}`,
  LEAD_ALLOWED_ORIGINS: '',
});

const vite = await createVite({ server: { port: SITE_PORT, strictPort: true, host: '127.0.0.1' } });
await vite.listen();
console.log(
  `lead stack: site http://127.0.0.1:${SITE_PORT} · mock Telegram http://127.0.0.1:${MOCK_PORT}`,
);
