// First-load image audit of the production build: every image the page asks
// for before the visitor scrolls (URL, bytes on the wire, when it started,
// who asked), the LCP and its element, and the total transfer — on the
// phones and the desktop, Chrome and WebKit. BASE = a `vite preview` of the
// build (the dev server would not show the shipped sizes or headers).
import { chromium, webkit, devices } from '@playwright/test';

const base = process.env['BASE'] ?? 'http://localhost:4174/';
const RUNS = (process.env['RUNS'] ?? 'chrome-360,chrome-390,chrome-430,webkit-iphone14,chrome-1440').split(',');
const PRESETS = {
  'chrome-360': [chromium, { viewport: { width: 360, height: 780 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' }],
  'chrome-390': [chromium, { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  'chrome-430': [chromium, { viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
  'webkit-iphone14': [webkit, { ...devices['iPhone 14'] }],
  'chrome-1440': [chromium, { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }],
};
const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
for (const tag of RUNS) {
  const [engine, opts] = PRESETS[tag];
  const b = engine === chromium ? await chromium.launch({ channel: 'chrome' }) : await webkit.launch();
  const ctx = await b.newContext({ ...opts, locale: 'ru-RU' });
  const page = await ctx.newPage();
  await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
  await page.addInitScript(() => {
    window.__lcp = [];
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), el: e.element ? (e.element.tagName + '.' + String(e.element.className || '').split(' ')[0] + (e.url ? ' ' + e.url.split('/').pop() : '')) : '', size: e.size }); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
  });
  // THROTTLE=1: a mid-range Android on mobile data (Chrome only — CDP): ~1.6 Mbps down, 150 ms RTT, CPU ×4
  if (process.env['THROTTLE'] && engine === chromium) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const t0 = Date.now();
  const reqs = [];
  page.on('requestfinished', async (r) => {
    const s = await r.sizes().catch(() => null);
    reqs.push({ url: r.url(), type: r.resourceType(), bytes: s ? s.responseBodySize + s.responseHeadersSize : 0, start: Math.round(r.timing().startTime - t0 > 0 ? r.timing().startTime - t0 : 0) });
  });
  await page.goto(base, { waitUntil: 'load', timeout: 180000 });
  await page.waitForTimeout(process.env['THROTTLE'] ? 8000 : 4000);
  const info = await page.evaluate(() => ({ lcp: window.__lcp.at(-1), nav: performance.getEntriesByType('navigation')[0]?.responseEnd, res: performance.getEntriesByType('resource').filter((r) => r.initiatorType !== 'xmlhttprequest' && r.initiatorType !== 'fetch' || /\.(jpe?g|png|webp|avif)/.test(r.name)).map((r) => ({ name: r.name.split('/').pop().split('?')[0], start: Math.round(r.startTime), end: Math.round(r.responseEnd), xfer: r.transferSize, body: r.encodedBodySize, initiator: r.initiatorType })) }));
  const imgs = info.res.filter((r) => /\.(jpe?g|png|webp|avif|svg)$/.test(r.name));
  const total = info.res.reduce((s, r) => s + (r.body || 0), 0);
  const hero = imgs.filter((r) => /onyx|emblem/.test(r.name)).map((r) => `${r.name.replace(/-[\w]{8}\./, '.')} ${kb(r.body)}`).join(', ');
  console.log(`\n== ${tag} — hero files: ${hero}`);
  console.log(`== ${tag} — LCP ${info.lcp?.t ?? '—'} ms (${info.lcp?.el ?? '—'}) · images ${imgs.length} · ${kb(imgs.reduce((s, r) => s + (r.body || 0), 0))} of ${kb(total)} total`);
  for (const r of imgs.sort((a, z) => a.start - z.start)) console.log(`   ${String(r.start).padStart(5)}–${String(r.end).padEnd(5)} ms  ${kb(r.body).padStart(7)}  ${r.initiator.padEnd(6)} ${r.name}`);
  await b.close();
}
