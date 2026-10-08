/**
 * The manifesto at rest, per viewport, and the reduced-motion room.
 * Dev server up:  node e2e/spike-hero-stone.rest.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'spikes/hero-stone/__captures__';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
for (const [width, height] of [[1440, 900], [1280, 800], [768, 1024], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:5173/spikes/hero-stone/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  // the fallback route into the rest: the document put on the pin's end (a deep link / a dragged bar)
  await page.evaluate(() => window.scrollTo(0, innerHeight));
  await page.waitForTimeout(1200);
  const s = await page.evaluate(() => ({ ...window.__transition, y: scrollY }));
  await page.screenshot({ path: `${OUT}/rest-${width}.png` });
  console.log(width, s.status, s.progress, s.y, errs.length ? errs : '');
  await ctx.close();
}
// reduced motion: no film, no pin — the manifesto is a still room after the hero
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/spikes/hero-stone/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
console.log('reduced: tier', await page.evaluate(() => [document.documentElement.dataset.tier, document.documentElement.dataset.scroll, !!document.querySelector('.mf-room'), !!document.querySelector('.hs__passage')]));
await page.mouse.move(700, 450);
await page.mouse.wheel(0, 900);
await page.waitForTimeout(800);
console.log('reduced: after a wheel, y =', await page.evaluate(() => scrollY));
await page.evaluate(() => document.querySelector('.mf-room').scrollIntoView());
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/rest-reduced-1440.png` });
await browser.close();
