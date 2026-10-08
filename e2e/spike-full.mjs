// The full page: is it one experience? Hero → Манифест by the approved descent,
// the flow's rooms after, Стоимость out of the document and one click away,
// one scroller, one set of pins, the two headers handing over, the way back.
// The rooms and the passages themselves are proved by spike-flow.handoff.mjs
// (BASE=http://localhost:5173/spikes/full/) and the hero's own scripts.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env['BASE'] ?? 'http://localhost:5173/spikes/full/';
const OUT = 'spikes/full/__captures__';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
let failures = 0;
const check = (ok, label) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failures += 1; };
const ORDER = ['hero', 'manifesto', 'services', 'cases', 'specialists', 'founder', 'reviews', 'contact', 'inquiry'];

async function run({ width, height, reduced = false, mobile = false, tag }) {
  const ctx = await browser.newContext({ viewport: { width, height }, locale: 'ru-RU', reducedMotion: reduced ? 'reduce' : 'no-preference', ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : {}) });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('sanity.io') && !m.text().includes('ERR_FAILED') && errors.push(m.text()));
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  console.log(`\n== full ${tag} (${width}x${height}${reduced ? ', reduced' : ''}${mobile ? ', touch' : ''}) ==`);
  const g = await page.evaluate((ORDER) => {
    const tops = ORDER.map((id) => { const els = document.querySelectorAll('#' + id); return { id, n: els.length, top: els[0] ? Math.round(els[0].getBoundingClientRect().top + scrollY) : null }; });
    const pins = window.__ST.getAll().filter((t) => t.pin).map((t) => t.trigger.id);
    return { tops, pins, pricingInDoc: !!document.querySelector('section#pricing, #pricing'), scroll: document.documentElement.dataset.scroll, lenis: !!window.__lenis, canvases: document.querySelectorAll('canvas').length, hh: !!document.querySelector('.hh'), bar: getComputedStyle(document.querySelector('.flowbar')).visibility, transition: window.__transition?.status ?? null, docH: document.documentElement.scrollHeight };
  }, ORDER);
  check(g.tops.every((t) => t.n === 1), `every room exactly once: ${g.tops.map((t) => `${t.id}${t.n === 1 ? '' : '×' + t.n}`).join(' ')}`);
  const order = g.tops.filter((t) => t.id !== 'manifesto').map((t) => t.top);
  check(order.every((y, i) => i === 0 || y >= order[i - 1]), `in the approved order down the page (${order.join(' < ')})`);
  check(!g.pricingInDoc, 'Стоимость is not in the document');
  const expectedPins = reduced ? 'services cases specialists founder' : 'hero services cases specialists founder';
  check(g.pins.length === new Set(g.pins).size && g.pins.join(' ') === expectedPins, `one pin each, in order: ${g.pins.join(' → ')}${reduced ? ' (no hero pin: the still room)' : ''}`);
  check(g.lenis === !reduced && g.scroll === (reduced ? 'native' : 'lenis'), `the project's one scroller (${g.scroll})`);
  check(g.canvases <= 3, `${g.canvases} canvases — the hero's film, the archive, the water; nothing else`);
  check(g.hh && g.bar === 'hidden', `at the top the hero's own header is up and the flow's bar is not (${g.bar})`);
  await page.screenshot({ path: `${OUT}/full-${tag}-hero.png`, timeout: 60000 });

  const st = () => page.evaluate(() => ({ y: Math.round(scrollY), t: window.__transition?.status ?? null, p: +(window.__transition?.progress ?? 0).toFixed(2), bar: getComputedStyle(document.querySelector('.flowbar')).visibility, hh: +getComputedStyle(document.querySelector('.hh')).opacity }));
  if (!reduced && !mobile) {
    check(g.transition === 'armed', `the descent's gateway is armed (${g.transition})`);
    await page.mouse.move(width * 0.5, height * 0.5);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(2500);
    const mid = await st();
    check(mid.t === 'playing' && mid.hh === 0 && mid.bar === 'hidden', `one wheel plays the film: ${mid.t} at ${mid.p}, the hero's header gone, the bar still held`);
    await page.waitForTimeout(6000);
    const landed = await st();
    check(landed.p === 1 && landed.y === height && landed.bar === 'visible', `landed at the manifesto's rest (y ${landed.y} = ${height}), the bar in (${landed.bar})`);
    await page.screenshot({ path: `${OUT}/full-${tag}-manifesto.png`, timeout: 60000 });
    await page.mouse.wheel(0, 240);
    await page.waitForTimeout(1200);
    const on = await st();
    check(on.y > height + 50 && on.t === 'released', `past the manifesto the page scrolls as a document (y ${on.y}, ${on.t})`);
    // the way home: back to the rest, one wheel up plays the film back and returns the hero's header
    await page.evaluate((h) => { window.__lenis?.scrollTo(h, { immediate: true, force: true }); scrollTo({ top: h, behavior: 'instant' }); }, height);
    await page.waitForTimeout(800);
    await page.mouse.wheel(0, -120);
    await page.waitForTimeout(8000);
    const home = await st();
    check(home.y === 0 && home.p === 0 && home.hh === 1 && home.bar === 'hidden', `one wheel up from the rest plays the film back to the hero (y ${home.y}, header ${home.hh}, bar ${home.bar})`);
  } else if (mobile) {
    // the phone plays the same film, shorter, by a swipe (proved by the hero's own input script); here: it is armed and the bar is held
    check(g.transition === 'armed', `the phone's gateway is armed for the swipe (${g.transition})`);
    await page.evaluate((h) => { window.__lenis?.scrollTo(h, { immediate: true, force: true }); scrollTo({ top: h, behavior: 'instant' }); }, height);
    await page.waitForTimeout(1200);
    const bar = await page.evaluate(() => getComputedStyle(document.querySelector('.flowbar')).visibility);
    check(bar === 'visible', `at the manifesto's rest the bar is in (${bar})`);
  } else {
    // no film: the manifesto is a still room after the hero; the bar comes in with it
    const room = await page.evaluate(() => !!document.querySelector('.mf-room') && !window.__transition);
    check(room, 'without the film the manifesto is the still room, no gateway');
    await page.evaluate((h) => scrollTo({ top: h * 1.2, behavior: 'instant' }), height);
    await page.waitForTimeout(800);
    const bar = await page.evaluate(() => getComputedStyle(document.querySelector('.flowbar')).visibility);
    check(bar === 'visible', `the bar is in once the manifesto has arrived (${bar})`);
  }

  // navigation: the bar's index reaches every room; Стоимость opens the layer without moving the page
  const links = await page.evaluate(() => [...document.querySelectorAll('.flowbar__link')].map((a) => a.getAttribute('href')));
  check(['#services', '#cases', '#specialists', '#founder', '#reviews', '#contact', '#inquiry', '#pricing'].every((h) => links.includes(h)), `the bar's index: ${links.join(' ')}`);
  await page.evaluate(() => { const y = document.querySelector('#reviews').getBoundingClientRect().top + scrollY; window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo({ top: y, behavior: 'instant' }); });
  await page.waitForTimeout(900);
  const yBefore = await page.evaluate(() => Math.round(scrollY));
  await page.evaluate(() => document.querySelector('.flowbar__utility a')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
  await page.waitForTimeout(500);
  const layer = await page.evaluate(() => ({ open: !!document.querySelector('.pricelayer'), y: Math.round(scrollY) }));
  check(layer.open && layer.y === yBefore, `Стоимость opens as the layer from the bar, the page held at ${layer.y}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check(!(await page.evaluate(() => !!document.querySelector('.pricelayer'))), 'Esc closes the layer');

  // the end of the page: black, the emblem, the form; no horizontal overflow anywhere
  await page.evaluate(() => { window.__lenis?.scrollTo(1e7, { immediate: true, force: true }); scrollTo({ top: 1e7, behavior: 'instant' }); });
  await page.waitForTimeout(900);
  const end = await page.evaluate(() => ({ bg: getComputedStyle(document.querySelector('#inquiry')).backgroundColor, title: document.querySelector('.talk__title')?.textContent, overflow: document.documentElement.scrollWidth - innerWidth, send: !!document.querySelector('.talk__send') }));
  check(end.bg === 'rgb(7, 7, 7)' && end.title === 'Начнёмс разговора.' && end.send, `the page ends in the black room with the form (${end.bg})`);
  check(end.overflow === 0, `no horizontal overflow (${end.overflow}px)`);
  await page.screenshot({ path: `${OUT}/full-${tag}-end.png`, timeout: 60000 });
  check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await ctx.close();
}

const only = process.env['ONLY'];
const runs = [
  { width: 1440, height: 900, tag: 'd1440' },
  { width: 390, height: 844, mobile: true, tag: 'm390' },
  { width: 1440, height: 900, reduced: true, tag: 'reduced' },
];
for (const r of runs) if (!only || r.tag === only) await run(r);
await browser.close();
console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
