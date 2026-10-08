// The production bundle of the full spike (vite preview of dist-spike): frame
// times through the film and back, with no dev handles — the page as shipped.
//   SPIKE=full npx vite build --config vite.spike.config.ts
//   npx vite preview --config vite.spike.config.ts --port 4173
//   BASE=http://localhost:4173/spikes/full/ node e2e/spike-full.prod.mjs
import { chromium } from '@playwright/test';
const base = process.env['BASE'] ?? 'http://localhost:4173/spikes/full/';
const width = 1440, height = 900;
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, locale: 'ru-RU' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('sanity')) errors.push(m.text()); });
await page.addInitScript(() => {
  const frames = []; let last = performance.now();
  const tick = (now) => { frames.push(now - last); last = now; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  window.__frames = frames; window.__framesReset = () => { frames.length = 0; last = performance.now(); };
  const longs = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) longs.push(Math.round(e.duration)); }).observe({ type: 'longtask', buffered: true }); } catch {}
  window.__longs = longs;
});
await page.goto(base, { waitUntil: 'load', timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);
const sample = (label) => page.evaluate((label) => {
  const f = window.__frames.slice(); window.__framesReset();
  const sorted = [...f].sort((a, b) => a - b);
  const r = { label, frames: f.length, fps: f.length ? +(1000 / (f.reduce((a, b) => a + b, 0) / f.length)).toFixed(1) : 0, p50: +(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(1), p99: +(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))] ?? 0).toFixed(1), max: +(sorted[sorted.length - 1] ?? 0).toFixed(0), over100: f.filter((x) => x > 100).length, longs: window.__longs.splice(0), y: Math.round(scrollY), canvases: document.querySelectorAll('canvas').length };
  return r;
}, label);
const print = (s) => console.log(`${s.label.padEnd(28)} fps ${s.fps} · p50 ${s.p50} · p99 ${s.p99} · max ${s.max} ms · >100 ms ×${s.over100} · long tasks [${s.longs.join(' ')}] · y ${s.y} · canvases ${s.canvases}`);
await page.mouse.move(width * 0.5, height * 0.5);
await page.waitForTimeout(2000);
print(await sample('hero idle 2 s'));
for (let i = 1; i <= 3; i++) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(7300);
  print(await sample(`cycle ${i} film →`));
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(6600);
  print(await sample(`cycle ${i} film ←`));
}
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
