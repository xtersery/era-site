// The reviews the clinic has published in Sanity, captured at build time
// (`npm run build` runs this first, as `prebuild`) into
// `src/lib/reviews/snapshot.json`. The site still asks Sanity live; the
// snapshot is what Отзывы shows when that request cannot get through — on a
// mobile network that drops or throttles the CMS's CDN the room used to lose
// every voice. Same query as `FEATURED_REVIEWS_QUERY`; raw rows, validated by
// `toReview` at runtime like the live answer.
//
// Never fatal: offline, or with no project id, the committed snapshot stays.
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = new URL('../src/lib/reviews/snapshot.json', import.meta.url);
const QUERY = `
  *[_type == "review" && published == true && featured == true]
    | order(priority asc, date desc)
    [0...$limit]
    { "id": _id, author, rating, date, text, source, sourceUrl }
`;

const env = { ...process.env };
for (const file of ['.env', '.env.production', '.env.local']) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*(VITE_SANITY_[A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no such file */
  }
}

const projectId = env.VITE_SANITY_PROJECT_ID;
const dataset = env.VITE_SANITY_DATASET || 'production';
if (!projectId) {
  console.log('reviews-snapshot: no VITE_SANITY_PROJECT_ID — keeping the committed snapshot');
  process.exit(0);
}

const url = new URL(`https://${projectId}.apicdn.sanity.io/v2026-09-01/data/query/${dataset}`);
url.searchParams.set('query', QUERY);
url.searchParams.set('$limit', '5');
url.searchParams.set('perspective', 'published');

try {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const { result } = await res.json();
  if (!Array.isArray(result)) throw new Error('no result array');
  writeFileSync(OUT, `${JSON.stringify({ capturedAt: new Date().toISOString(), rows: result }, null, 2)}\n`);
  console.log(`reviews-snapshot: ${result.length} reviews captured`);
} catch (e) {
  console.log(`reviews-snapshot: Sanity unreachable (${e.message}) — keeping the committed snapshot`);
}
