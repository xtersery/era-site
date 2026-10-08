// Profiles the integrated spike: Hero idle → first wheel → film → landing → settle.
// Reports rAF sources, long tasks, frame-time percentiles per phase, ST/canvas counts.
//   BASE=http://localhost:5173/spikes/full/ node e2e/spike-full.perf.mjs [trace]
// `trace` also writes a Chrome trace (spikes/full/__captures__/trace.json, or $TRACE).
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env['BASE'] ?? 'http://localhost:5173/spikes/full/';
const trace = process.argv.includes('trace');
const width = 1440, height = 900;
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu-rasterization'] });
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, locale: 'ru-RU' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('sanity')) errors.push(m.text()); });

await page.addInitScript(() => {
  // --- rAF source accounting -------------------------------------------
  const sources = new Map();
  const rafOrig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => {
    const stack = (new Error().stack || '').split('\n').slice(2, 5).map((s) => s.trim().replace(/^at /, '').replace(/\?t=\d+/g, '').replace(/https?:\/\/[^/]+/g, '')).join(' < ');
    sources.set(stack, (sources.get(stack) || 0) + 1);
    return rafOrig(cb);
  };
  window.__rafSources = sources;
  window.__rafReset = () => sources.clear();
  // --- frame timing -----------------------------------------------------
  const frames = [];
  let last = performance.now();
  const tick = (now) => { frames.push(now - last); last = now; rafOrig(tick); };
  rafOrig(tick);
  window.__frames = frames;
  window.__framesReset = () => { frames.length = 0; last = performance.now(); };
  // --- long tasks -------------------------------------------------------
  const longs = [];
  try {
    new PerformanceObserver((list) => { for (const e of list.getEntries()) longs.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true });
  } catch {}
  window.__longs = longs;
  // --- Lenis instance count --------------------------------------------
  window.__lenisCount = 0;
  // --- React commit count (dev only) ------------------------------------
  window.__renders = 0;
  // --- ScrollTrigger.refresh count ---------------------------------------
  window.__refreshes = [];
  // --- setState per frame detection: count scheduler messages? use React DevTools hook
  const hook = { renderers: new Map(), supportsFiber: true, inject(r) { this.renderers.set(1, r); return 1; }, onCommitFiberRoot() { window.__renders++; }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {}, isDisabled: false, on() {}, off() {}, emit() {}, sub() {} };
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = hook;
});

await page.goto(base + '?transitionDebug=1', { waitUntil: 'load', timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
// hook ScrollTrigger.refresh once the module is up
await page.evaluate(() => {
  const ST = window.__ST; if (!ST) return;
  const orig = ST.refresh.bind(ST);
  ST.refresh = (...a) => { const t0 = performance.now(); const r = orig(...a); window.__refreshes.push({ t: Math.round(t0), d: +(performance.now() - t0).toFixed(1), stack: (new Error().stack || '').split('\n').slice(2, 4).map((s) => s.trim().replace(/https?:\/\/[^/]+/g, '').replace(/\?t=\d+/g, '')).join(' < ') }); return r; };
  ST.addEventListener('refresh', () => { window.__refreshEvents = (window.__refreshEvents || 0) + 1; });
});
await page.waitForTimeout(3000);

const snapshot = (label) => page.evaluate((label) => {
  const f = window.__frames.slice();
  const sorted = [...f].sort((a, b) => a - b);
  const p = (q) => sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))].toFixed(1) : null;
  const ST = window.__ST;
  const tickerListeners = window.__gsap?.ticker?._listeners?.length ?? null;
  const res = {
    label,
    frames: f.length,
    fps: f.length ? +(1000 / (f.reduce((a, b) => a + b, 0) / f.length)).toFixed(1) : null,
    p50: p(0.5), p90: p(0.9), p99: p(0.99), max: sorted.length ? +sorted[sorted.length - 1].toFixed(1) : null,
    over33: f.filter((x) => x > 33).length,
    over100: f.filter((x) => x > 100).length,
    longs: window.__longs.splice(0),
    renders: window.__renders,
    st: ST ? ST.getAll().length : null,
    pins: ST ? ST.getAll().filter((t) => t.pin).length : null,
    canvases: document.querySelectorAll('canvas').length,
    tickerListeners,
    transition: window.__transition ? `${window.__transition.status}@${window.__transition.progress.toFixed(2)} locked=${window.__transition.locked} side=${window.__transition.side}` : null,
    y: Math.round(scrollY),
    refreshes: window.__refreshes.splice(0),
    raf: [...window.__rafSources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
  };
  window.__renders = 0;
  window.__framesReset();
  window.__rafReset();
  return res;
}, label);

