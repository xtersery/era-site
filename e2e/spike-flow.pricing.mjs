// Стоимость — the real price list, 2026: is every line of the client's source
// rendered, in order, with its amount unchanged? Opens the layer from the
// menu (desktop and phone), reads every row and note out of the DOM and
// compares them line by line against the canonical `priceList` (typography
// normalised: NBSP / narrow NBSP → space, a range's dash → «–»). Also: the
// layer is not in the document flow, the index jumps to a category, the phone
// keeps each price on its service's line, no horizontal overflow. Writes
// stills to spikes/flow/__captures__/. Dev server must be up.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';

import { runnerImport } from 'vite';

const base = process.env['BASE'] ?? 'http://localhost:5173/spikes/flow/';
const OUT = 'spikes/flow/__captures__';
mkdirSync(OUT, { recursive: true });

// The expected lines come from the canonical price list itself
// (`src/data/priceList.ts`, loaded through Vite's module runner) — no second
// copy to keep by hand. They are written out HERE, by walking the data in
// reading order with a formatter of the test's own, so a row the layer drops,
// reorders, renames or prices differently is still a mismatch.
const { module: data } = await runnerImport(fileURLToPath(new URL('../src/data/priceList.ts', import.meta.url)), {
  configFile: false,
  logLevel: 'error',
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
});
const rub = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`;
const price = (p) =>
  ({
    exact: () => rub(p.rub),
    range: () => `${rub(p.from).replace(' ₽', '')}–${rub(p.to)}`,
    perUnit: () => `${rub(p.rub)} за ед.`,
    surcharge: () => `+${rub(p.rub)}`,
    free: () => 'бесплатно',
  })[p.kind]();
const noteLine = (n) => (n.price ? `${n.text} — ${price(n.price)}` : n.text);
const groupLines = (g) => [
  ...(g.lead ?? []).map(noteLine),
  ...(g.items ?? []).flatMap((it) => [`${it.name} — ${price(it.price)}`, ...(it.notes ?? []).map((n) => n.text)]),
  ...(g.notes ?? []).map(noteLine),
  ...(g.groups ?? []).flatMap(groupLines),
];
const SOURCE_LINES = data.priceList.flatMap((c) => c.groups.flatMap(groupLines));
// a guard against comparing nothing with nothing: the list as the client last changed it (77dcbf4)
for (const must of ['Apple Peel — 5 500 ₽', 'Коллост']) {
  if (!SOURCE_LINES.some((l) => l.replace(/[\u00a0\u202f]/g, ' ').includes(must))) throw new Error(`priceList: no «${must}»`);
}
if (SOURCE_LINES.length < 100) throw new Error(`priceList: ${SOURCE_LINES.length} lines`);

const norm = (s) =>
  s
    .replace(/[  ]/g, ' ')
    .replace(/(\d)\s*[—–]\s*(\d)/g, '$1–$2') // a range, either dash
    .replace(/\s+/g, ' ')
    .trim()
    // the only case change the page makes: a note line starts with a capital
    .replace(/^./, (c) => c.toLowerCase());

const expected = SOURCE_LINES.map(norm);

const browser = await chromium.launch({ channel: 'chrome' });
let failures = 0;
const check = (ok, label) => {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures += 1;
};

async function run({ width, height, mobile = false, tag }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    locale: 'ru-RU',
    ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  console.log(`\n── ${tag} (${width}×${height})`);

  check(
    await page.evaluate(() => !document.querySelector('#pricing')),
    'Стоимость is not in the document before it is opened',
  );
  await page.click('.flowbar a[href="#pricing"]');
  await page.waitForSelector('.pricelayer .spike-pricing');
  check(await page.evaluate(() => location.hash === '#pricing'), 'the menu opens the layer (#pricing)');

  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('.spike-pricing__row')].flatMap((tr) => {
      const note = tr.classList.contains('spike-pricing__row--note');
      const th = tr.querySelector('th');
      const td = tr.querySelector('td').textContent;
      const text = (el) => {
        const c = el.cloneNode(true);
        c.querySelectorAll('.spike-pricing__kicker, .spike-pricing__badge').forEach((k) => k.remove());
        return c.textContent;
      };
      if (note) {
        const t = text(th.querySelector('.spike-pricing__note'));
        return [td ? `${t} — ${td}` : t];
      }
      const name = text(th.firstElementChild);
      const notes = [...th.querySelectorAll('.spike-pricing__note')].map(text);
      return [`${name} — ${td}`, ...notes];
    }),
  );
  const gotN = rows.map(norm);

  let mismatches = 0;
  const n = Math.max(expected.length, gotN.length);
  for (let i = 0; i < n; i += 1) {
    if (expected[i] !== gotN[i]) {
      mismatches += 1;
      console.log(`      line ${i + 1}\n        source:   ${expected[i]}\n        rendered: ${gotN[i]}`);
    }
  }
  check(mismatches === 0, `${gotN.length} rendered lines = ${expected.length} source lines, in order, amounts identical (${mismatches} mismatches)`);

  const counts = await page.evaluate(() => ({
    categories: document.querySelectorAll('.spike-pricing__category').length,
    items: document.querySelectorAll('.spike-pricing__row:not(.spike-pricing__row--note)').length,
    badge: [...document.querySelectorAll('.spike-pricing__badge')].map((b) => b.textContent),
    placeholders: /\[(Название|Коррекция мимических|Контурная коррекция|Индивидуальная)/.test(document.querySelector('.spike-pricing').textContent),
    overflow: document.querySelector('.pricelayer__scroll').scrollWidth - document.querySelector('.pricelayer__scroll').clientWidth,
  }));
  console.log(`      ${counts.categories} categories · ${counts.items} priced items · badge ${JSON.stringify(counts.badge)}`);
  check(counts.categories === 7, 'seven categories');
  check(!counts.placeholders, 'no placeholder rows remain');
  check(counts.overflow <= 0, `no horizontal overflow (${counts.overflow})`);

  // every price sits on its service's line: same row box, never below the name's first line
  const apart = await page.evaluate(() =>
    [...document.querySelectorAll('.spike-pricing__row:not(.spike-pricing__row--note)')].filter((tr) => {
      const name = tr.querySelector('th').getBoundingClientRect();
      const price = tr.querySelector('td').getBoundingClientRect();
      return price.top > name.bottom || price.left < name.right - 1;
    }).length,
  );
  check(apart === 0, `every price beside its own service (${apart} apart)`);

  await page.screenshot({ path: `${OUT}/pricing-real-top-${tag}.png` });
  // the index: jump to Аппаратная, the heading lands under the sticky rail
  await page.click('.spike-pricing__index-link:has-text("Аппаратная")');
  await page.waitForTimeout(1400);
  const jumped = await page.evaluate(() => {
    const h = document.querySelector('#price-devices h3').getBoundingClientRect();
    const idx = document.querySelector('.spike-pricing__index').getBoundingClientRect();
    return { top: Math.round(h.top), below: h.top >= idx.bottom - 1, current: document.querySelector('.spike-pricing__index-link[aria-current="true"]')?.textContent };
  });
  check(jumped.below && jumped.top < height * 0.4, `index → Аппаратная косметология lands under the rail (top ${jumped.top}, current «${jumped.current}»)`);
  await page.screenshot({ path: `${OUT}/pricing-real-devices-${tag}.png` });
  await page.evaluate(() => document.querySelector('#price-contour').scrollIntoView());
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/pricing-real-contour-${tag}.png` });

  await page.click('.pricelayer__back');
  check(await page.evaluate(() => !document.querySelector('.pricelayer')), '«Назад к сайту» closes the layer');
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

await run({ width: 1440, height: 900, tag: 'desktop' });
await run({ width: 390, height: 844, mobile: true, tag: 'phone' });
await browser.close();
console.log(failures ? `\n${failures} FAILED` : '\nall ok');
process.exit(failures ? 1 : 0);
