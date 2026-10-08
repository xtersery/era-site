/**
 * Hero capture suite. Run with the dev server up:
 *   node e2e/spike-hero-stone.capture.mjs [filter]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'spikes/hero-stone/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/hero-stone/';
const browser = await chromium.launch({ channel: 'chrome' });

const shoot = async (
  name,
  { width, height, dpr = 1, full = false, clip, menu = false, hover, pointer },
) => {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  if (menu) {
    await page.click('.hh__menu');
    await page.waitForTimeout(1800);
  }
  if (hover) {
    await page.hover(hover);
    await page.waitForTimeout(800);
  }
  if (pointer) {
    await page.mouse.move(pointer[0], pointer[1]);
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full, ...(clip ? { clip } : {}) });
  await ctx.close();
  console.log(name);
};

const only = process.argv[2];
const frames = {
  'desktop-1440': { width: 1440, height: 900 },
  'desktop-1512': { width: 1512, height: 982 },
  'desktop-1280': { width: 1280, height: 800 },
  'desktop-1920': { width: 1920, height: 1080 },
  'tablet-768': { width: 768, height: 1024 },
  'phone-390': { width: 390, height: 844, dpr: 2, full: true },
  'menu-open-1440': { width: 1440, height: 900, menu: true },
  'menu-open-1280': { width: 1280, height: 800, menu: true },
  'menu-open-390': { width: 390, height: 844, dpr: 2, menu: true },
  'pointer-1440': { width: 1440, height: 900, pointer: [1200, 250] },
  'no-text-1440': { width: 1440, height: 900, clip: { x: 0, y: 64, width: 1440, height: 836 } },
  'detail-emblem@2x': {
    width: 1440,
    height: 900,
    dpr: 2,
    clip: { x: 150, y: 90, width: 780, height: 780 },
  },
  'detail-header@2x': {
    width: 1440,
    height: 900,
    dpr: 2,
    clip: { x: 0, y: 0, width: 1440, height: 72 },
  },
  'detail-copy@2x': {
    width: 1440,
    height: 900,
    dpr: 2,
    clip: { x: 820, y: 250, width: 600, height: 420 },
  },
  'detail-cta-hover@2x': {
    width: 1440,
    height: 900,
    dpr: 2,
    clip: { x: 820, y: 540, width: 560, height: 120 },
    hover: '.hs__cta .gbtn',
  },
};
for (const [name, opts] of Object.entries(frames)) {
  if (only && !name.includes(only)) continue;
  await shoot(name, opts);
}
await browser.close();
