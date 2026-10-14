// The film's preparation, as it really happens on a slow Android (gzip server):
// HTML → the hero's pictures (requested, loaded, decoded into <img>) → LCP →
// the film's chunk, three.js, R3F (requested, done) → the canvas → the film
// ready. Real timestamps from Resource Timing, the LCP observer and the page.
import { chromium } from '@playwright/test';

const base = process.env['BASE'] ?? 'http://localhost:4194/';
const b = await chromium.launch({ channel: 'chrome' });
for (const [tag, opts] of [['phone-390', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ['desktop-1440', { viewport: { width: 1440, height: 900 } }]]) {
  const ctx = await b.newContext(opts);
  const page = await ctx.newPage();
  await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__m = {};
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    document.addEventListener('load', (e) => { const t = e.target; if (t instanceof HTMLImageElement && t.closest('.hs__field')) window.__m.onyxImgLoad ??= performance.now(); if (t instanceof HTMLImageElement && t.closest('.hs__emblem')) window.__m.emblemImgLoad ??= performance.now(); }, true);
    const tick = () => { if (!window.__m.canvas && document.querySelector('.hs__passage canvas')) window.__m.canvas = performance.now(); if (!window.__m.ready && document.querySelector('.hs__passage[data-film-ready]')) window.__m.ready = performance.now(); if (!window.__m.app && document.querySelector('.hs__emblem img')) window.__m.app = performance.now(); requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.goto(base, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => window.__m.ready, null, { timeout: 120000 }).catch(() => {});
  const r = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const res = Object.fromEntries(performance.getEntriesByType('resource').map((e) => [e.name.split('/').pop().replace(/-[\w-]{8}\./, '.'), e]));
    const span = (n) => (res[n] ? `${Math.round(res[n].startTime)} → ${Math.round(res[n].responseEnd)}` : '—');
    return [
      ['HTML (response end)', `0 → ${Math.round(nav.responseEnd)}`],
      ['entry JS index.js', span('index.js')],
      ['react / gsap / lenis', `${span('react.js')} · ${span('gsap.js')} · ${span('lenis.js')}`],
      ['hero onyx.avif (preload)', span('onyx.avif')],
      ['hero emblem avif (preload)', span(Object.keys(res).find((k) => /^emblem.*\.avif$/.test(k)))],
      ['app mounted (hero <img> in DOM)', Math.round(window.__m.app)],
      ['emblem <img> load', Math.round(window.__m.emblemImgLoad)],
      ['onyx <img> load', Math.round(window.__m.onyxImgLoad)],
      ['LCP', Math.round(window.__m.lcp)],
      ['PassageCanvas.js (import)', span('PassageCanvas.js')],
      ['three.js', span('three.js')],
      ['r3f.js', span('r3f.js')],
      ['film canvas mounted', Math.round(window.__m.canvas)],
      ['film READY (scene + textures)', Math.round(window.__m.ready)],
    ];
  });
  console.log(`\n== ${tag} (slow Android, gzip), ms from navigation start`);
  for (const [k, v] of r) console.log(`  ${k.padEnd(34)} ${v}`);
  await ctx.close();
}
await b.close();
