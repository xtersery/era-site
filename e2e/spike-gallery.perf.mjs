// Spike C pass 5 — technical report for the ribbon archive.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/gallery/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/gallery/';
const browser = await chromium.launch({ channel: 'chrome' });
const report = {};
async function measure(label, viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2600);
  const top = await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.waitForTimeout(600);
  const sample = async () => {
    await page.evaluate(() => { window.__f = []; let last = performance.now(); const t = (n) => { window.__f.push(n - last); last = n; if (window.__f.length < 260) requestAnimationFrame(t); }; requestAnimationFrame(t); });
    await page.waitForTimeout(4200);
    const f = (await page.evaluate(() => window.__f.slice(6))).filter((x) => x < 500);
    const s = [...f].sort((a, b) => a - b);
    return { medianMs: +s[Math.floor(s.length / 2)].toFixed(2), p95Ms: +s[Math.floor(s.length * 0.95)].toFixed(2), over33: +((f.filter((x) => x > 33.4).length / f.length) * 100).toFixed(1) };
  };
  // browsing, with the ribbon drifting and the page scrolling
  if (!opts.isMobile) { await page.mouse.move(900, 450); for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(20); } }
  const browse = await sample();
  const glBrowse = await page.evaluate(() => window.__gl);
  // one case open
  await page.click('.browse__open');
  await page.waitForTimeout(1800);
  const open = await sample();
  const glOpen = await page.evaluate(() => window.__gl);
  const mem = await page.evaluate(() => ({ heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null, nodes: document.querySelectorAll('*').length }));
  await ctx.close();
  return { label, browse: { ...browse, ...glBrowse }, open: { ...open, ...glOpen }, ...mem };
}
report.desktop = await measure('desktop 1440×900', { width: 1440, height: 900 });
report.phone = await measure('phone 390×844', { width: 390, height: 844 }, { deviceScaleFactor: 2, isMobile: true, hasTouch: true });
// honesty: «до» and «после» are the same pixels on the open sheet
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const shot = async (q, clip) => { await page.goto(base + q, { waitUntil: 'networkidle' }); await page.waitForTimeout(2400); return page.screenshot({ clip }); };
  const clip = { x: 700, y: 150, width: 420, height: 480 };
  const a = await shot('?focus=2&u=1&mode=after', clip);
  const b = await shot('?focus=2&u=1&mode=before', clip);
  report.honesty = await page.evaluate(async ([x, y]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [A, B] = await Promise.all([load(x), load(y)]);
    const w = A.naturalWidth, h = A.naturalHeight;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d', { willReadFrequently: true });
    const lum = (img) => { g.clearRect(0, 0, w, h); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, w, h).data; const o = new Float32Array(w * h); for (let i = 0, p = 0; i < d.length; i += 4, p++) o[p] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; return o; };
    const grad = (src) => { const o = new Float32Array(w * h); for (let yy = 1; yy < h - 1; yy++) for (let xx = 1; xx < w - 1; xx++) { const i = yy * w + xx; o[i] = Math.abs(src[i + 1] - src[i - 1]) + Math.abs(src[i + w] - src[i - w]); } return o; };
    const ga = grad(lum(A)), gb = grad(lum(B));
    const sad = (dx, dy) => { let s = 0, n = 0; for (let yy = 8; yy < h - 8; yy += 2) for (let xx = 8; xx < w - 8; xx += 2) { s += Math.abs(ga[yy * w + xx] - gb[(yy + dy) * w + (xx + dx)]); n++; } return s / n; };
    const res = {}; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [0, 2]]) res[`${dx},${dy}`] = +sad(dx, dy).toFixed(3);
    const best = Object.entries(res).sort((p, q) => p[1] - q[1])[0];
    return { perShift: res, bestShift: best[0], zeroIsBest: best[0] === '0,0' };
  }, [`data:image/png;base64,${a.toString('base64')}`, `data:image/png;base64,${b.toString('base64')}`]);
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/perf.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
