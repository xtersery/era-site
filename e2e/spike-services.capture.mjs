import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/services/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/services/';
const browser = await chromium.launch({ channel: 'chrome' });
const ready = async (page) => { await page.waitForFunction(() => window.__spike?.ready === true, null, { timeout: 20000 }); await page.waitForTimeout(900); };
const writeStrip = async (page, buffers, cols, file, labels) => {
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
const objectClip = { x: 600, y: 380, width: 840, height: 520 };
const TS = [0, 0.15, 0.5, 0.85, 1];
const LABELS = ['current · 02.1', 'transition start · t 0.15', 'middle · t 0.5', 'end · t 0.85', 'next active · 02.2'];
for (const dir of [1, 2, 3]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.goto(`${base}?dir=${dir}&t=0&hud=0`); await ready(page);
  await page.screenshot({ path: `${OUT}/d${dir}-desktop.png` });
  const frames = [];
  for (const t of TS) { await page.goto(`${base}?dir=${dir}&t=${t}&hud=0`); await ready(page); frames.push(await page.screenshot({ clip: objectClip })); }
  await writeStrip(page, frames, 5, `${OUT}/d${dir}-strip.png`, LABELS);
  await page.goto(`${base}?dir=${dir}&t=0.5&hud=0&dpr=2`); await ready(page);
  await page.screenshot({ path: `${OUT}/d${dir}-closeup.png`, clip: { x: 900, y: 430, width: 540, height: 470 } });
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(`${base}?dir=${dir}&t=0&hud=0&dpr=1.25`); await ready(mp);
  await mp.screenshot({ path: `${OUT}/d${dir}-mobile.png` });
  const mframes = [];
  for (const t of [0, 0.5, 1]) { await mp.goto(`${base}?dir=${dir}&t=${t}&hud=0&dpr=1.25`); await ready(mp); mframes.push(await mp.screenshot({ clip: { x: 0, y: 60, width: 390, height: 560 } })); }
  await writeStrip(mp, mframes, 3, `${OUT}/d${dir}-mobile-strip.png`, ['current', 'middle', 'next']);
  await m.close();
}
await browser.close(); console.log('done');
