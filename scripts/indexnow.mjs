// `npm run indexnow` — tells Яндекс (and through it every IndexNow engine) that
// the site's pages changed. BY HAND ONLY, after a production deploy: the build
// never runs this, so URLs are never announced with undeployed changes.
//
// The key is not a secret: IndexNow proves ownership by the public file
// `public/<KEY>.txt` → https://era-cosmetology.ru/<KEY>.txt, whose body is the
// key. Before sending, the script checks that file on the live site — a missing
// or stale key would only earn a 403 from the endpoint.
//
// `npm run indexnow -- --dry-run` prints the payload and sends nothing.
// Any non-2xx answer (or a network error, or a timeout) exits 1.
import { readFileSync } from 'node:fs';

const HOST = 'era-cosmetology.ru';
const KEY = '833ca850a021e63100be6e3be641aa1a';
const ENDPOINT = 'https://yandex.com/indexnow';
const URLS = ['/', '/ceny/'];
const TIMEOUT_MS = 15_000;

const keyLocation = `https://${HOST}/${KEY}.txt`;
const payload = {
  host: HOST,
  key: KEY,
  keyLocation,
  urlList: URLS.map((path) => `https://${HOST}${path}`),
};

const fail = (reason) => {
  console.error(`indexnow: ${reason}`);
  process.exit(1);
};

// the committed key file must match the key sent
const keyFile = new URL(`../public/${KEY}.txt`, import.meta.url);
let local;
try {
  local = readFileSync(keyFile, 'utf8').trim();
} catch {
  fail(`public/${KEY}.txt is missing`);
}
if (local !== KEY) fail(`public/${KEY}.txt does not contain the key`);

console.log(`indexnow: ${ENDPOINT}\n${JSON.stringify(payload, null, 2)}`);
if (process.argv.includes('--dry-run')) {
  console.log('indexnow: --dry-run — nothing sent');
  process.exit(0);
}

// the deployed key file must answer with the key
try {
  const res = await fetch(keyLocation, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = (await res.text()).trim();
  if (!res.ok) fail(`${keyLocation} answered HTTP ${res.status} — deploy first`);
  if (body !== KEY) fail(`${keyLocation} does not contain the key — deploy first`);
} catch (error) {
  fail(`${keyLocation} unreachable — ${error.message}`);
}

let res;
try {
  res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
} catch (error) {
  fail(`request failed — ${error.message}`);
}

const text = (await res.text()).trim();
console.log(`indexnow: HTTP ${res.status} ${res.statusText}${text ? `\n${text}` : ''}`);
// 200 accepted · 202 accepted, key validation pending
if (!res.ok) fail(`not accepted (HTTP ${res.status})`);
console.log(`indexnow: ${payload.urlList.length} URL(s) submitted`);
