// Spike C pass 3 — technical report and the honesty proof for the passage.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/portal/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/portal/';
const browser = await chromium.launch({ channel: 'chrome' });
const report = {};

async function measure(label, viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  const top = await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    window.__f = [];
    let last = performance.now();
    const tick = (t) => { window.__f.push(t - last); last = t; if (window.__f.length < 2500) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const per = viewport.height * 1.1;
  if (opts.isMobile) {
    const c = await page.context().newCDPSession(page);
    for (let i = 0; i < 6; i++) { await c.send('Input.synthesizeScrollGesture', { x: viewport.width / 2, y: viewport.height * 0.6, yDistance: -per * 0.7, speed: 1100, gestureSourceType: 'touch' }); await page.waitForTimeout(140); }
  } else {
    await page.mouse.move(700, 450);
    for (let i = 0; i < Math.round((per * 4) / 60); i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(12); }
  }
  await page.waitForTimeout(500);
  const frames = (await page.evaluate(() => window.__f.slice(8))).filter((f) => f < 500);
  const sorted = [...frames].sort((a, b) => a - b);
  const pct = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
  const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const gl = await page.evaluate(() => window.__gl ?? null);
  const mem = await page.evaluate(() => ({
    heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
    nodes: document.querySelectorAll('*').length,
  }));
  await ctx.close();
  return {
    label,
    frames: frames.length,
    medianMs: +pct(0.5).toFixed(2),
    p95Ms: +pct(0.95).toFixed(2),
    worstMs: +sorted[sorted.length - 1].toFixed(2),
    fpsMedian: +(1000 / pct(0.5)).toFixed(0),
    over16ms: +((frames.filter((f) => f > 16.7).length / frames.length) * 100).toFixed(1),
    over33ms: +((frames.filter((f) => f > 33.4).length / frames.length) * 100).toFixed(1),
    scriptMs: +(metrics.ScriptDuration * 1000).toFixed(1),
    gpuMemoryMB: metrics.GPUMemoryUsageKB ? +(metrics.GPUMemoryUsageKB / 1024).toFixed(1) : null,
    ...gl,
    ...mem,
  };
}

report.desktop = await measure('desktop 1440×900 · DPR 1.6 cap', { width: 1440, height: 900 });
report.phone = await measure('phone 390×844 · DPR 2', { width: 390, height: 844 }, { deviceScaleFactor: 2, isMobile: true, hasTouch: true });

// ---- honesty proof: «до» and «после» are the same pixels, moved by nothing ----
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const shot = async (q, clip) => { await page.goto(base + q, { waitUntil: 'networkidle' }); await page.waitForTimeout(2300); return page.screenshot({ clip }); };
  const clip = { x: 470, y: 210, width: 520, height: 480 }; // the case inside the aperture
  const after = await shot('?c=0&p=0&mode=after', clip);
  const before = await shot('?c=0&p=0&mode=before', clip);
  // if the two states were displaced or scaled, the best alignment would not be at zero shift
  const align = await page.evaluate(async ([a, b]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    const w = A.naturalWidth, h = A.naturalHeight;
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const lum = (img) => {
      g.clearRect(0, 0, w, h); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, w, h).data;
      const out = new Float32Array(w * h);
      for (let i = 0, p = 0; i < d.length; i += 4, p++) out[p] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return out;
    };
    // gradient magnitude — compares structure (edges), not tone
    const grad = (src) => {
      const out = new Float32Array(w * h);
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        out[i] = Math.abs(src[i + 1] - src[i - 1]) + Math.abs(src[i + w] - src[i - w]);
      }
      return out;
    };
    const ga = grad(lum(A)), gb = grad(lum(B));
    const sad = (dx, dy) => {
      let s = 0, n = 0;
      for (let y = 8; y < h - 8; y += 2) for (let x = 8; x < w - 8; x += 2) {
        s += Math.abs(ga[y * w + x] - gb[(y + dy) * w + (x + dx)]); n++;
      }
      return s / n;
    };
    const res = {};
    for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [3, 3], [-3, -3]]) res[`${dx},${dy}`] = +sad(dx, dy).toFixed(3);
    const best = Object.entries(res).sort((p, q) => p[1] - q[1])[0];
    return { perShift: res, bestShift: best[0], bestValue: best[1], zeroIsBest: best[0] === '0,0' };
  }, [`data:image/png;base64,${after.toString('base64')}`, `data:image/png;base64,${before.toString('base64')}`]);
  report.honesty = {
    note: 'edge-structure alignment between «после» and «до» in the docked case; the two states are one plane, one uv set, mixed by opacity only',
    ...align,
  };
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/perf.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
