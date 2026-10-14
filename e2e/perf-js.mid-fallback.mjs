// The film becomes ready while a passage is playing without it: none of its
// frames may appear in that play (slow phone, gzip server). Prints each frame's
// mean luminance: after the cut to the manifesto's wall it must stay dark.
import { chromium } from '@playwright/test';

const base = process.env['BASE'] ?? 'http://localhost:4194/';
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (500 * 1024) / 8 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await page.goto(base, { waitUntil: 'commit' });
await page.waitForFunction(() => performance.getEntriesByType('resource').some((e) => /\/r3f-/.test(e.name)), null, { timeout: 120000 });
await page.waitForTimeout(1200);
const touch = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: 200, y }] });
await touch('touchStart', 600); for (let i = 1; i <= 10; i++) await touch('touchMove', 600 - 22 * i); await touch('touchEnd', 380);
const rows = [];
for (let i = 0; i < 30; i++) {
  const buf = await page.screenshot();
  rows.push(await page.evaluate(async (b64) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = new OffscreenCanvas(im.width, im.height); const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, im.width, im.height).data; let s = 0; for (let k = 0; k < d.length; k += 16) s += (d[k] + d[k + 1] + d[k + 2]) / 3;
    const p = document.querySelector('.hs__passage');
    return { lum: Math.round(s / (d.length / 16)), mode: p?.getAttribute('data-film-mode') ?? 'held', ready: !!p?.hasAttribute('data-film-ready'), y: Math.round(scrollY) };
  }, buf.toString('base64')));
  await page.waitForTimeout(120);
}
const cut = rows.findIndex((r) => r.lum < 90);
const ready = rows.findIndex((r) => r.ready);
console.log(rows.map((r, i) => `${i}:${r.mode[0]}${r.ready ? 'R' : ''}/${r.lum}`).join(' '));
console.log(`cut to the wall at frame ${cut}; film ready at frame ${ready} (${ready > cut ? 'during the fallback play' : 'before it'}); a bright frame after the cut: ${rows.slice(cut).some((r) => r.lum > 120)}; final y ${rows.at(-1).y}`);
await b.close();
