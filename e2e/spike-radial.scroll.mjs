// Scroll-model comparison for the radial spike: drag (A) vs scrub / snap / step (B).
// Measures, per model: states visited in order, skipped states, resting position after a
// fast flick, time to reach 02.7 at a calm pace, exit past the end, exit back above the start.
import { chromium } from '@playwright/test';
const base = 'http://localhost:5173/spikes/radial/';
const browser = await chromium.launch({ channel: 'chrome' });
const modes = process.argv.slice(2).length ? process.argv.slice(2) : ['scrub', 'snap', 'step'];
const dists = [70, 85, 100];
const read = (page) => page.evaluate(() => ({ turn: Number(document.querySelector('.hud')?.textContent?.match(/turn (-?[\d.]+)/)?.[1]), y: window.scrollY, active: document.querySelector('.state[data-active] .state__no')?.textContent?.trim().slice(0, 4) }));
async function run(mode, dist) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}?drive=${mode}&d=${dist}&hud=1`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const top = await page.evaluate(() => document.querySelector('#services').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.mouse.move(900, 450);
  await page.waitForTimeout(400);
  const per = (dist / 100) * 900;
  // 1. calm pace: 100 px wheel ticks every 60 ms; record the sequence of active states
  const seen = [];
  const t0 = Date.now();
  let reached = null;
  for (let i = 0; i < (per * 6) / 100 + 10; i++) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(60);
    const r = await read(page);
    if (seen[seen.length - 1] !== r.active) seen.push(r.active);
    if (r.active === '02.7' && reached === null) reached = Date.now() - t0;
  }
  await page.waitForTimeout(1800);
  const afterCalm = await read(page);
  const order = seen.filter(Boolean);
  const skipped = order.some((s, i) => i > 0 && Math.abs(Number(s.slice(3)) - Number(order[i - 1].slice(3))) > 1);
  // 2. exit past the end: are we out of the pin (section top above the viewport)?
  await page.mouse.wheel(0, 600); await page.waitForTimeout(600);
  const exitBottom = await page.evaluate(() => document.querySelector('#services').getBoundingClientRect().bottom < window.innerHeight);
  // 3. back to the start and above: reverse sequence, then exit upward
  const back = [];
  for (let i = 0; i < (per * 6) / 100 + 16; i++) { await page.mouse.wheel(0, -100); await page.waitForTimeout(60); const r = await read(page); if (back[back.length - 1] !== r.active) back.push(r.active); }
  await page.waitForTimeout(600);
  const exitTop = await page.evaluate(() => document.querySelector('#services').getBoundingClientRect().top > 0);
  // 4. fast flick from 02.1: one burst of 1200 px in 6 events; where does it rest?
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top); await page.waitForTimeout(700);
  const flickSeen = [];
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(16); }
  for (let i = 0; i < 30; i++) { await page.waitForTimeout(60); const r = await read(page); if (flickSeen[flickSeen.length - 1] !== r.active) flickSeen.push(r.active); }
  await page.waitForTimeout(1500);
  const afterFlick = await read(page);
  // 5. secondary control: click 02.5 on the arc → page moves, state follows
  await page.evaluate(() => document.querySelectorAll('.dial__name')[4].click()); await page.waitForTimeout(2500);
  const afterClick = await read(page);
  await ctx.close();
  return { mode, dist, order: order.join('→'), skipped, restCalm: afterCalm.turn, msTo07: reached, exitBottom, back: back.filter(Boolean).join('→'), exitTop, flick: flickSeen.filter(Boolean).join('→'), restFlick: afterFlick.turn, click05: afterClick.active + ' turn ' + afterClick.turn };
}
const rows = [];
for (const mode of modes) for (const dist of dists) { const r = await run(mode, dist); rows.push(r); console.log(JSON.stringify(r)); }
await browser.close();
