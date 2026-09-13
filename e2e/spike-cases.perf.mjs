// Spike C technical report: frame rate under scroll, memory, layers, texture budget,
// and a pixel proof that the reveal window neither scales nor displaces the image.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/cases/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/cases/';
const browser = await chromium.launch({ channel: 'chrome' });
const report = {};

async function measure(label, viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('LayerTree.enable');
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1000);
  const top = await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.waitForTimeout(400);
  // rAF sampler across one full pass of the archive
  await page.evaluate(() => {
    window.__f = [];
    let last = performance.now();
    const tick = (t) => { window.__f.push(t - last); last = t; if (window.__f.length < 2000) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  const perCase = viewport.height; // 100 vh per case
  const steps = Math.round((perCase * 4) / 60);
  const watch = async () => page.evaluate(() => [...document.querySelectorAll('.plane')].filter((p) => p.style.visibility !== 'hidden' && Number(p.style.opacity) > 0.02).length);
  let maxPlanes = await watch();
  if (opts.isMobile) {
    const c = await page.context().newCDPSession(page);
    for (let i = 0; i < 5; i++) { await c.send('Input.synthesizeScrollGesture', { x: viewport.width / 2, y: viewport.height * 0.6, yDistance: -perCase * 0.8, speed: 1200, gestureSourceType: 'touch' }); maxPlanes = Math.max(maxPlanes, await watch()); await page.waitForTimeout(120); maxPlanes = Math.max(maxPlanes, await watch()); }
  } else {
    await page.mouse.move(400, 450);
    for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(12); if (i % 6 === 0) maxPlanes = Math.max(maxPlanes, await watch()); }
  }
  await page.waitForTimeout(400);
  const frames = await page.evaluate(() => window.__f.slice(5));
  const sorted = [...frames].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  const metrics = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
  const mem = await page.evaluate(() => {
    const imgs = [...document.images];
    const decoded = imgs.reduce((s, i) => s + i.naturalWidth * i.naturalHeight * 4, 0);
    return {
      heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(1) : null,
      images: imgs.length,
      decodedMB: +(decoded / 1048576).toFixed(1),
      largest: imgs.map((i) => `${i.naturalWidth}×${i.naturalHeight}`).sort((a, b) => Number(b.split('×')[0]) - Number(a.split('×')[0]))[0],

      nodes: document.querySelectorAll('*').length,
    };
  });
  const layers = await new Promise((res) => { cdp.once('LayerTree.layerTreeDidChange', (e) => res(e.layers?.length ?? null)); cdp.send('LayerTree.disable').then(() => cdp.send('LayerTree.enable')); });
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
    layoutCount: metrics.LayoutCount,
    recalcCount: metrics.RecalcStyleCount,
    layoutMs: +(metrics.LayoutDuration * 1000).toFixed(1),
    recalcMs: +(metrics.RecalcStyleDuration * 1000).toFixed(1),
    scriptMs: +(metrics.ScriptDuration * 1000).toFixed(1),
    compositedLayers: layers,
    maxVisiblePlanes: maxPlanes,
    ...mem,
  };
}

report.desktop = await measure('desktop 1440×900 · DPR 1', { width: 1440, height: 900 });
report.phone = await measure('phone 390×844 · DPR 2', { width: 390, height: 844 }, { deviceScaleFactor: 2, isMobile: true, hasTouch: true });

// ---- geometry proof: the window neither scales nor displaces the plate -------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const shot = async (q, clip) => { await page.goto(base + q, { waitUntil: 'networkidle' }); await page.waitForTimeout(700); return page.screenshot({ clip }); };
  await page.goto(base + '?c=2&p=0&mode=after', { waitUntil: 'networkidle' }); await page.waitForTimeout(600);
  const f = await page.evaluate(() => { const r = document.querySelector('.plane[data-active] .field').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
  // the window at wx .44 / wy .40 covers 46 % × 54 % of the field
  // inset well past the 7 px mineral edge band so only the image is compared
  // the reveal is an ellipse of radii 52 % × 66 % of the field, fully opaque out to
  // 55 % of those radii — this rectangle sits well inside that core
  const inner = { x: Math.round(f.x + f.w * (0.44 - 0.17)), y: Math.round(f.y + f.h * (0.4 - 0.22)), width: Math.round(f.w * 0.34), height: Math.round(f.h * 0.44) };
  // a corner more than a full radius from the reveal centre, where the feather is at zero
  const outer = { x: Math.round(f.x + f.w * 0.02), y: Math.round(f.y + f.h * 0.87), width: Math.round(f.w * 0.15), height: Math.round(f.h * 0.1) };
  const a = await shot('?c=2&p=0&wx=0.44&wy=0.4', inner); // window interior, compare mode
  const b = await shot('?c=2&p=0&mode=before', inner); // same region, full «до»
  const c = await shot('?c=2&p=0&wx=0.44&wy=0.4', outer); // outside the window, compare mode
  const d = await shot('?c=2&p=0&mode=after', outer); // same region, plain «после»
  const diff = async (x, y) => page.evaluate(async ([p, q]) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = s; });
    const [A, B] = await Promise.all([load(p), load(q)]);
    const cv = document.createElement('canvas'); cv.width = A.naturalWidth; cv.height = A.naturalHeight;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(A, 0, 0); const da = g.getImageData(0, 0, cv.width, cv.height).data;
    g.clearRect(0, 0, cv.width, cv.height); g.drawImage(B, 0, 0); const db = g.getImageData(0, 0, cv.width, cv.height).data;
    let max = 0, sum = 0, n = 0, differing = 0;
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      max = Math.max(max, d); sum += d; n++; if (d > 2) differing++;
    }
    return { maxDelta: max, meanDelta: +(sum / n).toFixed(3), differingPct: +((differing / n) * 100).toFixed(3), px: n };
  }, [`data:image/png;base64,${x.toString('base64')}`, `data:image/png;base64,${y.toString('base64')}`]);
  report.proof = {
    'reveal core vs full «до» (identical ⇒ nothing inside the reveal is scaled or moved)': await diff(a, b),
    'far outside the reveal vs plain «после» (identical ⇒ the rest of the plate is untouched)': await diff(c, d),
    note: 'pixel difference of the same screen regions, 0–255 per channel',
  };
  // css check: both layers are laid out by the same box
  await page.goto(base + '?c=2&p=0&wx=0.44&wy=0.4', { waitUntil: 'networkidle' }); await page.waitForTimeout(500);
  report.proof.layerGeometry = await page.evaluate(() => {
    const f = document.querySelector('.plane[data-active] .field');
    const after = f.querySelector(':scope > .field__plate').getBoundingClientRect();
    const before = f.querySelector('.field__before .field__plate').getBoundingClientRect();
    const t = getComputedStyle(f.querySelector('.field__before')).transform;
    return { afterBox: [after.x, after.y, after.width, after.height].map((n) => +n.toFixed(2)), beforeBox: [before.x, before.y, before.width, before.height].map((n) => +n.toFixed(2)), beforeTransform: t, identical: after.x === before.x && after.y === before.y && after.width === before.width && after.height === before.height };
  });
  await ctx.close();
}
await browser.close();
writeFileSync(`${OUT}/perf.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
