// Stills and strips for the Spike D pass-1 board (the sitting).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/portraits/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/portraits/';
const browser = await chromium.launch({ channel: 'chrome' });
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(2200); };
const strip = async (page, files, cols, out) => {
  const data = await page.evaluate(async ({ srcs, cols }) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const imgs = await Promise.all(srcs.map(load));
    const w = imgs[0].naturalWidth, h = imgs[0].naturalHeight, gap = 6;
    const rows = Math.ceil(imgs.length / cols);
    const c = document.createElement('canvas'); c.width = cols * (w + gap) + gap; c.height = rows * (h + gap) + gap;
    const g = c.getContext('2d'); g.fillStyle = '#0b1611'; g.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => g.drawImage(im, gap + (i % cols) * (w + gap), gap + Math.floor(i / cols) * (h + gap)));
    return c.toDataURL('image/png');
  }, { srcs: files.map((f) => 'data:image/png;base64,' + readFileSync(f).toString('base64')), cols });
  writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
};
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  const shot = async (q, name, clip) => { await page.goto(base + q, { waitUntil: 'networkidle' }); await settle(page); const f = `${OUT}/${name}.png`; await page.screenshot({ path: f, clip }); return f; };
  await shot('?k=0', 'd1-rest-1');
  await shot('?k=1', 'd2-rest-2');
  await shot('?k=2', 'd3-rest-3');
  await shot('?k=3', 'd3b-rest-4');
  await strip(page, [`${OUT}/d1-rest-1.png`, `${OUT}/d2-rest-2.png`, `${OUT}/d3-rest-3.png`, `${OUT}/d3b-rest-4.png`], 2, `${OUT}/d0-grid.png`);
  await shot('?k=0', 'd4-focal', { x: 20, y: 120, width: 1060, height: 260 });
  const tr = [];
  for (const [i, f] of [0, 0.12, 0.24, 0.36, 0.46, 0.56, 0.66, 0.78, 0.9, 1].entries()) tr.push(await shot(`?k=1&f=${f}`, `tr-${i}`));
  await strip(page, tr, 5, `${OUT}/d5-transition.png`);
  // the object, close: the frame only, at three moments
  const det = [];
  for (const [i, f] of [0.3, 0.46, 0.62].entries()) det.push(await shot(`?k=1&f=${f}`, `det-${i}`, { x: 634, y: 0, width: 806, height: 900 }));
  await strip(page, det, 3, `${OUT}/d6-shard.png`);
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  const shot = async (q, name) => { await page.goto(base + q, { waitUntil: 'networkidle' }); await settle(page); const f = `${OUT}/${name}.png`; await page.screenshot({ path: f }); return f; };
  await shot('?k=0', 'm1-rest-1');
  await shot('?k=0&f=0.5', 'm2-mid');
  await shot('?k=2', 'm3-rest-2');
  const mt = [];
  for (const [i, f] of [0, 0.3, 0.5, 0.7, 0.85, 1].entries()) mt.push(await shot(`?k=2&f=${f}`, `mt-${i}`));
  await strip(page, mt, 6, `${OUT}/m4-transition.png`);
  await m.close();
}
await browser.close();
console.log('captured');
