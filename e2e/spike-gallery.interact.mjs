// Interaction proof for the ribbon archive: browse by scroll, hover, pick a case, unfold, return.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = 'spikes/gallery/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/gallery/';
const browser = await chromium.launch({ channel: 'chrome' });
const log = [];
const hud = (p) => p.evaluate(() => document.querySelector('.hud')?.textContent ?? '');
const sheet = (p, k) => p.evaluate((k) => (window.__sheets ?? []).find((s) => s.k === k) ?? null, k);
const gripBox = async (p, sel) => { const b = await p.locator(sel).boundingBox(); return b; };
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const top = await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.waitForTimeout(700);
  // browse: scroll advances along the rail
  await page.mouse.move(1300, 800);
  for (let i = 0; i < 24; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(24); }
  await page.waitForTimeout(700);
  log.push(['browse · after 2 160 px of scroll →', await hud(page), '· card:', await page.evaluate(() => document.querySelector('.browse__title')?.textContent)]);
  // affordance: the grips sit on the sheets; hovering the next case lifts it toward the visitor
  const near = await page.evaluate(() => Number(document.querySelector('.grip[data-near]')?.getAttribute('aria-label')?.match(/04\.(\d)/)?.[1]) - 1);
  const nextSel = `.grip >> nth=${near + 1}`;
  const before = await sheet(page, near + 1);
  const nb = await gripBox(page, nextSel);
  await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2);
  await page.waitForTimeout(600);
  const after = await sheet(page, near + 1);
  log.push([`hover on the next sheet (04.${near + 2}) → distance ${before.dist} → ${after.dist}`, '· lifted:', after.dist < before.dist - 0.1, '· tag shows «открыть»:', await page.evaluate((s) => getComputedStyle(document.querySelector(s.replace(' >> nth=', ':nth-child(') + ')').querySelector('.grip__verb')).opacity, `.grips .grip >> nth=${near + 2}`)]);
  await page.mouse.move(1300, 800);
  await page.waitForTimeout(500);
  log.push(['pointer away → settles back:', Math.abs((await sheet(page, near + 1)).dist - before.dist) < 0.05]);
  // keyboard: Tab reaches the docked sheet, which lifts on focus, Enter opens it
  await page.locator('.browse__open').focus();
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.className + ' · ' + document.activeElement?.getAttribute('aria-label'));
  log.push(['Tab from the link →', focused]);
  // pick: click the docked sheet itself
  const db = await gripBox(page, '.grip[data-near]');
  const live = [];
  await page.mouse.click(db.x + db.width / 2, db.y + db.height / 2);
  for (let i = 0; i < 7; i++) { await page.waitForTimeout(190); const f = `${OUT}/live-${i}.png`; await page.screenshot({ path: f }); live.push(f); }
  await page.waitForTimeout(700);
  log.push(['click on the docked sheet →', await hud(page), '· open block visible:', await page.evaluate(() => !!document.querySelector('.sheetinfo[data-visible]')), '· grips off:', await page.evaluate(() => !!document.querySelector('.grips[data-hidden]'))]);
  // the rail holds still while a case is open
  const held = await hud(page);
  await page.mouse.wheel(0, 300); await page.waitForTimeout(600);
  log.push(['scroll 300 px while open → rail unchanged:', (await hud(page)).split('·')[1] === held.split('·')[1]]);
  // before / after on the open sheet
  await page.click('.sheetinfo__btn >> nth=0'); await page.waitForTimeout(500);
  log.push(['«До» pressed →', await page.evaluate(() => document.querySelector('.sheetinfo__btn[aria-pressed="true"]')?.textContent)]);
  await page.click('.sheetinfo__btn >> nth=2'); await page.waitForTimeout(400);
  // return with «×»: the page was scrolled meanwhile, so it is put back where the case was opened
  const posBefore = (await hud(page)).match(/pos ([\d.]+)/)?.[1];
  const scrolledTo = await page.evaluate(() => window.scrollY);
  const closeBox = await page.locator('.sheetclose').boundingBox();
  const sheetBox = await page.evaluate(() => window.__ribbon.focusBox);
  log.push(['«×» sits at the sheet\'s top-right corner:', Math.abs(closeBox.x - (sheetBox.x + sheetBox.w + 20)) < 3 && Math.abs(closeBox.y - (sheetBox.y - 4)) < 3, `(${Math.round(closeBox.x)},${Math.round(closeBox.y)} vs sheet right ${Math.round(sheetBox.x + sheetBox.w)}, top ${Math.round(sheetBox.y)})`]);
  await page.click('.sheetclose');
  const samples = [];
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(150); samples.push((await hud(page)).match(/pos ([\d.]+)/)?.[1]); }
  log.push(['«×» → pos', posBefore, '→', samples.join(' '), '· scrollY', scrolledTo, '→', await page.evaluate(() => window.scrollY), '· browse block back:', await page.evaluate(() => !document.querySelector('.browse[data-hidden]'))]);
  // a neighbour opened directly, then «Назад в архив» — same position again
  const nb2 = await gripBox(page, `.grip >> nth=${near + 1}`);
  await page.mouse.click(nb2.x + nb2.width / 2, nb2.y + nb2.height / 2); await page.waitForTimeout(1700);
  log.push(['click on the next sheet →', await hud(page)]);
  await page.click('.sheetinfo__back'); await page.waitForTimeout(1500);
  log.push(['«Назад в архив» →', await hud(page)]);
  // keyboard: open from the index, close with Escape
  await page.click('.rail button >> nth=6'); await page.waitForTimeout(1700);
  log.push(['index 04.7 →', await hud(page)]);
  await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
  log.push(['Escape →', await hud(page)]);
  // leaving the section while a case is open closes it, and the page is never trapped
  await page.click('.grip[data-near]', { force: true }); // the sheet drifts, so it is never 'stable'
  await page.waitForTimeout(1500);
  for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(16); }
  await page.waitForTimeout(1600);
  log.push(['open, then scroll on → case closed:', (await hud(page)).includes('focus —'), '· section left behind:', await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().bottom < 0)]);
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
  await page.tap('.grip[data-near]', { force: true }); await page.waitForTimeout(1800);
  log.push(['phone · tap on the docked sheet →', await hud(page), '· block visible:', await page.evaluate(() => !!document.querySelector('.sheetinfo[data-visible]'))]);
  await page.screenshot({ path: `${OUT}/m-open.png` });
  await page.tap('.sheetinfo__back'); await page.waitForTimeout(1500);
  log.push(['phone · back →', await hud(page)]);
  await page.tap('.browse__open'); await page.waitForTimeout(1800);
  log.push(['phone · tap «Открыть кейс» →', await hud(page)]);
  await m.close();
}
await browser.close();
for (const l of log) console.log(l.join(' '));
