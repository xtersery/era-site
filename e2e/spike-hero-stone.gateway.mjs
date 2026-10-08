/**
 * The gateway, end to end: one wheel gesture plays the passage forward, wheel
 * spam during playback changes nothing, one gesture plays it back. Frames are
 * captured on the way. Dev server up:  node e2e/spike-hero-stone.gateway.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'spikes/hero-stone/__captures__';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const width = Number(process.argv[2] ?? 1440);
const height = Number(process.argv[3] ?? 900);
const ctx = await browser.newContext({ viewport: { width, height } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto('http://localhost:5173/spikes/hero-stone/?transitionDebug=1', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
const state = () => page.evaluate(() => ({ ...(window.__transition ?? {}), y: window.scrollY, scroll: document.documentElement.dataset.scroll }));
const shot = (tag) => page.screenshot({ path: `${OUT}/gateway-${width}-${tag}.png` });
await page.mouse.move(width * 0.6, height * 0.5);
console.log('rest', await state());
await shot('00-rest');

// one gesture, forward
const t0 = Date.now();
await page.mouse.wheel(0, 90);
const frames = [];
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(400);
  const s = await state();
  frames.push({ ms: Date.now() - t0, status: s.status, p: Number(s.progress?.toFixed(3)), y: s.y, locked: s.locked, side: s.side });
  if (i % 2 === 0) await shot(`fwd-${String(i).padStart(2, '0')}`);
  // wheel spam in the middle of the playback must not accelerate it
  if (i === 3) for (let k = 0; k < 12; k++) await page.mouse.wheel(0, 200);
  if (s.status === 'released' && s.progress > 0.99) break;
}
console.table(frames);
const landed = await state();
console.log('landed', landed);
await shot('10-landed');

// the page scrolls on normally past the manifesto …
await page.mouse.wheel(0, 300);
await page.waitForTimeout(900);
console.log('after landing + wheel down', await state());
// … and back up to the manifesto's rest: the wall
for (let k = 0; k < 6; k++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(120); }
await page.waitForTimeout(1200);
console.log('back at the wall', await state());
await shot('11-wall');

// one gesture, back
const t1 = Date.now();
await page.mouse.wheel(0, -90);
const back = [];
for (let i = 0; i < 20; i++) {
  await page.waitForTimeout(400);
  const s = await state();
  back.push({ ms: Date.now() - t1, status: s.status, p: Number(s.progress?.toFixed(3)), y: s.y, locked: s.locked, side: s.side });
  if (i % 2 === 0) await shot(`back-${String(i).padStart(2, '0')}`);
  if (s.status === 'released' && s.progress < 0.01) break;
}
console.table(back);
console.log('home', await state());
await shot('20-home');
console.log('errors:', errs.length ? errs : 'none');
await browser.close();
