// The browser chrome's tone (`<meta name="theme-color">` + the root's
// background, spikes/full/roomTone.ts) on a phone: at each room, what the
// chrome is told vs what the page shows at its top edge, how often the tone
// is written over a full scroll of the page, the overscroll ground at both
// ends, and the price layer. Screenshots → spikes/full/__captures__/chrome/.
import { chromium, webkit, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env['BASE'] ?? 'http://localhost:5173/';
const OUT = 'spikes/full/__captures__/chrome';
mkdirSync(OUT, { recursive: true });
const RUNS = [
  { tag: 'chrome-390', engine: chromium, opts: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { tag: 'chrome-430', engine: chromium, opts: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  { tag: 'webkit-iphone14', engine: webkit, opts: { ...devices['iPhone 14'] } },
];
for (const run of RUNS) {
  const b = run.engine === chromium ? await chromium.launch({ channel: 'chrome' }) : await webkit.launch();
  const page = await (await b.newContext({ ...run.opts, locale: 'ru-RU' })).newPage();
  await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
  await page.addInitScript(() => {
    window.__toneWrites = [];
    new MutationObserver(() => {}).observe(document, { childList: true });
    document.addEventListener('DOMContentLoaded', () => {
      const m = document.querySelector('meta[name="theme-color"]');
      new MutationObserver(() => window.__toneWrites.push(m.content)).observe(m, { attributes: true, attributeFilter: ['content'] });
    });
  });
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  const H = await page.evaluate(() => innerHeight);
  const state = async () => {
    const png = await page.screenshot();
    return page.evaluate(async (b64) => {
      const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
      const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, img.width, Math.round(img.height * 0.012)).data; const ch = [[], [], []];
      for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) ch[k].push(d[i + k]);
      const top = '#' + ch.map((a) => a.sort((m, n) => m - n)[a.length >> 1].toString(16).padStart(2, '0')).join('');
      const toHex = (rgb) => '#' + rgb.match(/\d+/g).slice(0, 3).map((n) => (+n).toString(16).padStart(2, '0')).join('');
      return { meta: document.querySelector('meta[name="theme-color"]').content, root: toHex(getComputedStyle(document.documentElement).backgroundColor), pageTop: top, chapter: document.documentElement.dataset.chapter };
    }, png.toString('base64'));
  };
  const to = async (y, wait = 1300) => { await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, y); await page.waitForTimeout(wait); };
  const top = (s) => page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY), s);
  console.log(`\n== ${run.tag} (${H}px tall) ==`);
  const shoot = async (label) => { const s = await state(); console.log(`  ${label.padEnd(22)} meta ${s.meta}  root ${s.root}  page top ${s.pageTop}`); await page.screenshot({ path: `${OUT}/${run.tag}-${label.replace(/\W+/g, '-')}.png` }); return s; };
  const atTop = await shoot('hero');
  await to(H, 1800); await shoot('manifesto');
  for (const [id, off] of [['services', 4], ['cases', 4], ['specialists', 4], ['founder', 4], ['reviews', 4], ['contact', 4], ['inquiry', 4]]) { await to((await top('#' + id)) + off); await shoot(id); }
  await to(1e7, 1500); const atEnd = await shoot('footer (page end)');
  // the writes over one full pass of the page, scrolled the way a thumb does (small steps)
  await to(0, 1500);
  await page.evaluate(() => { window.__toneWrites.length = 0; });
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  let steps = 0;
  for (let y = 0; y <= max; y += Math.round(H / 6)) { await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, y); await page.waitForTimeout(60); steps++; }
  await page.waitForTimeout(800);
  const writes = await page.evaluate(() => window.__toneWrites.slice());
  console.log(`  ↓ writes over a full pass of ${steps} scroll steps: ${writes.length} → ${writes.join(' → ')}`);
  // and all the way back up
  await page.evaluate(() => { window.__toneWrites.length = 0; });
  steps = 0;
  for (let y = max; y >= 0; y -= Math.round(H / 6)) { await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, y); await page.waitForTimeout(60); steps++; }
  await page.evaluate(() => { window.__lenis?.scrollTo(0, { immediate: true, force: true }); scrollTo(0, 0); });
  await page.waitForTimeout(1200);
  const back = await page.evaluate(() => window.__toneWrites.slice());
  console.log(`  ↑ writes over the way back (${steps} steps): ${back.length} → ${back.join(' → ')}`);
  console.log(`  overscroll ground: at the top ${atTop.root} (hero), at the end ${atEnd.root} (footer)`);
  // the price layer — opened over an inner room, closed: the tone is that room's again
  await to((await top('#reviews')) + 4, 1500);
  await page.evaluate(() => document.querySelector('.flowbar a[href="#pricing"]')?.click());
  await page.waitForTimeout(1500);
  const layer = await state(); console.log(`  price layer open      meta ${layer.meta}  root ${layer.root}`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
  const closed = await state(); console.log(`  price layer closed    meta ${closed.meta}  root ${closed.root}`);
  await b.close();
}
