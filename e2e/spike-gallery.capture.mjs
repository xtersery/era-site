// Stills and strips for the Spike C pass-5 board (the archive on a rail).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/gallery/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/gallery/';
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
  await shot('?c=0&p=0', 'd1-browse');
  await shot('?c=2&p=0.66', 'd2-browse-3');
  await shot('?focus=2&u=1&mode=after', 'd3-open');
  await shot('?focus=2&u=1&mode=before', 'd4-open-before');
  await shot('?focus=2&u=1&fx=0.58&fy=0.42', 'd5-open-compare');
  // the unfold, six frames
  const un = [];
  for (const [i, u] of [0, 0.2, 0.38, 0.56, 0.76, 1].entries()) un.push(await shot(`?focus=2&u=${u}&mode=after`, `u-${i}`));
  await strip(page, un, 3, `${OUT}/d6-unfold.png`);
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  const shot = async (q, name) => { await page.goto(base + q, { waitUntil: 'networkidle' }); await settle(page); const f = `${OUT}/${name}.png`; await page.screenshot({ path: f }); return f; };
  await shot('?c=1&p=0.33', 'm1-browse');
  await shot('?focus=1&u=1&mode=after', 'm2-open');
  await shot('?focus=1&u=1&mode=before', 'm3-open-before');
  const mu = [];
  for (const [i, u] of [0, 0.35, 0.65, 1].entries()) mu.push(await shot(`?focus=1&u=${u}&mode=after`, `mu-${i}`));
  await strip(page, mu, 4, `${OUT}/m4-unfold.png`);
  await m.close();
}
await browser.close();
console.log('captured');
