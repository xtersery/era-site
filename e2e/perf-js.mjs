// Initial JavaScript and the WebGL scenes' readiness, on the production build
// (BASE = a `vite preview`). Part 1 — the first load: JS requests and bytes
// before LCP, whether three.js is among them, LCP, total blocking time (long
// tasks to LCP + 3 s, Chrome) and the main thread's script time (CDP).
// Part 2 — the scenes below the fold (Кейсы, Специалисты): scrolled to
// smoothly, and flung at, when their canvas exists and their textures have
// arrived, against the moment the room reaches the screen.
// THROTTLE=1 — the slow Android of the image pass (1.6 Mbps, 150 ms, CPU ×4).
import { chromium, webkit, devices } from '@playwright/test';

const base = process.env['BASE'] ?? 'http://localhost:4174/';
const throttle = !!process.env['THROTTLE'];
const PART = process.env['PART'] ?? 'load,scenes';
// how many screens before the room the approach starts (a calm scroll comes from far — through Услуги's pin)
const APPROACH = +(process.env['APPROACH'] ?? 3);
const PRESETS = {
  'chrome-360': [chromium, { viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  'chrome-390': [chromium, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  'chrome-430': [chromium, { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  'chrome-1440': [chromium, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }],
  'webkit-iphone14': [webkit, { ...devices['iPhone 14'] }],
};
const RUNS = (process.env['RUNS'] ?? 'chrome-360,chrome-390,chrome-430,chrome-1440,webkit-iphone14').split(',');
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function open(tag) {
  const [engine, opts] = PRESETS[tag];
  const b = engine === chromium ? await chromium.launch({ channel: 'chrome' }) : await webkit.launch();
  const ctx = await b.newContext({ ...opts, locale: 'ru-RU' });
  const page = await ctx.newPage();
  await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
  await page.addInitScript(() => {
    window.__lcp = 0; window.__long = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push([e.startTime, e.duration]); }).observe({ type: 'longtask', buffered: true }); } catch {}
  });
  let cdp = null;
  if (engine === chromium) {
    cdp = await ctx.newCDPSession(page);
    await cdp.send('Performance.enable');
    if (throttle) {
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
  }
  return { b, page, cdp, engine };
}

if (PART.includes('load')) for (const tag of RUNS) {
  const { b, page, cdp } = await open(tag);
  await page.goto(base, { waitUntil: 'load', timeout: 240000 });
  await page.waitForTimeout(throttle ? 6000 : 3000);
  const r = await page.evaluate(() => {
    const lcp = window.__lcp;
    const js = performance.getEntriesByType('resource').filter((e) => /\.js(\?|$)/.test(e.name)).map((e) => ({ n: e.name.split('/').pop(), start: e.startTime, end: e.responseEnd, bytes: e.encodedBodySize || e.transferSize }));
    const before = js.filter((e) => e.end <= lcp);
    const tbt = window.__long.filter(([s]) => s <= lcp + 3000).reduce((t, [, d]) => t + Math.max(0, d - 50), 0);
    return { lcp: Math.round(lcp), all: js.length, allBytes: js.reduce((s, e) => s + e.bytes, 0), before: before.length, beforeBytes: before.reduce((s, e) => s + e.bytes, 0), three: js.find((e) => /^three-/.test(e.n)), r3f: js.find((e) => /^r3f-/.test(e.n)), tbt: Math.round(tbt), names: js.map((e) => `${e.n.replace(/-[\w-]{8}\.js$/, '')}@${Math.round(e.start)}`).join(' ') };
  });
  let script = '';
  if (cdp) { const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value])); script = ` · script ${Math.round(m.ScriptDuration * 1000)} ms, tasks ${Math.round(m.TaskDuration * 1000)} ms`; }
  const three = r.three ? `three requested at ${Math.round(r.three.start)} ms, done ${Math.round(r.three.end)} ms (${r.three.end <= r.lcp ? 'BEFORE' : 'after'} LCP)` : 'three not requested';
  console.log(`${tag}${throttle ? ' (slow Android)' : ''} — LCP ${r.lcp} ms · JS before LCP: ${r.before} requests, ${kb(r.beforeBytes)} · JS total: ${r.all}, ${kb(r.allBytes)} · TBT ${r.tbt} ms${script}\n    ${three}\n    ${r.names}`);
  await b.close();
}

if (PART.includes('scenes')) for (const tag of RUNS.filter((t) => t !== 'webkit-iphone14' || !throttle)) {
  for (const [room, texture] of [['cases', /@rail-|case\d.*\.jpg/], ['specialists', /marble-/]]) {
    for (const mode of ['smooth', 'fling']) {
      const { b, page } = await open(tag);
      await page.goto(base, { waitUntil: 'load', timeout: 240000 });
      await page.waitForTimeout(throttle ? 6000 : 2500);
      const H = await page.evaluate(() => innerHeight);
      const top = await page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY), '#' + room);
      // start well before the room, then approach it: the calm scroll from APPROACH screens up, the fling from three
      const from = mode === 'smooth' ? APPROACH : 3;
      await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, top - from * H);
      await page.waitForTimeout(400);
      const t0 = await page.evaluate(() => performance.now());
      const speed = mode === 'smooth' ? 1200 : 9000; // px/s — a calm scroll, a hard fling
      const steps = Math.ceil((from * H) / (speed / 20));
      for (let i = 1; i <= steps; i++) {
        await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, Math.round(top - from * H + (from * H * i) / steps));
        await page.waitForTimeout(50);
      }
      const arrived = await page.evaluate(() => performance.now());
      // when were the canvas and the textures there?
      const probe = () => page.evaluate(({ room, tex }) => {
        const canvas = !!document.querySelector(`#${room} canvas`);
        const re = new RegExp(tex);
        const imgs = performance.getEntriesByType('resource').filter((e) => re.test(e.name));
        return { canvas, tex: imgs.length, texDone: imgs.length ? Math.max(...imgs.map((e) => e.responseEnd)) : null, now: performance.now() };
      }, { room, tex: texture.source });
      let p = await probe();
      const atArrival = { ...p };
      const deadline = Date.now() + (throttle ? 30000 : 8000);
      while ((!p.canvas || !p.tex) && Date.now() < deadline) { await page.waitForTimeout(100); p = await probe(); }
      const ready = p.canvas && p.tex ? Math.max(p.texDone, 0) : null;
      const verdict = atArrival.canvas && atArrival.tex && atArrival.texDone <= arrived ? 'READY on arrival' : ready ? `ready ${Math.round(ready - arrived)} ms AFTER arrival` : 'NOT READY';
      console.log(`  ${tag}${throttle ? ' slow' : ''} ${room.padEnd(11)} ${mode.padEnd(6)} (${Math.round(arrived - t0)} ms of approach): ${verdict}`);
      await b.close();
    }
  }
}
