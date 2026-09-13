// Stills and live strips for the Spike C board.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/cases/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/cases/';
const browser = await chromium.launch({ channel: 'chrome' });
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(800); };
const strip = async (page, files, cols, out) => {
  const data = await page.evaluate(async ({ srcs, cols }) => {
    const imgs = await Promise.all(srcs.map((s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; })));
    const w = imgs[0].naturalWidth, h = imgs[0].naturalHeight, gap = 6;
    const rows = Math.ceil(imgs.length / cols);
    const c = document.createElement('canvas'); c.width = cols * (w + gap) + gap; c.height = rows * (h + gap) + gap;
    const x = c.getContext('2d'); x.fillStyle = '#07110d'; x.fillRect(0, 0, c.width, c.height);
    imgs.forEach((im, i) => x.drawImage(im, gap + (i % cols) * (w + gap), gap + Math.floor(i / cols) * (h + gap)));
    return c.toDataURL('image/png');
  }, { srcs: files.map((f) => 'data:image/png;base64,' + readFileSync(f).toString('base64')), cols });
  writeFileSync(out, Buffer.from(data.split(',')[1], 'base64'));
};
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  const shot = async (q, name) => { await page.goto(base + q, { waitUntil: 'networkidle' }); await settle(page); await page.screenshot({ path: `${OUT}/${name}.png` }); return `${OUT}/${name}.png`; };
  // 1 active case · 2 depth state (between docks, the archive visible) · 4/5 reveal positions
  await shot('?c=0&p=0&mode=after', 'd1-active');
  await shot('?c=0&p=0.8', 'd2-depth');
  await shot('?c=0&p=0&wx=0.46&wy=0.42', 'd4-reveal-centre');
  await shot('?c=0&p=0&wx=0.88&wy=0.84', 'd5-reveal-edge');
  await shot('?c=1&p=0&mode=before', 'd-before-full');
  await shot('?c=2&p=0&wx=0.46&wy=0.4', 'd-case3');
  await shot('?c=3&p=0&wx=0.5&wy=0.45', 'd-case4');
  // 3 transition, 8 frames
  const frames = [];
  for (const [i, p] of [0.5, 0.6, 0.67, 0.73, 0.79, 0.86, 0.93, 1].entries()) frames.push(await shot(`?c=0&p=${p}&mode=after`, `d3-t${i}`));
  await strip(page, frames, 4, `${OUT}/d3-transition.png`);
  // 6 close-up proving no distortion: the window edge across the eye, with and without the grid
  // the pointer sits right of centre so the reveal's leading edge crosses the cheek
  await page.goto(base + '?c=2&p=0&wx=0.62&wy=0.5', { waitUntil: 'networkidle' }); await settle(page);
  const box = await page.evaluate(() => { const r = document.querySelector('.plane[data-active] .field').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  const clip = { x: Math.round(box.x + box.width * 0.02), y: Math.round(box.y + box.height * 0.14), width: Math.round(box.width * 0.84), height: Math.round(box.height * 0.52) };
  await page.screenshot({ path: `${OUT}/d6-closeup.png`, clip });
  await page.goto(base + '?c=2&p=0&wx=0.62&wy=0.5&grid=1', { waitUntil: 'networkidle' }); await settle(page);
  await page.screenshot({ path: `${OUT}/d6-closeup-grid.png`, clip });
  // the reveal arc and its glint, very close
  await page.goto(base + '?c=0&p=0&wx=0.56&wy=0.46', { waitUntil: 'networkidle' }); await settle(page);
  const b2 = await page.evaluate(() => { const r = document.querySelector('.plane[data-active] .field').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
  await page.screenshot({ path: `${OUT}/d6-rim.png`, clip: { x: Math.round(b2.x + b2.width * 0.04), y: Math.round(b2.y + b2.height * 0.04), width: Math.round(b2.width * 0.6), height: Math.round(b2.height * 0.38) } });
  await ctx.close();
}
{
  // live: scroll drives the archive; screenshots taken while it moves
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' }); await settle(page);
  const top = await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top); await page.waitForTimeout(500);
  await page.mouse.move(400, 450);
  const live = [];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 5; j++) { await page.mouse.wheel(0, 110); await page.waitForTimeout(24); }
    await page.waitForTimeout(90);
    const f = `${OUT}/live-${i}.png`; await page.screenshot({ path: f }); live.push(f);
  }
  await strip(page, live, 4, `${OUT}/live-strip.png`);
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  const shot = async (q, name) => { await page.goto(base + q, { waitUntil: 'networkidle' }); await settle(page); await page.screenshot({ path: `${OUT}/${name}.png` }); return `${OUT}/${name}.png`; };
  await shot('?c=0&p=0&mode=after', 'm7-active');
  await shot('?c=0&p=0&mode=before', 'm8-before');
  await shot('?c=0&p=0&wx=0.5&wy=0.42', 'm8-window');
  await shot('?c=0&p=0&wx=0.68&wy=0.5', 'm8-window-edge');
  const mf = [];
  for (const [i, p] of [0.5, 0.68, 0.78, 0.88, 1].entries()) mf.push(await shot(`?c=0&p=${p}&mode=after`, `m9-t${i}`));
  await strip(page, mf, 5, `${OUT}/m9-transition.png`);
  await m.close();
}
await browser.close();
console.log('captured');
