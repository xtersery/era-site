// Interaction proof for the sitting: scroll walks the row and snaps to whole states; «далее» and the index go to a state.
import { chromium } from '@playwright/test';
const base = 'http://localhost:5173/spikes/portraits/';
const browser = await chromium.launch({ channel: 'chrome' });
const log = [];
const hud = (p) => p.evaluate(() => document.querySelector('.hud')?.textContent ?? '');
const readable = (p) => p.evaluate(() => {
  const a = [...document.querySelectorAll('.sitter')].find((el) => !el.hidden && el.getAttribute('aria-hidden') === 'false');
  if (!a) return null;
  const r = a.querySelector('.sitter__name').getBoundingClientRect();
  const c = a.querySelector('.sitter__primary').getBoundingClientRect();
  return { name: a.querySelector('.sitter__name')?.textContent, mask: getComputedStyle(a).maskImage || getComputedStyle(a).webkitMaskImage, inView: r.top >= 0 && c.bottom <= window.innerHeight, cta: a.querySelector('.sitter__primary')?.textContent };
});
async function run(label, viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const top = await page.evaluate(() => document.querySelector('#specialists').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.waitForTimeout(600);
  log.push([label, 'at the top →', await hud(page), '· readable:', JSON.stringify(await readable(page))]);
  // a partial scroll: the transition is scrubbed, then snap lands on a whole state
  if (opts.isMobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 500, yDistance: -380, speed: 1200, gestureSourceType: 'touch' });
  } else {
    await page.mouse.move(700, 450);
    for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(30); }
  }
  await page.waitForTimeout(150);
  const mid = await hud(page);
  await page.waitForTimeout(1600);
  log.push([label, 'after 360 px: mid', mid, '→ snapped', await hud(page), '· readable:', JSON.stringify(await readable(page))]);
  // the row goes to a specialist
  if (opts.isMobile) await page.tap('.row button >> nth=2'); else await page.click('.row button >> nth=2');
  await page.waitForTimeout(1400);
  log.push([label, 'row 05.3 →', await hud(page), '· readable:', JSON.stringify(await readable(page))]);
  if (!opts.isMobile) {
    await page.click('.row button >> nth=3'); await page.waitForTimeout(1500);
    log.push([label, 'row 05.4 →', await hud(page)]);
    // keyboard: the current label's CTA is the only one in the tab order
    log.push([label, 'focusable CTAs:', await page.evaluate(() => [...document.querySelectorAll('.sitter__primary')].filter((a) => a.tabIndex === 0).map((a) => a.textContent).join(' | '))]);
  }
  // scroll on: the section is left behind
  for (let i = 0; i < 50; i++) { if (opts.isMobile) { await page.evaluate(() => window.scrollBy(0, 200)); } else { await page.mouse.wheel(0, 200); } await page.waitForTimeout(16); }
  await page.waitForTimeout(800);
  log.push([label, 'scroll on → section left behind:', await page.evaluate(() => document.querySelector('#specialists').getBoundingClientRect().bottom < 0)]);
  await ctx.close();
}
// the grid: the name, the role and the sentence sit at the same y on every state
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const rows = [];
  for (let k = 0; k < 4; k++) {
    await page.goto(base + `?k=${k}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
    rows.push(await page.evaluate(() => {
      const a = [...document.querySelectorAll('.sitter')].find((el) => !el.hidden);
      const r = (sel) => Math.round(a.querySelector(sel).getBoundingClientRect().top);
      return { nameBottom: Math.round(a.querySelector('.sitter__name').getBoundingClientRect().bottom), role: r('.sitter__role'), approach: r('.sitter__approach'), facts: r('.sitter__facts'), focal: Math.round(document.querySelector('.focal').getBoundingClientRect().top) };
    }));
  }
  const same = (key) => new Set(rows.map((r) => r[key])).size === 1;
  log.push(['grid · name bottom / role / sentence / facts / focal identical on all 4 states:', ['nameBottom', 'role', 'approach', 'facts', 'focal'].map((k) => `${k} ${same(k) ? '=' : '≠'} ${rows[0][k]}`).join(' · ')]);
  await ctx.close();
}
await run('desktop', { width: 1440, height: 900 });
await run('phone', { width: 390, height: 844 }, { deviceScaleFactor: 2, isMobile: true, hasTouch: true });
// reduced motion: whole states only, no travel
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const top = await page.evaluate(() => document.querySelector('#specialists').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y + 0.7 * window.innerHeight, behavior: 'instant' }), top);
  await page.waitForTimeout(400);
  log.push(['reduced · 0.7 vh into the row →', await hud(page), '· light visible:', await page.evaluate(() => getComputedStyle(document.querySelector('.light')).opacity !== '0')]);
  await ctx.close();
}
// frame rate while scrubbing
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const top = await page.evaluate(() => document.querySelector('#specialists').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__f = []; let last = performance.now(); const t = (n) => { window.__f.push(n - last); last = n; if (window.__f.length < 240) requestAnimationFrame(t); }; requestAnimationFrame(t); });
  await page.mouse.move(700, 450);
  for (let i = 0; i < 36; i++) { await page.mouse.wheel(0, 60); await page.waitForTimeout(40); }
  await page.waitForTimeout(2500);
  const f = (await page.evaluate(() => window.__f.slice(4))).filter((x) => x < 500);
  const s = [...f].sort((a, b) => a - b);
  log.push(['scrub · frames', f.length, '· median', s[Math.floor(s.length / 2)].toFixed(1), 'ms · p95', s[Math.floor(s.length * 0.95)].toFixed(1), 'ms · over 33 ms', ((f.filter((x) => x > 33.4).length / f.length) * 100).toFixed(1) + ' %']);
  await ctx.close();
}
await browser.close();
for (const l of log) console.log(l.join(' '));
