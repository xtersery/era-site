// Stills and strips for the Spike D pass-1 board (the sitting).
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/portraits/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/portraits/';
const q = (x) => x + '&diag=0';
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
  const shot = async (qs, name, clip) => { await page.goto(base + q(qs), { waitUntil: 'networkidle' }); await settle(page); const f = `${OUT}/${name}.png`; await page.screenshot({ path: f, clip }); return f; };
  await shot('?k=0', 'd1-rest-1');
  await shot('?k=1', 'd2-rest-2');
  await shot('?k=2', 'd3-rest-3');
  await shot('?k=3', 'd3b-rest-4');
  await strip(page, [`${OUT}/d1-rest-1.png`, `${OUT}/d2-rest-2.png`, `${OUT}/d3-rest-3.png`, `${OUT}/d3b-rest-4.png`], 2, `${OUT}/d0-grid.png`);
  await shot('?k=0', 'd4-focal', { x: 20, y: 120, width: 1060, height: 260 });
  const tr = [];
  for (const [i, f] of [0, 0.1, 0.2, 0.3, 0.42, 0.55, 0.68, 0.8, 0.9, 1].entries()) tr.push(await shot(`?k=1&f=${f}`, `tr-${i}`));
  await strip(page, tr, 5, `${OUT}/d5-transition.png`);
  // the object, close: the frame only, at three moments
  const det = [];
  for (const [i, f] of [0, 0.3, 0.55].entries()) det.push(await shot(`?k=1&f=${f}`, `det-${i}`, { x: 300, y: 60, width: 640, height: 780 }));
  await strip(page, det, 3, `${OUT}/d6-shard.png`);
  // the two materials, side by side at the same scale: the quartz's smoke and the wall's graphite band
  {
    const data = await page.evaluate(async ({ q, w }) => {
      const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
      const [qi, wi] = await Promise.all([load(q), load(w)]);
      const H = 700, gap = 8;
      const qw = Math.round((qi.naturalWidth / qi.naturalHeight) * H);
      const c = document.createElement('canvas'); c.width = qw + gap + 1100; c.height = H;
      const g = c.getContext('2d'); g.fillStyle = '#0b1611'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#e9ebe6'; g.fillRect(0, 0, qw, H);
      g.drawImage(qi, 0, 0, qw, H);
      // the wall: the window the section lays on its width, at the scale the section shows it
      g.drawImage(wi, 784, 120, 836, 532, qw + gap, 0, 1100, H);
      return c.toDataURL('image/png');
    }, { q: 'data:image/png;base64,' + readFileSync('src/assets/smoky-quartz.png').toString('base64'), w: 'data:image/png;base64,' + readFileSync('docs/references/wallpapers.png').toString('base64') });
    writeFileSync(`${OUT}/d7a-materials.png`, Buffer.from(data.split(',')[1], 'base64'));
  }
  // the exit: smoky quartz → the clinic's marble wall, in five stages
  const ex = [];
  for (const [i, e] of [0, 0.22, 0.5, 0.75, 1].entries()) ex.push(await shot(`?k=3&e=${e}`, `ex-${i}`));
  await strip(page, ex.slice(1, 5), 2, `${OUT}/d7-exit-grid.png`);
  const exd = [];
  for (const [i, e] of [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].entries()) exd.push(await shot(`?k=3&e=${e}`, `exd-${i}`, { x: 240, y: 60, width: 760, height: 780 }));
  await strip(page, exd, 4, `${OUT}/d8-exit-stone.png`);
  // the entry into the next section: the live page scrolled past the pin
  await page.goto(base + q('?'), { waitUntil: 'networkidle' }); await settle(page);
  const founderTop = await page.evaluate(() => document.querySelector('.founder-opening').getBoundingClientRect().top + scrollY);
  const en = [];
  for (const [i, dy] of [-900, -560, -200, 120, 700].entries()) {
    await page.evaluate((y) => window.scrollTo(0, y), founderTop + dy);
    await page.waitForTimeout(1500);
    const f = `${OUT}/en-${i}.png`; await page.screenshot({ path: f }); en.push(f);
  }
  await strip(page, en, 5, `${OUT}/d9-entry.png`);
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  const shot = async (qs, name) => { await page.goto(base + q(qs), { waitUntil: 'networkidle' }); await settle(page); const f = `${OUT}/${name}.png`; await page.screenshot({ path: f }); return f; };
  await shot('?k=0', 'm1-rest-1');
  await shot('?k=0&f=0.5', 'm2-mid');
  await shot('?k=2', 'm3-rest-2');
  const mt = [];
  for (const [i, f] of [0, 0.3, 0.5, 0.7, 0.85, 1].entries()) mt.push(await shot(`?k=2&f=${f}`, `mt-${i}`));
  await strip(page, mt, 6, `${OUT}/m4-transition.png`);
  const me = [];
  for (const [i, e] of [0, 0.25, 0.5, 0.75, 1].entries()) me.push(await shot(`?k=2&e=${e}`, `me-${i}`));
  await strip(page, me, 5, `${OUT}/m5-exit.png`);
  await m.close();
}
await browser.close();
console.log('captured');
