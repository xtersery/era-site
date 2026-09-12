// Interaction proof for the radial spike: click, drag, keyboard, swipe, reduced motion.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = 'spikes/radial/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/radial/';
const browser = await chromium.launch({ channel: 'chrome' });
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(900); };
const activeNo = (page) => page.evaluate(() => document.querySelector('.state[data-active] .state__no')?.textContent?.trim());
const turn = (page) => page.evaluate(() => Number(document.querySelector('.hud')?.textContent?.match(/turn ([\d.]+)/)?.[1]));
const log = [];
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' }); await settle(page);
  await page.evaluate(() => document.querySelector('#services').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(300);
  const y0 = await page.evaluate(() => window.scrollY);
  // 1. click a name → tween to 02.2; sample frames while it runs
  await page.click('.dial__name:nth-of-type(1) >> nth=1').catch(() => {});
  await page.evaluate(() => document.querySelectorAll('.dial__name')[1].click());
  for (let i = 0; i < 8; i++) { await page.waitForTimeout(140); await page.screenshot({ path: `${OUT}/live-${i}.png` }); }
  await page.waitForTimeout(900);
  log.push(['click 02.2 → active', await activeNo(page)]);
  // 2. keyboard: ArrowDown twice → 02.4
  await page.focus('#services'); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(2300); await page.keyboard.press('ArrowDown'); await page.waitForTimeout(2300);
  log.push(['ArrowDown ×2 → active', await activeNo(page)]);
  // 3. wrap: click 02.1 from 02.4 (distance 3, either way) then ArrowUp from 02.1 → 02.7
  await page.evaluate(() => document.querySelectorAll('.dial__name')[0].click()); await page.waitForTimeout(2600);
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(2300);
  log.push(['02.1 then ArrowUp → active (wrap)', await activeNo(page), 'turn', await turn(page)]);
  // 4. drag the dial: from the apex downwards ≈ clockwise → previous… measure
  const before = await activeNo(page);
  await page.mouse.move(470, 450); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(470 - i * 6, 450 - i * 22); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.waitForTimeout(1400);
  log.push(['drag dial upward (counter-clockwise) from', before, '→', await activeNo(page)]);
  // 5. mouse wheel over the section does not turn it, and page scroll still works
  const t0 = await turn(page);
  await page.mouse.move(900, 450); await page.mouse.wheel(0, 300); await page.waitForTimeout(500);
  log.push(['wheel: turn unchanged', t0 === (await turn(page)), 'scrollY moved', (await page.evaluate(() => window.scrollY)) !== y0]);
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' }); await settle(page);
  await page.evaluate(() => document.querySelector('#services').scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(300);
  // swipe left on the state → next
  const cdp = await page.context().newCDPSession(page);
  const swipe = async (x0, x1, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] });
    const n = 10;
    for (let i = 1; i <= n; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / n, y }] }); await page.waitForTimeout(16); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipe(320, 60, 400);
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(120); await page.screenshot({ path: `${OUT}/live-m-${i}.png` }); }
  await page.waitForTimeout(900);
  log.push(['phone swipe left → active', await activeNo(page)]);
  await swipe(60, 320, 400); await page.waitForTimeout(1500);
  log.push(['phone swipe right → active', await activeNo(page)]);
  await page.evaluate(() => document.querySelectorAll('.dial__name')[3].click()); await page.waitForTimeout(2600);
  log.push(['phone tap 02.4 → active', await activeNo(page)]);
  await m.close();
}
{
  const r = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await r.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' }); await settle(page);
  await page.evaluate(() => document.querySelectorAll('.dial__name')[4].click()); await page.waitForTimeout(80);
  log.push(['reduced motion: click 02.5 → active immediately', await activeNo(page)]);
  await r.close();
}
await browser.close();
for (const l of log) console.log(l.join(' '));