const print = (s) => {
  console.log(`\n### ${s.label}  — ${s.frames} frames · fps ${s.fps} · p50 ${s.p50} p90 ${s.p90} p99 ${s.p99} max ${s.max} ms · >33ms ${s.over33} · >100ms ${s.over100} · React commits ${s.renders} · ST ${s.st} (pins ${s.pins}) · canvases ${s.canvases} · ticker ${s.tickerListeners} · heap ${s.heap}MB · y ${s.y} · ${s.transition}`);
  if (s.longs.length) console.log('   long tasks:', s.longs.map((l) => `${l.d}ms@${l.t}`).join(' '));
  if (s.refreshes.length) console.log('   ST.refresh:', s.refreshes.map((r) => `${r.d}ms@${r.t} [${r.stack}]`).join('\n               '));
  for (const [k, v] of s.raf) console.log(`   rAF ×${v}: ${k}`);
};

// A. idle
await page.mouse.move(width * 0.5, height * 0.5);
await page.waitForTimeout(2000);
print(await snapshot('A hero idle (2 s, pointer still)'));
// pointer moving idle
for (let i = 0; i < 40; i++) { await page.mouse.move(width * (0.3 + 0.4 * Math.random()), height * (0.3 + 0.4 * Math.random())); await page.waitForTimeout(40); }
print(await snapshot('A2 hero idle, pointer moving (1.6 s)'));

let cdp;
if (trace) {
  cdp = await ctx.newCDPSession(page);
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,blink.user_timing,gpu,disabled-by-default-gpu.service,disabled-by-default-gpu.decode,disabled-by-default-skia,disabled-by-default-skia.gpu,disabled-by-default-skia.shaders,viz,cc,disabled-by-default-cc.debug,disabled-by-default-gpu.angle,disabled-by-default-gpu.graphite.dawn,disabled-by-default-gpu.dawn,blink,disabled-by-default-blink.debug,disabled-by-default-blink.debug.layout,disabled-by-default-blink.debug.display_lock', transferMode: 'ReturnAsStream' });
}

// B. first wheel
await page.mouse.wheel(0, 120);
await page.waitForTimeout(300);
print(await snapshot('B first wheel → 300 ms'));
// C. film
await page.waitForTimeout(3000);
print(await snapshot('C film 0.3–3.3 s'));
await page.waitForTimeout(3300);
print(await snapshot('C2 film 3.3–6.6 s'));
// D. completion
await page.waitForTimeout(700);
print(await snapshot('D completion (6.6–7.3 s)'));
// E. settle
await page.waitForTimeout(2500);
print(await snapshot('E settled 2.5 s after'));

if (trace) {
  await cdp.send('Tracing.end');
  const { stream } = await new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  let data = '';
  for (;;) { const { data: d, eof } = await cdp.send('IO.read', { handle: stream }); data += d; if (eof) break; }
  mkdirSync('spikes/full/__captures__', { recursive: true });
  writeFileSync(process.env['TRACE'] ?? 'spikes/full/__captures__/trace.json', data);
  console.log('trace written', data.length);
}

// reverse
await page.mouse.wheel(0, -120);
await page.waitForTimeout(6500);
print(await snapshot('R reverse film (6.5 s)'));
await page.waitForTimeout(1500);
print(await snapshot('R2 settled at hero'));
console.log('\nerrors:', errors.length ? errors : 'none');
await browser.close();
