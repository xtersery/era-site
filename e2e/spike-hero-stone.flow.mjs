/**
 * Манифест → Услуги is a normal scroll: wheel down from the manifesto's rest,
 * the page moves with every tick (no hold), the flow trigger interpolates the
 * frame's entrance, Услуги's own pin takes over at its start with the frame
 * clean, and the way up is the same scroll. Dev server up:
 *   node e2e/spike-hero-stone.flow.mjs [w] [h]
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
await page.goto('http://localhost:5173/spikes/hero-stone/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const state = () =>
  page.evaluate(() => {
    const f = document.querySelector('.sv-frame');
    const r = document.querySelector('.radial').getBoundingClientRect();
    const w = document.querySelector('.mf--layer');
    return {
      y: scrollY, radialTop: Math.round(r.top), frameT: f.style.transform, frameO: f.style.opacity,
      wordsO: w?.style.opacity, wordsT: w?.style.transform, radialPos: getComputedStyle(document.querySelector('.radial')).position,
      gw: window.__transition?.status, held: window.__transition?.locked, active: document.querySelector('.radial__label span:last-child')?.textContent,
    };
  });
await page.mouse.move(width * 0.6, height * 0.5);
await page.mouse.wheel(0, 90);
await page.waitForTimeout(7600);
console.log('manifesto rest', await state());

const rows = [];
for (let i = 0; i < 12; i++) {
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(260);
  const s = await state();
  rows.push({ tick: i + 1, y: s.y, radialTop: s.radialTop, frameT: s.frameT, frameO: s.frameO, wordsO: s.wordsO, held: s.held });
  if (i === 4) await page.screenshot({ path: `${OUT}/flow-${width}-mid.png` });
}
console.table(rows);
await page.waitForTimeout(1200);
console.log('after 12 ticks', await state());
await page.screenshot({ path: `${OUT}/flow-${width}-services.png` });

// the way up: the same scroll, until the manifesto's rest (the descent's gateway wall)
for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(200); }
await page.waitForTimeout(1200);
console.log('back up', await state());
console.log('errors:', errs.length ? errs : 'none');
await browser.close();
