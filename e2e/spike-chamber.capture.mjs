import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/chamber/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/chamber/';
const browser = await chromium.launch({ channel: 'chrome' });
const ready = async (page) => { await page.waitForFunction(() => window.__spike?.ready === true, null, { timeout: 20000 }); await page.waitForTimeout(1300); };
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
const TS = [0, 0.12, 0.3, 0.5, 0.75, 1];
const LABELS = ['1 · state A · 02.1 frontal', '2 · begin rotation · t 0.12', '3 · turning · t 0.30', '4 · mid rotation · t 0.50', '5 · arriving · t 0.75', '6 · state B · 02.2 frontal'];
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  const frames = [];
  for (const [i, t] of TS.entries()) {
    await page.goto(`${base}?t=${t}&hud=0`); await ready(page);
    await page.screenshot({ path: `${OUT}/desktop-${i + 1}-t${t}.png` });
    frames.push(await page.screenshot({ clip: { x: 560, y: 250, width: 880, height: 650 } }));
  }
  await strip(page, frames, 3, `${OUT}/desktop-sequence.png`, LABELS);
  await page.goto(`${base}?t=0.3&hud=0&dpr=2`); await ready(page);
  await page.screenshot({ path: `${OUT}/closeup-t0.3.png`, clip: { x: 968, y: 274, width: 432, height: 626 } });
  await page.goto(`${base}?t=0.12&hud=0&dpr=2`); await ready(page);
  await page.screenshot({ path: `${OUT}/closeup-t0.12.png`, clip: { x: 968, y: 274, width: 432, height: 626 } });
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  const frames = [];
  for (const [i, t] of [0, 0.5, 1].entries()) {
    await page.goto(`${base}?t=${t}&hud=0&dpr=1.25`); await ready(page);
    await page.evaluate(() => { const r = document.querySelector('[data-stage-anchor="services-field"]').getBoundingClientRect(); window.scrollTo({ top: window.scrollY + r.top - 72, behavior: 'instant' }); });
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/mobile-${i + 1}-t${t}.png` });
    frames.push(await page.screenshot());
  }
  await strip(page, frames, 3, `${OUT}/mobile-sequence.png`, ['8 · mobile state A', '9 · mobile mid-transition', '10 · mobile state B']);
  await m.close();
}
await browser.close(); console.log('done');
