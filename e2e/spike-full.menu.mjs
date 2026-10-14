// The phone's menus: the hero's index over its frosted ground, and the flow
// bar after the hero — «03 Стоимость» in the centre, «Меню» on the right (one
// «Стоимость» only), opening the same rooms over the same ground. 390, 430
// and an iPhone viewport. Screenshots → spikes/full/__captures__/menu/.
import { chromium, webkit, devices } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env['BASE'] ?? 'http://localhost:5173/';
const OUT = 'spikes/full/__captures__/menu';
mkdirSync(OUT, { recursive: true });
const RUNS = [
  ['chrome-390', chromium, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['chrome-430', chromium, { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }],
  ['webkit-iphone14', webkit, { ...devices['iPhone 14'] }],
  ['desktop-1440', chromium, { viewport: { width: 1440, height: 900 } }],
];
let failures = 0;
const check = (ok, label) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failures++; };
for (const [tag, engine, opts] of RUNS) {
  const b = engine === chromium ? await chromium.launch({ channel: 'chrome' }) : await webkit.launch();
  const page = await (await b.newContext({ ...opts, locale: 'ru-RU' })).newPage();
  await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  const desk = tag.startsWith('desktop');
  console.log(`\n== ${tag} ==`);
  const shot = (n) => page.screenshot({ path: `${OUT}/${tag}-${n}.png` });
  const to = async (y) => { await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, y); await page.waitForTimeout(1400); };
  // what is visible in the bar: the elements with text, and how many say «Стоимость»
  const bar = () => page.evaluate(() => {
    const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
    const items = [...document.querySelectorAll('.flowbar a, .flowbar button')].filter(vis).map((e) => e.textContent.trim().replace(/\s+/g, ' '));
    return { items, prices: items.filter((t) => /Стоимость/.test(t)).length };
  });
  await shot('hero-closed');
  if (!desk) {
    await page.click('.hh__menu'); await page.waitForTimeout(1300);
    const s = await page.evaluate(() => { const sc = document.querySelector('.hh__scrim'); const cs = getComputedStyle(sc); const r = sc.getBoundingClientRect(); const top = document.elementFromPoint(innerWidth - 30, 300)?.closest('.hh__index, .hh__scrim, .hh'); return { op: cs.opacity, cover: r.width >= innerWidth && r.height >= innerHeight, blur: cs.backdropFilter || cs.webkitBackdropFilter, mark: document.elementFromPoint(40, 40)?.closest('.hh__brand') !== null, menuBtn: document.elementFromPoint(innerWidth - 40, 40)?.closest('.hh__menu, .hh__right') !== null }; });
    check(s.op === '1' && s.cover, `hero: the frosted ground is up and covers the screen (opacity ${s.op}, ${s.blur})`);
    check(s.mark && s.menuBtn, 'hero: the mark and the menu button stay over the ground');
    await shot('hero-menu-open');
    await page.click('.hh__menu'); await page.waitForTimeout(900);
    check(await page.evaluate(() => getComputedStyle(document.querySelector('.hh__scrim')).visibility === 'hidden'), 'hero: closed, the ground is gone');
  }
  for (const id of ['services', 'reviews', 'inquiry']) {
    const y = await page.evaluate((s) => Math.round(document.querySelector(s).getBoundingClientRect().top + scrollY), '#' + id);
    await to(y + 4);
    const b1 = await bar();
    if (desk) check(b1.items.includes('Стоимость') && !b1.items.includes('Меню'), `${id}: desktop bar unchanged (${b1.items.length} items, CTA «Стоимость», no «Меню»)`);
    else check(b1.prices === 1 && b1.items.at(-1) === 'Меню', `${id}: bar = ${JSON.stringify(b1.items)} — one «Стоимость», «Меню» on the right`);
    await shot(`${id}-bar`);
    if (!desk) {
      await page.click('.flowbar__menu-button'); await page.waitForTimeout(900);
      const o = await page.evaluate(() => ({ links: [...document.querySelectorAll('.flowbar__menu-link')].filter((a) => a.getBoundingClientRect().height > 0).length, scrim: getComputedStyle(document.querySelector('.flowbar__scrim')).opacity, blend: getComputedStyle(document.querySelector('.flowbar')).mixBlendMode, label: document.querySelector('.flowbar__menu-button').textContent }));
      check(o.links === 8 && o.scrim === '1' && o.blend === 'normal' && o.label === 'Закрыть', `${id}: menu open — ${o.links} rooms on the frosted ground, the button reads «${o.label}»`);
      await shot(`${id}-menu-open`);
      await page.keyboard.press('Escape'); await page.waitForTimeout(700);
      const c = await page.evaluate(() => ({ scrim: getComputedStyle(document.querySelector('.flowbar__scrim')).visibility, blend: getComputedStyle(document.querySelector('.flowbar')).mixBlendMode }));
      check(c.scrim === 'hidden' && c.blend === 'difference', `${id}: closed — the ground gone, the bar back to difference`);
    }
  }
  if (!desk) {
    // a room from the menu goes there and closes it
    await page.click('.flowbar__menu-button'); await page.waitForTimeout(700);
    await page.click('.flowbar__menu-link[href="#contact"]'); await page.waitForTimeout(2500);
    const g = await page.evaluate(() => ({ open: document.querySelector('.flowbar').classList.contains('is-menu-open'), near: Math.abs(document.querySelector('#contact').getBoundingClientRect().top) < innerHeight }));
    check(!g.open && g.near, 'a room from the menu: the page goes to Адрес and the menu closes');
  }
  await b.close();
}
console.log(failures ? `\n${failures} check(s) FAILED` : '\nall menu checks passed');
process.exitCode = failures ? 1 : 0;
