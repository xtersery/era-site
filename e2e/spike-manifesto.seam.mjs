// Манифест's foot and the seam into Услуги on five widths: the room at rest
// (its bottom edge, where the 3rem band used to be), then the seam at 10, 25,
// 50 and 75 % of its window. Prints, per width, what paints over the last
// 48 px at rest and whether those rows are a flat block (a band) or the wall.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env['BASE'] ?? 'http://localhost:5173/';
const TAG = process.env['TAG'] ?? 'now';
const OUT = 'spikes/hero-stone/__captures__/seam';
mkdirSync(OUT, { recursive: true });
const SIZES = [[1440, 900], [1280, 800], [1024, 768], [390, 844, true], [430, 932, true]];
const browser = await chromium.launch({ channel: 'chrome' });
for (const [w, h, phone] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'ru-RU', deviceScaleFactor: 1, ...(phone ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  if (phone) { await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true, force: true }), h); await page.waitForTimeout(1500); }
  else { await page.mouse.move(w / 2, h / 2); await page.mouse.wheel(0, 120); await page.waitForTimeout(9500); }
  const rest = await page.screenshot({ path: `${OUT}/${TAG}-${w}-rest.png` });
  const info = await page.evaluate(() => {
    const seam = document.querySelector('.sv-seam').getBoundingClientRect();
    return { scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, seamTop: Math.round(seam.top), vh: innerHeight };
  });
  // the last 48 rows at rest: per-row spread of luminance across the width — a painted band is flat (low spread)
  const stats = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const spread = (y) => { const d = x.getImageData(0, y, img.width, 1).data; const L = []; for (let i = 0; i < d.length; i += 4) L.push(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]); const m = L.reduce((a, b) => a + b) / L.length; return Math.sqrt(L.reduce((a, b) => a + (b - m) ** 2, 0) / L.length); };
    const rows = (a, b) => { let s = 0; for (let y = a; y < b; y++) s += spread(y); return +(s / (b - a)).toFixed(1); };
    return { last48: rows(img.height - 48, img.height), above: rows(img.height - 120, img.height - 72) };
  }, rest.toString('base64'));
  const sv = await page.evaluate(() => Math.round(document.querySelector('.sv-frame').getBoundingClientRect().top + scrollY));
  for (const k of [0.1, 0.25, 0.5, 0.75]) {
    await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, Math.round(sv - h * (1 - k)));
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${TAG}-${w}-seam${Math.round(k * 100)}.png` });
  }
  console.log(`${TAG} ${String(w).padEnd(4)} rest y ${info.scrollY} | .sv-seam top ${info.seamTop} (viewport ${info.vh}) | last 48 rows spread ${stats.last48} vs above ${stats.above} | doc ${info.docW}×${info.docH}`);
  await ctx.close();
}
await browser.close();
