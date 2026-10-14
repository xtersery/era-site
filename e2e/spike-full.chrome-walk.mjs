// The browser chrome's tone walked down the whole page and back up (390 px
// phone, or `webkit` for an iPhone viewport): at every fifth of a screen,
// the page's top edge against the tone the chrome was given; prints the
// steps where one is clearly light and the other clearly dark.
import { chromium, webkit, devices } from '@playwright/test';
const engine = process.argv[2] === 'webkit' ? webkit : chromium;
const b = engine === chromium ? await chromium.launch({ channel: 'chrome' }) : await webkit.launch();
const ctx = await b.newContext(engine === chromium ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { ...devices['iPhone 14'] });
const p = await ctx.newPage();
await p.route('**/*sanity.io/**', (r) => r.abort('failed'));
await p.goto('http://localhost:5173/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
const H = await p.evaluate(() => innerHeight);
const max = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255); };
const probe = async () => {
  const png = await p.screenshot({ clip: { x: 0, y: 0, width: 390, height: 4 } });
  return p.evaluate(async (b64) => { const i = new Image(); i.src = 'data:image/png;base64,' + b64; await i.decode(); const c = new OffscreenCanvas(i.width, i.height); const x = c.getContext('2d'); x.drawImage(i, 0, 0); const d = x.getImageData(0, 1, i.width, 1).data; let r = 0, g = 0, bl = 0, n = 0; for (let k = 0; k < d.length; k += 4) { r += d[k]; g += d[k + 1]; bl += d[k + 2]; n++; } const hx = (v) => Math.round(v / n).toString(16).padStart(2, '0'); return { top: '#' + hx(r) + hx(g) + hx(bl), meta: document.querySelector('meta[name=theme-color]').content, chapter: document.documentElement.dataset.chapter, y: Math.round(scrollY) }; }, png.toString('base64'));
};
const step = Math.round(H / 5);
const bad = [];
const walk = async (from, to, dir) => {
  for (let y = from; dir > 0 ? y <= to : y >= to; y += dir * step) {
    await p.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, y);
    await p.waitForTimeout(350);
    const s = await probe();
    // a mismatch: the page's top edge and the chrome on opposite sides of mid-grey (by a clear margin)
    const a = lum(s.top), m = lum(s.meta);
    if ((a > 150 && m < 60) || (a < 60 && m > 150)) bad.push(`${dir > 0 ? '↓' : '↑'} y ${s.y} (${s.chapter}) page ${s.top} chrome ${s.meta}`);
  }
};
await walk(0, max, 1);
await walk(max, 0, -1);
console.log(`${process.argv[2] ?? 'chromium'}: ${bad.length} mismatches`); for (const l of bad) console.log('  ' + l);
await b.close();
