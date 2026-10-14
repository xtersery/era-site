// `npm run reviews:snapshot` — refreshes `src/lib/reviews/snapshot.json`, the
// curated reviews the site shows at once (before Sanity answers) and keeps
// when Sanity cannot be reached. BY HAND ONLY: the build never runs this and
// never touches the network for reviews — it bundles the committed file.
// Review the diff and commit it like any content change.
//
// The snapshot is replaced only by a successful, valid, NON-EMPTY answer
// (same query as `FEATURED_REVIEWS_QUERY`, rows checked as `toReview` checks
// them). On no project id, a network error, a timeout, a 4xx/5xx, invalid
// JSON, or no valid row, the file is left exactly as it is and the command
// exits 1 with the reason. An identical set leaves the file untouched.
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

const OUT = new URL('../src/lib/reviews/snapshot.json', import.meta.url);
const LIMIT = 5;
const TIMEOUT_MS = 10_000;
const QUERY = `
  *[_type == "review" && published == true && featured == true]
    | order(priority asc, date desc)
    [0...$limit]
    { "id": _id, author, rating, date, text, source, sourceUrl }
`;
const SOURCES = ['yandex', '2gis', 'manual'];

const fail = (reason) => {
  console.error(`reviews:snapshot: ${reason} — snapshot left unchanged`);
  process.exitCode = 1;
};

/** the process env first, then the files, in Vite's production order (most specific wins) */
function sanityEnv(name) {
  if (process.env[name] !== undefined) return process.env[name];
  for (const file of ['.env.production.local', '.env.local', '.env.production', '.env']) {
    try {
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
        if (m && m[1] === name) return m[2].replace(/^["']|["']$/g, '');
      }
    } catch {
      /* no such file */
    }
  }
  return undefined;
}

/** a row as `toReview` (src/lib/reviews/sanityProvider.ts) would accept it */
const isValidRow = (r) =>
  r !== null &&
  typeof r === 'object' &&
  typeof r.id === 'string' &&
  typeof r.author === 'string' &&
  r.author.trim() !== '' &&
  typeof r.text === 'string' &&
  r.text.trim() !== '' &&
  typeof r.rating === 'number' &&
  r.rating >= 1 &&
  r.rating <= 5 &&
  typeof r.date === 'string' &&
  /^\d{4}-\d{2}(-\d{2})?$/.test(r.date) &&
  SOURCES.includes(r.source);

async function main() {
  const projectId = (sanityEnv('VITE_SANITY_PROJECT_ID') ?? '').trim();
  const dataset = (sanityEnv('VITE_SANITY_DATASET') ?? '').trim() || 'production';
  if (!projectId) return fail('no VITE_SANITY_PROJECT_ID');

  let rows;
  try {
    const url = new URL(`https://${projectId}.apicdn.sanity.io/v2026-09-01/data/query/${encodeURIComponent(dataset)}`);
    url.searchParams.set('query', QUERY);
    url.searchParams.set('$limit', String(LIMIT));
    url.searchParams.set('perspective', 'published');
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return fail(`Sanity answered HTTP ${res.status}`);
    const body = await res.json();
    rows = body?.result;
  } catch (e) {
    return fail(`Sanity unreachable (${e instanceof Error ? e.message : String(e)})`);
  }

  if (!Array.isArray(rows)) return fail('the answer has no result array');
  const valid = rows.filter(isValidRow);
  if (valid.length === 0) return fail(rows.length ? `none of ${rows.length} rows is a valid review` : 'Sanity has no featured reviews (an empty answer never replaces the snapshot)');

  let previous;
  try {
    previous = JSON.parse(readFileSync(OUT, 'utf8')).rows;
  } catch {
    previous = undefined;
  }
  if (JSON.stringify(previous) === JSON.stringify(valid)) {
    console.log(`reviews:snapshot: ${valid.length} reviews, unchanged — file untouched`);
    return;
  }

  // written whole or not at all
  const tmp = new URL(`${OUT.href}.tmp`);
  writeFileSync(tmp, `${JSON.stringify({ capturedAt: new Date().toISOString(), rows: valid }, null, 2)}\n`);
  renameSync(tmp, OUT);
  const dropped = rows.length - valid.length;
  console.log(`reviews:snapshot: ${valid.length} reviews written${dropped ? ` (${dropped} invalid skipped)` : ''} — review and commit src/lib/reviews/snapshot.json`);
}

await main().catch((e) => fail(`unexpected error (${e instanceof Error ? e.message : String(e)})`));
