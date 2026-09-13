// Stills and strips for the Spike C pass-3 board (the passage).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/portal/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/portal/';
const browser = await chromium.launch({ channel: 'chrome' });
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(2300); };
const strip = async (page, files, cols, out) => {
  const data = await page.evaluate(async ({ srcs, cols }) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const imgs = await Promise.all(srcs.map(load));
    const w = imgs[0].naturalWidth, h = imgs[0].naturalHeight, gap = 6;
    const rows = Math.ceil(imgs.length / cols);
    const c = document.createElement('canvas'); c.width = cols * (w + gap) + gap; c.height = rows * (h + gap) + gap;
    const g = c.getContext('2d'); g.fillStyle = '#050d0a'; g.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => g.drawImage(im, gap + (i % cols) * (w + gap), gap + Math.floor(i / cols) * (h + gap)));
    return c.toDataURL('image/png');
  }, { srcs: files.map((f) => 'data:image/png;base64,' + readFileSync(f).toString('base64')), cols });
  writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
};
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  const shot = async (q, name) => { await page.goto(base + q, { waitUntil: 'networkidle' }); await settle(page); const f = `${OUT}/${name}.png`; await page.screenshot({ path: f }); return f; };
  await shot('?c=0&p=0&mode=after', 'd1-dock');
  await shot('?c=1&p=0&mode=after', 'd2-dock-case2');
  await shot('?c=0&p=0&mode=before', 'd3-before');
  await shot('?c=0&p=0&fx=0.62&fy=0.44', 'd4-compare');
  await shot('?c=3&p=0&mode=after', 'd5-dock-case4');
  // the walk: dock → approach → cross → release → arrive
  const walk = [];
  for (const [i, f] of [0.52, 0.68, 0.76, 0.82, 0.87, 0.91, 0.96, 1].entries()) walk.push(await shot(`?c=0&p=${f}&mode=after`, `w-${i}`));
  await strip(page, walk, 4, `${OUT}/walk-strip.png`);
  // the threshold's material, close
  await page.goto(base + '?c=0&p=0&mode=after', { waitUntil: 'networkidle' }); await settle(page);
  await page.screenshot({ path: `${OUT}/d6-material.png`, clip: { x: 900, y: 80, width: 540, height: 620 } });
  await page.screenshot({ path: `${OUT}/d7-aperture.png`, clip: { x: 430, y: 150, width: 620, height: 600 } });
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  const shot = async (q, name) => { await page.goto(base + q, { waitUntil: 'networkidle' }); await settle(page); const f = `${OUT}/${name}.png`; await page.screenshot({ path: f }); return f; };
  await shot('?c=0&p=0&mode=after', 'm1-dock');
  await shot('?c=0&p=0&mode=before', 'm2-before');
  const mw = [];
  for (const [i, f] of [0.52, 0.78, 0.87, 0.94, 1].entries()) mw.push(await shot(`?c=0&p=${f}&mode=after`, `mw-${i}`));
  await strip(page, mw, 5, `${OUT}/m3-walk.png`);
  await m.close();
}
await browser.close();
console.log('captured');
