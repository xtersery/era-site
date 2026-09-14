// Stills for the Spike E board: the storyboard's ten moments, the phone, the
// camera path sampled from the scene, and a scrub of the pinned page.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/mineral/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/mineral/';
const browser = await chromium.launch({ channel: 'chrome' });
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(2400); };
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
export const MOMENTS = [0, 0.2, 0.34, 0.44, 0.54, 0.64, 0.72, 0.8, 0.9, 1];
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  const shot = async (qs, name) => { await page.goto(base + qs, { waitUntil: 'networkidle' }); await settle(page); const f = `${OUT}/${name}.png`; await page.screenshot({ path: f }); return f; };
  const frames = [];
  for (const [i, t] of MOMENTS.entries()) frames.push(await shot(`?t=${t}&hud=0`, `sb-${i}`));
  await strip(page, frames.slice(0, 5), 5, `${OUT}/storyboard-a.png`);
  await strip(page, frames.slice(5, 10), 5, `${OUT}/storyboard-b.png`);
  // the camera path, sampled from the scene
  await page.goto(base + '?t=0&hud=0', { waitUntil: 'networkidle' }); await settle(page);
  const path = await page.evaluate(() => {
    const P = window.__passage;
    const pts = [];
    for (let i = 0; i <= 100; i++) { const t = i / 100; const p = P.path.pos.getPointAt(P.path.u(t)); const q = P.path.target.getPointAt(P.path.uTarget(t)); pts.push({ t, p: [p.x, p.y, p.z], q: [q.x, q.y, q.z] }); }
    return { pts, stone: P.stoneBox, wallZ: P.wallZ };
  });
  writeFileSync(`${OUT}/path.json`, JSON.stringify(path));
  // the scrub: the pinned page, wheel through, frame times
  await page.goto(base + '?hud=0', { waitUntil: 'networkidle' }); await settle(page);
  const fps = await page.evaluate(async () => {
    const frames = [];
    let last = performance.now();
    let on = true;
    const tick = (now) => { frames.push(now - last); last = now; if (on) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    for (let i = 0; i < 90; i++) { window.scrollBy(0, 70); await new Promise((r) => setTimeout(r, 40)); }
    on = false;
    frames.sort((a, b) => a - b);
    const q = (p) => frames[Math.floor(frames.length * p)];
    return { n: frames.length, median: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), over33: +((frames.filter((f) => f > 33).length / frames.length) * 100).toFixed(1), t: window.__passage ? undefined : null };
  });
  writeFileSync(`${OUT}/fps.json`, JSON.stringify(fps));
  console.log('scrub', JSON.stringify(fps));
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  const shot = async (qs, name) => { await page.goto(base + qs, { waitUntil: 'networkidle' }); await settle(page); const f = `${OUT}/${name}.png`; await page.screenshot({ path: f }); return f; };
  const ph = [];
  for (const [i, t] of [0, 0.36, 0.54, 0.72, 1].entries()) ph.push(await shot(`?t=${t}&hud=0`, `ph-${i}`));
  await strip(page, ph, 5, `${OUT}/phone.png`);
  await m.close();
}
await browser.close();
console.log('captured');
