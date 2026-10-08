// Profiles the integrated page's handoffs with real wheel input, both ways:
//   Кейсы ↔ Специалисты · Основатель ↔ Отзывы · Отзывы ↔ Адрес (· → Заявка).
// Every frame is recorded with its scroll position and binned into ranges;
// per range: frame-time percentiles, stalls, long tasks, React commits, GPU ms
// per canvas (EXT_disjoint_timer_query_webgl2), rAF sources. Whole-run style
// recalc / layout counts come from CDP. Also ScrollTrigger / canvas / heap at
// each checkpoint.
//   BASE=http://localhost:5173/spikes/full/ node e2e/spike-full.handoffs.mjs [cycles]
import { chromium } from '@playwright/test';

const base = process.env['BASE'] ?? 'http://localhost:5173/spikes/full/';
const cycles = Number(process.argv[2] ?? 1);
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.addInitScript(() => {
  const rafOrig = window.requestAnimationFrame.bind(window);
  const sources = new Map();
  window.requestAnimationFrame = (cb) => {
    const stack = (new Error().stack || '').split('\n').slice(2, 4).map((s) => s.trim().replace(/^at /, '').replace(/\?[tv]=[\w.]+/g, '').replace(/https?:\/\/[^/]+/g, '')).join(' < ');
    sources.set(stack, (sources.get(stack) || 0) + 1);
    return rafOrig(cb);
  };
  window.__raf = sources;
  // per-canvas GPU time
  const ctxs = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    const gl = orig.call(this, type, ...a);
    if (gl && (type === 'webgl2' || type === 'webgl') && !gl.__wrapped) {
      gl.__wrapped = true;
      const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      const rec = { canvas: this, gl, ext, query: null, draws: 0, uploads: 0 };
      ctxs.push(rec);
      for (const name of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
        const f = gl[name];
        if (f) gl[name] = function (...args) { if (ext && !rec.query) { rec.query = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, rec.query); } rec.draws++; return f.apply(this, args); };
      }
      for (const name of ['texImage2D', 'texSubImage2D', 'texStorage2D']) {
        const f = gl[name];
        if (f) gl[name] = function (...args) { rec.uploads++; return f.apply(this, args); };
      }
    }
    return gl;
  };
  window.__ctxs = ctxs;
  const frames = [];
  const gpu = [];
  const pending = [];
  let last = performance.now();
  const tick = (now) => {
    frames.push({ t: now, dt: now - last, y: scrollY });
    last = now;
    ctxs.forEach((r, i) => {
      if (r.query) { r.gl.endQuery(r.ext.TIME_ELAPSED_EXT); pending.push({ i, q: r.query, y: scrollY, draws: r.draws, uploads: r.uploads }); r.query = null; r.draws = 0; r.uploads = 0; }
    });
    for (let k = pending.length - 1; k >= 0; k--) {
      const p = pending[k];
      const gl = ctxs[p.i].gl;
      if (gl.getQueryParameter(p.q, gl.QUERY_RESULT_AVAILABLE)) {
        gpu.push({ i: p.i, y: p.y, ms: gl.getQueryParameter(p.q, gl.QUERY_RESULT) / 1e6, draws: p.draws, uploads: p.uploads });
        gl.deleteQuery(p.q);
        pending.splice(k, 1);
      }
    }
    rafOrig(tick);
  };
  rafOrig(tick);
  window.__frames = frames;
  window.__gpu = gpu;
  const longs = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) longs.push({ t: e.startTime, d: e.duration, y: scrollY }); }).observe({ type: 'longtask', buffered: true }); } catch {}
  window.__longs = longs;
  window.__commits = [];
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = { renderers: new Map(), supportsFiber: true, inject() { return 1; }, onCommitFiberRoot() { window.__commits.push(scrollY); }, onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {}, isDisabled: false, on() {}, off() {}, emit() {}, sub() {} };
});

await page.goto(base, { waitUntil: 'load', timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3500);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');

const pos = await page.evaluate(() => {
  const q = (id) => { const e = document.getElementById(id); const sp = e.closest('.pin-spacer') ?? e; const r = sp.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) }; };
  return { cases: q('cases'), specialists: q('specialists'), founder: q('founder'), reviews: q('reviews'), contact: q('contact'), inquiry: q('inquiry'), max: document.documentElement.scrollHeight - innerHeight, vh: innerHeight };
});
const labels = await page.evaluate(() => window.__ctxs.map((r) => (r.canvas.closest('#cases') ? 'cases' : r.canvas.closest('#specialists') ? 'specialists(water)' : r.canvas.closest('.hs, [class*=hero], [class*=passage]') ? 'hero film' : r.canvas.parentElement?.className?.toString().slice(0, 24))));
const vh = pos.vh;
// ranges, by the viewport's top
const R = [
  ['Кейсы ↔ Специалисты', pos.specialists.top - vh * 1.5, pos.specialists.top + vh * 0.3],
  ['Основатель read → release', pos.founder.top + 1.1 * vh, pos.founder.bottom - vh],
  ['Основатель ↔ Отзывы', pos.founder.bottom - vh, pos.reviews.top + vh * 0.6],
  ['Отзывы ↔ Адрес', pos.contact.top - vh * 1.2, pos.contact.top + vh * 0.5],
  ['Адрес ↔ Заявка', pos.inquiry.top - vh * 1.2, Math.min(pos.max, pos.inquiry.top + vh * 0.2)],
];

