/**
 * The passage, frame by frame: scrolls the pinned hero to fixed progress points
 * and shoots each. Dev server up:  node e2e/spike-hero-stone.passage.mjs
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
await page.goto('http://localhost:5173/spikes/hero-stone/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
const steps = [0, 0.08, 0.2, 0.32, 0.45, 0.58, 0.7, 0.82, 0.92, 1.0];
for (const p of steps) {
  await page.evaluate((p) => window.scrollTo(0, Math.round(p * innerHeight)), p);
  await page.waitForTimeout(1600);
  const tag = `passage-${width}-${String(Math.round(p * 100)).padStart(3, '0')}`;
  await page.screenshot({ path: `${OUT}/${tag}.png` });
  console.log(tag);
}
// past the pin: the cut into the next room
await page.evaluate(() => window.scrollTo(0, Math.round(innerHeight * 1.6)));
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/passage-${width}-after.png` });
console.log('errors:', errs.length ? errs : 'none');
await browser.close();
