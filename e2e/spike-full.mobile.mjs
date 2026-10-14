// The full page on a phone (390×844, touch): the manifesto at rest, the seam
// into Услуги, Услуги pinned, Отзывы, the page's foot — screenshots plus the
// geometry that matters (empty strips under the last room, rooms collapsed).
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env['BASE'] ?? 'http://localhost:5173/';
const TAG = process.env['TAG'] ?? 'now';
const OUT = `spikes/full/__captures__/mobile`;
mkdirSync(OUT, { recursive: true });
const W = +(process.env['W'] ?? 390), H = +(process.env['H'] ?? 844);
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, locale: 'ru-RU', isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(base, { waitUntil: 'load', timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(2500);
const to = async (y, wait = 900) => {
  await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo({ top: y, behavior: 'instant' }); }, y);
  await page.waitForTimeout(wait);
};
const shot = (name) => page.screenshot({ path: `${OUT}/${TAG}-${name}.png` });
const top = (sel) => page.evaluate((sel) => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; }, sel);

// the manifesto's rest (after the film the stage is pinned one viewport)
await to(H, 1500);
await shot('1-manifesto');
const sv = await top('.sv-frame');
for (const k of [0.25, 0.5, 0.75]) { await to(sv - H * (1 - k)); await shot(`2-seam-${Math.round(k * 100)}`); }
await to(sv + 4, 1500);
await shot('3-services');
const rv = await top('#reviews');
await to(rv, 1500); await shot('4-reviews');
await to(rv + H * 0.8, 1200); await shot('4-reviews-b');
const geo = await page.evaluate(() => {
  const doc = document.documentElement.scrollHeight;
  const rooms = [...document.querySelectorAll('main section, footer')].map((s) => { const r = s.getBoundingClientRect(); return { id: s.id || s.className.split(' ')[0], top: Math.round(r.top + scrollY), h: Math.round(r.height) }; });
  const last = Math.max(...[...document.body.querySelectorAll('section, footer')].map((s) => s.getBoundingClientRect().bottom + scrollY));
  const rvEl = document.querySelector('#reviews');
  const rvKids = rvEl ? [...rvEl.querySelectorAll('blockquote, li, h2, a')].slice(0, 12).map((e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return `${e.tagName}.${(e.className || '').toString().split(' ')[0]} h${Math.round(r.height)} op${cs.opacity} vis${cs.visibility}`; }) : [];
  return { doc, last: Math.round(last), rooms, rvKids };
});
console.log(JSON.stringify(geo, null, 1));
await to(geo.doc, 1500); await shot('5-foot');
console.log('errors', errors);
await browser.close();
