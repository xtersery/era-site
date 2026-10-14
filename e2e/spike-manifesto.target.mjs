// Манифест against its target: the room at rest (after the descent) and the
// seam into Услуги at half way, on the desktop widths and the two phones.
// TAG names the set; screenshots land in spikes/hero-stone/__captures__/target/.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env['BASE'] ?? 'http://localhost:5173/';
const TAG = process.env['TAG'] ?? 'now';
const OUT = 'spikes/hero-stone/__captures__/target';
mkdirSync(OUT, { recursive: true });
const SIZES = [
  { w: 1586, h: 992, phone: false },
  { w: 1440, h: 900, phone: false },
  { w: 1280, h: 800, phone: false },
  { w: 390, h: 844, phone: true },
  { w: 430, h: 932, phone: true },
];
const browser = await chromium.launch({ channel: 'chrome' });
for (const { w, h, phone } of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'ru-RU', deviceScaleFactor: phone ? 2 : 1, ...(phone ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage();
  await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
  await page.goto(base, { waitUntil: 'load', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  if (phone) {
    await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, h);
    await page.waitForTimeout(1800);
  } else {
    await page.mouse.move(w / 2, h / 2);
    await page.mouse.wheel(0, 120);
    await page.waitForTimeout(9500);
  }
  await page.screenshot({ path: `${OUT}/${TAG}-${w}-rest.png` });
  const geo = await page.evaluate(() => {
    const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
    return { plate: r('.mf__plate'), soft: r('.mf__line--soft'), grand: r('.mf__line--grand'), text: r('.mf__text'), aside: r('.mf__aside'), net: r('.mf__obj--net') ?? r('.mf__obj--drape'), ginkgo: r('.mf__obj--ginkgo'), docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight };
  });
  const sv = await page.evaluate(() => Math.round(document.querySelector('.sv-frame').getBoundingClientRect().top + scrollY));
  await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, sv - h * 0.5);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${TAG}-${w}-seam50.png` });
  console.log(TAG, w, JSON.stringify(geo));
  await ctx.close();
}
await browser.close();
