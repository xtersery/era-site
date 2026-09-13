// Interaction proof for the radial spike — scroll-driven (snap) model with its secondary controls,
// plus the drag model (A) for comparison. Prints one line per check.
import { chromium } from '@playwright/test';
const base = 'http://localhost:5173/spikes/radial/';
const browser = await chromium.launch({ channel: 'chrome' });
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(900); };
const activeNo = (page) => page.evaluate(() => document.querySelector('.state[data-active] .state__no')?.textContent?.trim().slice(0, 4));
const turn = (page) => page.evaluate(() => Number(document.querySelector('.hud')?.textContent?.match(/turn (-?[\d.]+)/)?.[1]));
const toSection = async (page) => { const top = await page.evaluate(() => document.querySelector('#services').getBoundingClientRect().top + window.scrollY); await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top); await page.waitForTimeout(500); return top; };
const log = [];
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' }); await settle(page);
  const top = await toSection(page);
  // scroll is the driver
  await page.mouse.move(900, 450);
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 100); await page.waitForTimeout(60); }
  await page.waitForTimeout(1800);
  log.push(['B · 8 wheel ticks (800 px, 85vh/state) →', await activeNo(page), 'turn', await turn(page)]);
  // secondary: click a name → the page moves to that state
  await page.evaluate(() => document.querySelectorAll('.dial__name')[4].click()); await page.waitForTimeout(2500);
  log.push(['B · click 02.5 →', await activeNo(page), 'scrollY moved to state', Math.round((await page.evaluate(() => window.scrollY) - top) / (0.85 * 900) * 100) / 100, 'states']);
  await page.focus('#services'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(2200);
  log.push(['B · ArrowRight →', await activeNo(page)]);
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(2200); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(2200);
  log.push(['B · ArrowLeft ×2 →', await activeNo(page)]);
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(1500);
  log.push(['B · ArrowDown (native page key) → still on', await activeNo(page), 'scroll advanced', (await page.evaluate(() => window.scrollY)) > top + 3 * 0.85 * 900]);
  // optional drag on the arc
  const before = await activeNo(page);
  await page.mouse.move(470, 450); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(470 - i * 6, 450 - i * 22); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.waitForTimeout(2200);
  log.push(['B · drag the arc upward from', before, '→', await activeNo(page)]);
  // no trap: scroll past the end
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(20); }
  await page.waitForTimeout(800);
  log.push(['B · scroll on → section left behind', await page.evaluate(() => document.querySelector('#services').getBoundingClientRect().bottom < 0)]);
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' }); await settle(page);
  await toSection(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 500, yDistance: -700, speed: 900, gestureSourceType: 'touch' }); await page.waitForTimeout(2200);
  log.push(['B phone · one touch scroll of 700 px →', await activeNo(page)]);
  const swipe = async (x0, x1, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y }] }); for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 10, y }] }); await page.waitForTimeout(16); } await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
  await swipe(320, 60, 400); await page.waitForTimeout(2200);
  log.push(['B phone · swipe left (secondary) →', await activeNo(page)]);
  await page.evaluate(() => document.querySelectorAll('.dial__name')[0].click()); await page.waitForTimeout(2600);
  log.push(['B phone · tap 02.1 on the arc →', await activeNo(page)]);
  await m.close();
}
{
  const r = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await r.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' }); await settle(page); await toSection(page);
  await page.evaluate(() => document.querySelectorAll('.dial__name')[4].click()); await page.waitForTimeout(1600);
  log.push(['B · reduced motion: click 02.5 →', await activeNo(page)]);
  await r.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '?drive=drag&hud=1', { waitUntil: 'networkidle' }); await settle(page); await toSection(page);
  await page.evaluate(() => document.querySelectorAll('.dial__name')[1].click()); await page.waitForTimeout(2600);
  log.push(['A · click 02.2 →', await activeNo(page)]);
  await page.mouse.move(900, 450); const t0 = await turn(page); await page.mouse.wheel(0, 300); await page.waitForTimeout(500);
  log.push(['A · wheel: turn unchanged', t0 === (await turn(page)), '(the page scrolls instead)']);
  await ctx.close();
}
await browser.close();
for (const l of log) console.log(l.join(' '));
