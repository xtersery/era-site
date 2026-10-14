// /ceny/ — the price page. Against a prod-like build (`npm run build`, then
// `node e2e/static-prod.mjs dist 4184`) or the dev server (BASE=…:5173/).
//
//   1. the raw HTML, no JavaScript: title, description, canonical, H1, the
//      JSON-LD, every row of the price list — and no script to run;
//   2. the same rows, name for name and price for price, as the «Стоимость»
//      layer on the main page (one data source, two views);
//   3. 390, 430, an iPhone and 1440: no sideways scroll, a price on its
//      service's line, touch targets, the index's anchors; screenshots;
//   4. the links: layer → /ceny/, the foot → /ceny/, /ceny/ → home, booking;
//      sitemap and robots.
// Screenshots → spikes/ceny/__captures__/.
import { chromium, webkit, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = (process.env['BASE'] ?? 'http://localhost:4184/').replace(/\/?$/, '/');
const OUT = 'spikes/ceny/__captures__';
mkdirSync(OUT, { recursive: true });
let failures = 0;
const check = (ok, label) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failures++; };

/* the rows of a price list in a document: [name, price] with the kickers and badges out */
const rowsIn = (root) => [...root.querySelectorAll('.spike-pricing__row')].map((tr) => {
  const th = tr.querySelector('th').cloneNode(true);
  th.querySelectorAll('.spike-pricing__kicker, .spike-pricing__badge').forEach((k) => k.remove());
  return `${th.textContent.replace(/\s+/g, ' ').trim()} | ${tr.querySelector('td').textContent.replace(/\s+/g, ' ').trim()}`;
});

