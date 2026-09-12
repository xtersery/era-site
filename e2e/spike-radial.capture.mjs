import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/radial/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/radial/';
const browser = await chromium.launch({ channel: 'chrome' });
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200); };
const strip = async (page, buffers, cols, file, labels) => {
  const data = await page.evaluate(async ({ srcs, cols, labels }) => {
    const imgs = await Promise.all(srcs.map((s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; })));
    const w = imgs[0].naturalWidth, h = imgs[0].naturalHeight, gap = 8, lab = 28;
    const rows = Math.ceil(imgs.length / cols);
    const c = document.createElement('canvas'); c.width = cols * (w + gap) + gap; c.height = rows * (h + lab + gap) + gap;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#08140f'; ctx.fillRect(0, 0, c.width, c.height);
    imgs.forEach((img, i) => { const x = gap + (i % cols) * (w + gap), y = gap + Math.floor(i / cols) * (h + lab + gap); ctx.drawImage(img, x, y); ctx.fillStyle = '#98a39c'; ctx.font = '13px JetBrains Mono, monospace'; ctx.fillText(labels[i] ?? '', x, y + h + 19); });
    return c.toDataURL('image/png');
  }, { srcs: buffers.map((b) => 'data:image/png;base64,' + b.toString('base64')), cols, labels });
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
};
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  const TS = [0, 0.15, 0.28, 0.38, 0.47, 0.56, 0.66, 0.8, 1];
  const frames = [];
  for (const t of TS) { await page.goto(`${base}?t=${t}&hud=0`, { waitUntil: 'networkidle' }); await settle(page); await page.screenshot({ path: `${OUT}/d-t${t}.png` }); frames.push(await page.screenshot()); }
  await strip(page, frames, 3, `${OUT}/desktop-sequence.png`, TS.map((t) => `t ${t}`));
  await page.goto(`${base}?t=0&hud=0`); await settle(page);
  await page.screenshot({ path: `${OUT}/nav-rest.png`, clip: { x: 0, y: 0, width: 560, height: 900 } });
  await page.goto(`${base}?t=0.5&hud=0`); await settle(page);
  await page.screenshot({ path: `${OUT}/nav-turning.png`, clip: { x: 0, y: 0, width: 560, height: 900 } });
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  const frames = [];
  const TS = [0, 0.3, 0.47, 0.64, 1];
  for (const t of TS) { await page.goto(`${base}?t=${t}&hud=0`, { waitUntil: 'networkidle' }); await settle(page); await page.screenshot({ path: `${OUT}/m-t${t}.png` }); frames.push(await page.screenshot()); }
  await strip(page, frames, 5, `${OUT}/mobile-sequence.png`, TS.map((t) => `t ${t}`));
  await m.close();
}
await browser.close(); console.log('done');
