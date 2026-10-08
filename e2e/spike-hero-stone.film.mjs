/**
 * The film, frame by frame: one gesture, then a shot every 300 ms until the
 * landing. Dev server up:  node e2e/spike-hero-stone.film.mjs [w] [h]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'spikes/hero-stone/__captures__';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const width = Number(process.argv[2] ?? 1440);
const height = Number(process.argv[3] ?? 900);
const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: width < 1024 });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
await page.goto('http://localhost:5173/spikes/hero-stone/', { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500);
await page.mouse.move(width * 0.6, height * 0.5);
await page.mouse.wheel(0, 90);
for (let i = 0; i < 26; i++) {
  await page.waitForTimeout(300);
  const s = await page.evaluate(() => window.__transition);
  await page.screenshot({ path: `${OUT}/film-${width}-${String(Math.round(s.progress * 100)).padStart(3, '0')}.png` });
  if (s.status !== 'playing') break;
}
console.log('errors:', errs.length ? errs : 'none');
await browser.close();