// ---- 1. the raw HTML ------------------------------------------------------
console.log('\n== raw HTML ==');
const res = await fetch(`${base}ceny/`);
const html = await res.text();
check(res.status === 200, `GET /ceny/ → ${res.status}`);
check(html.includes('<title>Цены на косметологические процедуры в Хабаровске — клиника ЭРА</title>'), 'title');
check(/<meta name="description" content="[^"]*Хабаровск[^"]*"/.test(html), 'description');
check(html.includes('<link rel="canonical" href="https://era-cosmetology.ru/ceny/"'), 'canonical → https://era-cosmetology.ru/ceny/');
check((html.match(/<h1/g) ?? []).length === 1 && /<h1[^>]*>Стоимость[\s\u00a0]косметологических[\s\u00a0]процедур<\/h1>/.test(html), 'one H1: «Стоимость косметологических процедур»');
check(!/<script(?![^>]*application\/ld\+json)/.test(html), 'no script but the JSON-LD');
check(!/\[(Юридическая|Текст клиента)/.test(html) && (html.match(/rel="canonical"/g) ?? []).length === 1, 'no public placeholder; one canonical');
const bare = await fetch(`${base}ceny`, { redirect: 'manual' });
check([301, 308].includes(bare.status) && new URL(bare.headers.get('location'), base).pathname === '/ceny/', `GET /ceny → ${bare.status} → ${bare.headers.get('location')}`);
const ld = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const types = ld['@graph'].map((n) => n['@type']);
check(['WebPage', 'BreadcrumbList', 'MedicalClinic', 'ItemList'].every((t) => types.includes(t)), `JSON-LD: ${types.join(', ')}`);
check(!/Offer|aggregateRating|"price"|availability/.test(JSON.stringify(ld)), 'JSON-LD: no offers, prices, ratings, availability');
check(ld['@graph'].find((n) => n['@type'] === 'ItemList').itemListElement.length === 7, 'JSON-LD: 7 sections as Service');

// ---- 2. the same rows as the layer ----------------------------------------
console.log('\n== one source, two views ==');
const browser = await chromium.launch({ channel: 'chrome' });
const noJs = await (await browser.newContext({ javaScriptEnabled: false, locale: 'ru-RU' })).newPage();
const requests = [];
noJs.on('request', (r) => requests.push(r.url()));
await noJs.goto(`${base}ceny/`, { waitUntil: 'load' });
const pageRows = await noJs.evaluate(`(${rowsIn.toString()})(document)`);
check(!requests.some((u) => /\.js(\?|$)/.test(u)), `no JS requested (${requests.length} requests)`);
check(pageRows.length >= 118, `${pageRows.length} rows without JavaScript`);

const main = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ru-RU' })).newPage();
await main.route('**/*sanity.io/**', (r) => r.abort('failed'));
await main.goto(`${base}#pricing`, { waitUntil: 'load', timeout: 90000 });
await main.waitForSelector('.pricelayer .spike-pricing', { timeout: 30000 });
const layerRows = await main.evaluate(`(${rowsIn.toString()})(document.querySelector('.pricelayer'))`);
const diff = pageRows.filter((r, i) => r !== layerRows[i]);
check(layerRows.length === pageRows.length && diff.length === 0, `the layer and the page: ${layerRows.length} / ${pageRows.length} rows, ${diff.length} differ`);
if (diff.length) console.log('     first difference:', diff[0], '≠', layerRows[pageRows.indexOf(diff[0])]);
check(!/\[(Юридическая|Текст клиента)/.test(await main.evaluate(() => document.querySelector('.pricelayer').textContent)), 'no placeholder in the layer');
if (process.env['EXPECT']) check(pageRows.some((r) => r.includes(process.env['EXPECT'])) && layerRows.some((r) => r.includes(process.env['EXPECT'])), `both show «${process.env['EXPECT']}»`);

// the layer's link to the page, and the main page's foot
const link = await main.$('.pricelayer a[href="/ceny/"]');
check(!!link, 'the layer links to /ceny/');
await link.click();
await main.waitForURL('**/ceny/');
check((await main.title()).startsWith('Цены на косметологические'), 'the layer\'s link opens /ceny/');
await main.reload({ waitUntil: 'load' });
check(!/\[(Юридическая|Текст клиента)/.test(await main.evaluate(() => document.body.textContent)), 'no placeholder on /ceny/ in the browser');
await main.goto(`${base}ceny`, { waitUntil: 'load' });
check(new URL(main.url()).pathname === '/ceny/', `/ceny lands on ${new URL(main.url()).pathname}`);
await main.reload({ waitUntil: 'load' });
check(new URL(main.url()).pathname === '/ceny/' && (await main.title()).startsWith('Цены'), 'refresh after /ceny stays on /ceny/');
check((await main.$$('.spike-pricing__row')).length === pageRows.length, 'refresh on /ceny/ keeps the page');
await main.goto(base, { waitUntil: 'load' });
check(await main.evaluate(() => !!document.querySelector('.talk__foot a[href="/ceny/"]')), 'the main page\'s foot links to /ceny/');
await browser.close();

// ---- 3. the compositions --------------------------------------------------
const RUNS = [
  ['390', chromium, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['430', chromium, { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['iphone14', webkit, { ...devices['iPhone 14'] }],
  ['1440', chromium, { viewport: { width: 1440, height: 900 } }],
  ['1024', chromium, { viewport: { width: 1024, height: 768 } }],
];
for (const [tag, engine, opts] of RUNS) {
  console.log(`\n== ${tag} ==`);
  const b = engine === chromium ? await chromium.launch({ channel: 'chrome' }) : await webkit.launch();
  const page = await (await b.newContext({ ...opts, locale: 'ru-RU' })).newPage();
  await page.goto(`${base}ceny/`, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const m = await page.evaluate(() => {
    const docW = document.documentElement.scrollWidth;
    // a price sits on its service's first line: the cell's text starts at the name's first line
    const split = [...document.querySelectorAll('.spike-pricing__row:not(.spike-pricing__row--note)')].filter((tr) => {
      const name = tr.querySelector('th span').getClientRects()[0];
      const r = document.createRange(); r.selectNodeContents(tr.querySelector('td'));
      const price = r.getClientRects()[0];
      return !price || Math.abs(price.top - name.top) > 6 || price.left < name.right - 1;
    }).map((tr) => tr.textContent.trim().slice(0, 50));
    const wrapped = [...document.querySelectorAll('.spike-pricing__price')].filter((td) => { const r = document.createRange(); r.selectNodeContents(td); return r.getClientRects().length > 1; }).length;
    const small = [...document.querySelectorAll('.ceny-bar a, .spike-pricing__index-link, .ceny__handoff a, .ceny-foot a, .ceny-crumbs a')]
      .filter((a) => getComputedStyle(a).display !== 'none')
      .filter((a) => a.getBoundingClientRect().height < 44).map((a) => a.textContent.trim());
    const h1 = document.querySelector('h1').getBoundingClientRect();
    return { docW, vw: innerWidth, split, wrapped, small, h1: Math.round(h1.bottom), h1Size: getComputedStyle(document.querySelector('h1')).fontSize };
  });
  check(m.docW <= m.vw, `no sideways scroll (${m.docW} ≤ ${m.vw})`);
  check(m.wrapped === 0, `no price broken over two lines (${m.wrapped})`);
  check(m.split.length === 0, `every price on its service's first line${m.split.length ? ` — off: ${m.split.slice(0, 3).join(' / ')}` : ''}`);
  check(m.small.length === 0, `touch targets ≥ 44 px${m.small.length ? ` — small: ${m.small.join(', ')}` : ''}`);
  console.log(`     H1 ${m.h1Size}, bottom at ${m.h1}px`);
  await page.screenshot({ path: `${OUT}/${tag}-top.png` });
  // the index: an anchor jump lands the heading clear of the sticky index
  await page.click('.spike-pricing__index-link[href="#devices"]');
  await page.waitForTimeout(1200);
  const j = await page.evaluate(() => {
    const h = document.querySelector('#devices h2').getBoundingClientRect();
    const idx = document.querySelector('.spike-pricing__index').getBoundingClientRect();
    return { hash: location.hash, top: Math.round(h.top), clear: h.top >= idx.bottom - 1 || idx.height === 0 };
  });
  check(j.hash === '#devices' && j.clear && j.top >= 0, `index → #devices, heading at ${j.top}px, clear of the index`);
  await page.screenshot({ path: `${OUT}/${tag}-devices.png` });
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${tag}-foot.png` });
  await page.screenshot({ path: `${OUT}/${tag}-full.png`, fullPage: true });
  await b.close();
}

// ---- 4. sitemap and robots -------------------------------------------------
console.log('\n== sitemap, robots ==');
const sitemap = await (await fetch(`${base}sitemap.xml`)).text();
check(sitemap.includes('<loc>https://era-cosmetology.ru/ceny/</loc>') && !/<loc>[^<]*\/ceny<\/loc>/.test(sitemap), 'sitemap lists /ceny/ (only the canonical)');
const robots = await (await fetch(`${base}robots.txt`)).text();
check(!/Disallow:\s*\/ceny/.test(robots) && /Allow: \//.test(robots), 'robots allows /ceny/');

console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
