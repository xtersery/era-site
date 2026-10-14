// Hero → Манифест on a slow phone (gzip server): when the visitor swipes, how
// long are they held, and do they get the film or the page's own transition —
// and does the page always end on a rest, both ways? One row per scenario.
//   RUNS=phone,desktop (default phone)
import { chromium } from '@playwright/test';

const base = process.env['BASE'] ?? 'http://localhost:4194/';
const SLOW = { latency: 150, down: 1.6, cpu: 4 };
const AWFUL = { latency: 400, down: 0.4, cpu: 4 };
const SCENARIOS = [
  { name: '1 swipe as the hero appears', net: SLOW, after: 0 },
  { name: '2 swipe 1 s after LCP', net: SLOW, after: 1000 },
  { name: '3 swipe 3 s after LCP', net: SLOW, after: 3000 },
  { name: '4 slow viewing (swipe 8 s after LCP)', net: SLOW, after: 8000 },
  { name: '5 very bad network (0.4 Mbps, 400 ms), 3 s', net: AWFUL, after: 3000 },
  { name: '6a WebGL broken (the film fails to load)', net: SLOW, after: 1000, breakFilm: true },
  { name: '6b WebGL off (?noWebgl=1)', net: SLOW, after: 1000, query: '?noWebgl=1' },
];
const devices = (process.env['RUNS'] ?? 'phone').split(',');
const b = await chromium.launch({ channel: 'chrome' });
console.log('device · scenario · LCP · film ready · held · played · landed · back');
for (const dev of devices) for (const sc of SCENARIOS) {
  const phone = dev === 'phone';
  const ctx = await b.newContext(phone ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
  if (sc.breakFilm) await page.route(/\/assets\/(three|r3f)-/, (r) => r.abort('failed'));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: sc.net.latency, downloadThroughput: (sc.net.down * 1024 * 1024) / 8, uploadThroughput: (500 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: sc.net.cpu });
  await page.addInitScript(() => {
    window.__m = { lcp: 0 };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
    const tick = () => {
      const now = performance.now();
      const p = document.querySelector('.hs__passage');
      if (p?.hasAttribute('data-film-ready') && !window.__m.ready) window.__m.ready = now;
      if (p?.hasAttribute('data-film-failed') && !window.__m.failed) window.__m.failed = now;
      const mode = p?.getAttribute('data-film-mode');
      if (mode && !window.__m.start) { window.__m.start = now; window.__m.mode = mode; }
      // the page's own movement (the still room without a film): the document left the hero's top
      if (!window.__m.moved && scrollY > 4) window.__m.moved = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.goto(base + (sc.query ?? ''), { waitUntil: 'commit', timeout: 240000 });
  await page.waitForFunction(() => window.__m.lcp > 0 && document.querySelector('.hs__emblem img')?.complete, null, { timeout: 180000 });
  await page.waitForTimeout(sc.after);
  const H = await page.evaluate(() => innerHeight);
  const gesture = async (down) => {
    if (!phone) { await page.mouse.move(720, 450); await page.mouse.wheel(0, down ? 120 : -120); return; }
    const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 200, y }] });
    const [a, z] = down ? [600, 380] : [380, 600];
    await touch('touchStart', a); for (let i = 1; i <= 10; i++) await touch('touchMove', a + ((z - a) * i) / 10); await touch('touchEnd', z);
  };
  const tG = await page.evaluate(() => performance.now());
  await gesture(true);
  // landed: the page on the manifesto's rest (the stage's second rest, or the still room past the hero), the words up
  const landed = sc.query ? false : await page.waitForFunction((H) => {
    const w = document.querySelector('.mf__text');
    const atRest = window.__m.start ? Math.abs(scrollY - H) < 4 : scrollY > H * 0.5;
    return atRest && w && +getComputedStyle(w).opacity > 0.95 && (window.__m.landed ??= performance.now());
  }, H, { timeout: 60000 }).then(() => true, () => false);
  if (sc.query) await page.waitForTimeout(1500);
  const m = await page.evaluate(() => ({ ...window.__m, y: Math.round(scrollY) }));
  // and back: one gesture up from the rest returns to the hero, its header up
  let back = '—';
  if (landed && m.start) {
    await page.waitForTimeout(1200);
    await gesture(false);
    back = await page.waitForFunction(() => scrollY < 2 && +getComputedStyle(document.querySelector('.hh')).opacity > 0.95, null, { timeout: 30000 }).then(() => 'hero ✓', () => `stuck at y ${Math.round(0)}`);
    if (back !== 'hero ✓') back = `NOT back (y ${await page.evaluate(() => Math.round(scrollY))})`;
  }
  const r = (x) => (x ? `${(x / 1000).toFixed(1)} s` : '—');
  const held = m.start ? Math.round(m.start - tG) : m.moved ? 0 : null;
  const played = m.mode ?? (m.moved ? 'no gateway: plain scroll into the still room' : '—');
  const end = m.start ? (landed ? 'landed y ' + m.y : 'NOT LANDED y ' + m.y) : `page scrolled to y ${m.y}`;
  console.log(`${dev} · ${sc.name} · LCP ${r(m.lcp)} · film ${m.ready ? 'ready ' + r(m.ready) : m.failed ? 'failed ' + r(m.failed) : sc.query ? 'off' : 'not ready'} · held ${held === null ? '—' : held + ' ms'} · ${played} · ${end} · ${back}${errors.length ? ' · errors: ' + errors.join(' | ').slice(0, 160) : ''}`);
  await ctx.close();
}
await b.close();
