// Interaction proof for the ribbon archive: browse by scroll, pick a case, unfold, return.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = 'spikes/gallery/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/gallery/';
const browser = await chromium.launch({ channel: 'chrome' });
const log = [];
const hud = (p) => p.evaluate(() => document.querySelector('.hud')?.textContent ?? '');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const top = await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.waitForTimeout(700);
  // browse: scroll advances along the rail
  await page.mouse.move(900, 450);
  for (let i = 0; i < 22; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(24); }
  await page.waitForTimeout(700);
  log.push(['browse · after 2 000 px of scroll →', await hud(page), '· card:', await page.evaluate(() => document.querySelector('.browse__title')?.textContent)]);
  // pick: click the sheet itself
  const live = [];
  await page.mouse.click(900, 430);
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(200); const f = `${OUT}/live-${i}.png`; await page.screenshot({ path: f }); live.push(f); }
  await page.waitForTimeout(900);
  log.push(['click on a sheet →', await hud(page), '· open block visible:', await page.evaluate(() => !!document.querySelector('.sheetinfo[data-visible]'))]);
  // the rail holds still while a case is open
  const before = await hud(page);
  await page.mouse.wheel(0, 400); await page.waitForTimeout(600);
  log.push(['scroll while open → rail unchanged:', (await hud(page)).split('·')[1] === before.split('·')[1]]);
  // before / after on the open sheet
  await page.click('.sheetinfo__btn >> nth=0'); await page.waitForTimeout(500);
  log.push(['«До» pressed →', await page.evaluate(() => document.querySelector('.sheetinfo__btn[aria-pressed="true"]')?.textContent)]);
  await page.click('.sheetinfo__btn >> nth=2'); await page.waitForTimeout(400);
  // return
  await page.click('.sheetinfo__back'); await page.waitForTimeout(1500);
  log.push(['«Назад в архив» →', await hud(page), '· browse block back:', await page.evaluate(() => !document.querySelector('.browse[hidden]'))]);
  // keyboard: open from the index, close with Escape
  await page.click('.rail button >> nth=3'); await page.waitForTimeout(1600);
  log.push(['index 04.4 →', await hud(page)]);
  await page.keyboard.press('Escape'); await page.waitForTimeout(1400);
  log.push(['Escape →', await hud(page)]);
  // scroll resumes, and the page is never trapped
  for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(16); }
  await page.waitForTimeout(700);
  log.push(['scroll on → section left behind:', await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().bottom < 0)]);
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const top = await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.waitForTimeout(600);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.synthesizeScrollGesture', { x: 195, y: 500, yDistance: -700, speed: 900, gestureSourceType: 'touch' });
  await page.waitForTimeout(800);
  log.push(['phone · touch scroll →', await hud(page)]);
  await page.tap('.browse__open'); await page.waitForTimeout(1800);
  log.push(['phone · tap «Открыть кейс» →', await hud(page), '· block visible:', await page.evaluate(() => !!document.querySelector('.sheetinfo[data-visible]'))]);
  await page.screenshot({ path: `${OUT}/m-open.png` });
  await page.tap('.sheetinfo__back'); await page.waitForTimeout(1500);
  log.push(['phone · back →', await hud(page)]);
  await m.close();
}
await browser.close();
for (const l of log) console.log(l.join(' '));