const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
let mPrev = null;
const checkpoint = async (tag) => {
  const m = await metrics();
  const d = mPrev ? `recalc ${m.RecalcStyleCount - mPrev.RecalcStyleCount} (${((m.RecalcStyleDuration - mPrev.RecalcStyleDuration) * 1000).toFixed(0)} ms) · layout ${m.LayoutCount - mPrev.LayoutCount} (${((m.LayoutDuration - mPrev.LayoutDuration) * 1000).toFixed(0)} ms)` : '';
  mPrev = m;
  return { ...(await checkpointDom(tag)), step: d };
};
const checkpointDom = (tag) => page.evaluate((tag) => ({ tag, st: window.__ST?.getAll().length, pins: window.__ST?.getAll().filter((t) => t.pin).length, canvases: document.querySelectorAll('canvas').length, heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, lenis: document.documentElement.dataset['scroll'] ?? null }), tag);
const wheelTo = async (y) => {
  // a steady hand: 100 px every ~33 ms
  for (let g = 0; g < 2000; g++) {
    const cur = await page.evaluate(() => scrollY);
    if (Math.abs(cur - y) < 120) break;
    await page.mouse.wheel(0, Math.sign(y - cur) * 100);
    await page.waitForTimeout(33);
  }
  await page.waitForTimeout(1200);
};

await page.mouse.move(720, 450);
await page.evaluate((y) => scrollTo(0, y), pos.cases.top + 200);
await page.waitForTimeout(2000);
await page.evaluate(() => { window.__frames.length = 0; window.__gpu.length = 0; window.__longs.length = 0; window.__commits.length = 0; window.__raf.clear(); });
const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const checks = [await checkpoint('start (Кейсы)')];
for (let c = 1; c <= cycles; c++) {
  await wheelTo(pos.founder.bottom - vh); checks.push(await checkpoint(`c${c} after Основатель`));
  await wheelTo(pos.reviews.top + vh * 0.6); checks.push(await checkpoint(`c${c} after Отзывы`));
  await wheelTo(pos.contact.top + vh * 0.5); checks.push(await checkpoint(`c${c} after Адрес`));
  await wheelTo(Math.min(pos.max, pos.inquiry.top + vh * 0.2));
  await wheelTo(pos.cases.top + (pos.cases.bottom - pos.cases.top) * 0.5); checks.push(await checkpoint(`c${c} back at Кейсы`));
}
const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const data = await page.evaluate(() => ({ frames: window.__frames, gpu: window.__gpu, longs: window.__longs, commits: window.__commits, raf: [...window.__raf.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10) }));

const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * q))] : 0; };
const inR = (y, r) => y >= r[1] && y <= r[2];
console.log(`\n${cycles} cycle(s), ${data.frames.length} frames · canvases: ${labels.join(' | ')}`);
for (const r of R) {
  const f = data.frames.filter((x) => inR(x.y, r)).map((x) => x.dt);
  const g = data.gpu.filter((x) => inR(x.y, r));
  const perCanvas = labels.map((l, i) => { const s = g.filter((x) => x.i === i); return s.length ? `${l} ${s.length}f avg ${(s.reduce((a, b) => a + b.ms, 0) / s.length).toFixed(2)} max ${Math.max(...s.map((x) => x.ms)).toFixed(1)}ms up ${s.reduce((a, b) => a + b.uploads, 0)}` : `${l} idle`; }).join(' · ');
  const longs = data.longs.filter((x) => inR(x.y, r));
  const commits = data.commits.filter((y) => inR(y, r)).length;
  console.log(`\n## ${r[0]}  — ${f.length} frames · fps ${(1000 / (f.reduce((a, b) => a + b, 0) / Math.max(1, f.length))).toFixed(1)} · p50 ${pct(f, 0.5).toFixed(1)} p95 ${pct(f, 0.95).toFixed(1)} p99 ${pct(f, 0.99).toFixed(1)} max ${Math.max(0, ...f).toFixed(0)} ms · >50ms ${f.filter((d) => d > 50).length} · >100ms ${f.filter((d) => d > 100).length} · React commits ${commits} · long tasks ${longs.length}${longs.length ? ' (' + longs.map((l) => Math.round(l.d) + 'ms').join(' ') + ')' : ''}`);
  console.log(`   GPU: ${perCanvas}`);
}
const stalls = data.frames.filter((x) => x.dt > 100);
console.log(`\nstalls > 100 ms: ${stalls.length ? stalls.map((s) => `${Math.round(s.dt)}ms@y${Math.round(s.y)}`).join(' ') : 'none'}`);
console.log(`style recalcs ${m1.RecalcStyleCount - m0.RecalcStyleCount} (${((m1.RecalcStyleDuration - m0.RecalcStyleDuration) * 1000).toFixed(0)} ms) · layouts ${m1.LayoutCount - m0.LayoutCount} (${((m1.LayoutDuration - m0.LayoutDuration) * 1000).toFixed(0)} ms) · script ${((m1.ScriptDuration - m0.ScriptDuration) * 1000).toFixed(0)} ms · task ${((m1.TaskDuration - m0.TaskDuration) * 1000).toFixed(0)} ms`);
console.log('\nrAF sources:'); for (const [k, v] of data.raf) console.log(`   ×${v}: ${k}`);
console.log('\ncheckpoints:'); for (const c of checks) console.log('  ', JSON.stringify(c));
console.log('\nerrors:', errors.length ? errors : 'none');
await browser.close();
