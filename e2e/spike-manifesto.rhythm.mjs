// Манифест's vertical rhythm, measured on the INK (not the CSS boxes): for
// each voice of the statement and each line of the note, the cream glyphs'
// top/bottom inside its own box, then the visible gaps between them.
// SIZES as "WxH,WxH…" (phones get touch + DPR 2). Screenshots → __captures__/rhythm.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env['BASE'] ?? 'http://localhost:5173/';
const TAG = process.env['TAG'] ?? 'now';
const OUT = 'spikes/hero-stone/__captures__/rhythm';
mkdirSync(OUT, { recursive: true });
const SIZES = (process.env['SIZES'] ?? '1440x900,1280x800,390x844,430x932,390x693').split(',').map((s) => s.split('x').map(Number));
const browser = await chromium.launch({ channel: 'chrome' });
for (const [w, h] of SIZES) {
  const phone = w < 1024;
  const dpr = phone ? 2 : 1;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'ru-RU', deviceScaleFactor: dpr, ...(phone ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  if (phone) { await page.evaluate((y) => window.__lenis?.scrollTo(y, { immediate: true, force: true }), h); await page.waitForTimeout(1500); }
  else { await page.mouse.move(w / 2, h / 2); await page.mouse.wheel(0, 120); await page.waitForTimeout(9500); }
  const png = await page.screenshot({ path: `${OUT}/${TAG}-${w}x${h}.png` });
  const r = await page.evaluate(async ({ b64, dpr }) => {
    const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const q = (s) => document.querySelector(s);
    const head = q('.mf__heading').getBoundingClientRect(), note = q('.mf__text').getBoundingClientRect(), gk = q('.mf__obj--ginkgo').getBoundingClientRect();
    // one column: from the statement's left edge to the ginkgo (never into the gold), from the eyebrow to the note's foot
    const L = Math.round(head.left * dpr), R = Math.round(Math.min(head.right, gk.left + 4, innerWidth) * dpr);
    const T = Math.round(head.top * dpr), B = Math.round(note.bottom * dpr) + 2;
    const d = x.getImageData(L, T, R - L, B - T).data, W = R - L;
    const min = 6 * dpr; // a lone descender («у») is narrower than this: it never makes a band of its own
    const bands = []; let s = -1;
    for (let yy = 0; yy < B - T; yy++) {
      let n = 0;
      for (let xx = 0; xx < W; xx++) { const i = (yy * W + xx) * 4; const mn = Math.min(d[i], d[i + 1], d[i + 2]), mx = Math.max(d[i], d[i + 1], d[i + 2]); if (mn > 175 && mx - mn < 60) n++; }
      if (n >= min && s < 0) s = yy;
      if (n < min && s >= 0) { bands.push([s, yy - 1]); s = -1; }
    }
    if (s >= 0) bands.push([s, B - T - 1]);
    const css = bands.filter(([a, b]) => b - a >= 2 * dpr).map(([a, b]) => [+((T + a) / dpr).toFixed(1), +((T + b) / dpr).toFixed(1)]);
    const gaps = css.slice(1).map((b, i) => +(b[0] - css[i][1]).toFixed(1));
    const plate = q('.mf__plate').getBoundingClientRect();
    const fs = (e) => +parseFloat(getComputedStyle(q(e)).fontSize).toFixed(1);
    return {
      bands: css, gaps, plate: [+plate.top.toFixed(1), +plate.bottom.toFixed(1), Math.round(plate.left), Math.round(plate.right)],
      fontSize: { eyebrow: fs('.mf__line--eyebrow'), plate: fs('.mf__line--plate'), soft: fs('.mf__line--soft'), grand: fs('.mf__line--grand'), note: fs('.mf__text') },
      ginkgo: [gk.left, gk.top, gk.width, gk.height].map(Math.round), docW: document.documentElement.scrollWidth,
    };
  }, { b64: png.toString('base64'), dpr });
  console.log(`${TAG} ${w}x${h}`, JSON.stringify(r));
  await ctx.close();
}
await browser.close();
