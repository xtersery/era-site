// Per-canvas GPU time (EXT_disjoint_timer_query_webgl2), draw calls and texture uploads per frame,
//   BASE=http://localhost:5173/spikes/full/ node e2e/spike-full.gpu.mjs
// sampled across the film. Also logs frame gaps.
import { chromium } from '@playwright/test';
const base = process.env['BASE'] ?? 'http://localhost:5173/spikes/full/';
const inject = process.env['INJECT'] ?? '';
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript(() => {
  const ctxs = [];
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...a) {
    const gl = orig.call(this, type, ...a);
    if (gl && (type === 'webgl2' || type === 'webgl') && !gl.__wrapped) {
      gl.__wrapped = true;
      const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
      const rec = { canvas: this, gl, ext, draws: 0, uploads: 0, uploadPx: 0, query: null, gpuMs: [], frameDraws: [], label: '' };
      ctxs.push(rec);
      const wrapDraw = (name) => { const f = gl[name]; if (!f) return; gl[name] = function (...args) { if (ext && !rec.query) { rec.query = gl.createQuery(); gl.beginQuery(ext.TIME_ELAPSED_EXT, rec.query); } rec.draws++; return f.apply(this, args); }; };
      ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced'].forEach(wrapDraw);
      const wrapTex = (name) => { const f = gl[name]; if (!f) return; gl[name] = function (...args) { rec.uploads++; const src = args[args.length - 1]; if (src && src.width) rec.uploadPx += src.width * src.height; else if (typeof args[3] === 'number' && typeof args[4] === 'number' && args.length > 6) rec.uploadPx += args[3] * args[4]; return f.apply(this, args); }; };
      ['texImage2D', 'texSubImage2D', 'texStorage2D', 'compressedTexImage2D'].forEach(wrapTex);
      const gm = gl.generateMipmap; gl.generateMipmap = function (...args) { rec.mips = (rec.mips || 0) + 1; return gm.apply(this, args); };
    }
    return gl;
  };
  window.__ctxs = ctxs;
  const pending = [];
  let last = performance.now();
  const gaps = [];
  const tick = (now) => {
    const gap = now - last; last = now;
    if (gap > 100) gaps.push({ at: Math.round(now), gap: Math.round(gap) });
    for (const r of ctxs) {
      if (r.query) { r.gl.endQuery(r.ext.TIME_ELAPSED_EXT); pending.push({ r, q: r.query, at: now, draws: r.draws, uploads: r.uploads, uploadPx: r.uploadPx, mips: r.mips || 0 }); r.query = null; r.draws = 0; r.uploads = 0; r.uploadPx = 0; r.mips = 0; }
    }
    for (let i = pending.length - 1; i >= 0; i--) {
      const p = pending[i];
      const gl = p.r.gl;
      if (gl.getQueryParameter(p.q, gl.QUERY_RESULT_AVAILABLE)) {
        const ns = gl.getQueryParameter(p.q, gl.QUERY_RESULT);
        p.r.gpuMs.push({ at: Math.round(p.at), ms: +(ns / 1e6).toFixed(2), draws: p.draws, uploads: p.uploads, uploadPx: p.uploadPx, mips: p.mips });
        gl.deleteQuery(p.q);
        pending.splice(i, 1);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__gaps = gaps;
});
await page.goto(base, { waitUntil: 'load', timeout: 90000 });
await page.waitForTimeout(3500);
if (inject) await page.evaluate(inject);
await page.evaluate(() => { for (const r of window.__ctxs) { r.label = r.canvas.closest('section, .hs__passage, .flow-cases, .flow-sitting')?.className?.toString().slice(0, 30) || r.canvas.parentElement?.className; r.gpuMs.length = 0; } window.__gaps.length = 0; window.__t0 = performance.now(); });
await page.mouse.move(720, 450);
await page.waitForTimeout(1000);
await page.mouse.wheel(0, 120);
await page.waitForTimeout(7500);
const out = await page.evaluate(() => ({ t0: window.__t0, gaps: window.__gaps, ctxs: window.__ctxs.map((r) => ({ label: r.label, w: r.canvas.width, h: r.canvas.height, samples: r.gpuMs })) }));
console.log('frame gaps:', out.gaps.map((g) => `${g.gap}ms @+${g.at - Math.round(out.t0)}`).join('  '));
for (const c of out.ctxs) {
  const s = c.samples;
  const idle = s.filter((x) => x.at - out.t0 < 1000);
  const film = s.filter((x) => x.at - out.t0 >= 1000);
  const sum = (arr, k) => arr.reduce((a, b) => a + b[k], 0);
  const max = (arr) => arr.reduce((m, x) => (x.ms > m.ms ? x : m), { ms: 0 });
  console.log(`\n${c.label} ${c.w}×${c.h}: idle ${idle.length} frames, gpu avg ${(sum(idle, 'ms') / Math.max(1, idle.length)).toFixed(2)} ms, draws/frame ${(sum(idle, 'draws') / Math.max(1, idle.length)).toFixed(1)} · film ${film.length} frames, gpu avg ${(sum(film, 'ms') / Math.max(1, film.length)).toFixed(2)} ms, max ${max(film).ms} ms @+${max(film).at - Math.round(out.t0)} (draws ${max(film).draws}, uploads ${max(film).uploads}, px ${max(film).uploadPx}, mips ${max(film).mips}) · uploads total ${sum(film, 'uploads')} (${(sum(film, 'uploadPx') / 1e6).toFixed(1)} MP)`);
  const heavy = film.filter((x) => x.ms > 20);
  if (heavy.length) console.log('   frames > 20 ms GPU:', heavy.map((x) => `${x.ms}ms@+${x.at - Math.round(out.t0)}(d${x.draws} u${x.uploads})`).join(' '));
}
await browser.close();
