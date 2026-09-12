/**
 * Spike B capture suite. Dev server up, then: node e2e/spike-wheel.capture.mjs
 * Writes to spikes/wheel/__captures__/.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'spikes/wheel/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/wheel/';
const browser = await chromium.launch({ channel: 'chrome' });
const results = { desktop: {}, phone: {}, css: {}, latency: {} };

const ready = async (page, css = false) => {
  await page.waitForFunction((c) => (c ? true : window.__spike?.ready === true), css, { timeout: 20000 });
  await page.waitForTimeout(800);
};

const writeStrip = async (page, buffers, cols, file, labels) => {
  const data = await page.evaluate(async ({ srcs, cols, labels }) => {
    const imgs = await Promise.all(srcs.map((s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; })));
    const w = imgs[0].naturalWidth, h = imgs[0].naturalHeight, gap = 8, lab = 28;
    const rows = Math.ceil(imgs.length / cols);
    const c = document.createElement('canvas'); c.width = cols * (w + gap) + gap; c.height = rows * (h + lab + gap) + gap;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#08140f'; ctx.fillRect(0, 0, c.width, c.height);
    imgs.forEach((img, i) => { const x = gap + (i % cols) * (w + gap), y = gap + Math.floor(i / cols) * (h + lab + gap); ctx.drawImage(img, x, y); ctx.fillStyle = '#98a39c'; ctx.font = '13px JetBrains Mono, monospace'; ctx.fillText(labels[i] ?? '', x, y + h + 19); });
    return c.toDataURL('image/png');
  }, { srcs: buffers.map((b) => 'data:image/png;base64,' + b.toString('base64')), cols, labels });
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
};

const measureFps = async (page, seconds, drive) => {
  const start = page.evaluate((secs) => new Promise((resolve) => {
    const frames = []; let last = performance.now(); const t0 = last;
    const tick = (now) => { frames.push(now - last); last = now; if (now - t0 < secs * 1000) requestAnimationFrame(tick); else resolve(frames); };
    requestAnimationFrame(tick);
  }), seconds);
  await drive();
  const frames = await start;
  const fps = frames.slice(5).map((dt) => 1000 / dt).sort((a, b) => a - b);
  const q = (p) => Math.round(fps[Math.floor(fps.length * p)] ?? 0);
  return { median: q(0.5), p10: q(0.1), p90: q(0.9) };
};

const objectClip = { x: 560, y: 380, width: 880, height: 520 };

// ---------- desktop: two framings, sequences, metrics
for (const cam of ['top', 'eye']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.goto(`${base}?cam=${cam}&hud=0&dpr=1.5&tier=high`);
  await ready(page);
  await page.screenshot({ path: `${OUT}/still-${cam}.png` });
  await page.screenshot({ path: `${OUT}/object-${cam}.png`, clip: objectClip });

  if (cam === 'eye') {
    const grip = await page.locator('.wheel-anchor').boundingBox();
    const tab = (n) => page.locator('[role="tab"]').nth(n);

    // hover pre-turn: rest → hover 02.3 (200 ms, 550 ms) → leave (500 ms)
    const hov = [];
    hov.push(await page.screenshot({ clip: objectClip }));
    await tab(2).hover(); await page.waitForTimeout(200); hov.push(await page.screenshot({ clip: objectClip }));
    await page.waitForTimeout(400); hov.push(await page.screenshot({ clip: objectClip }));
    await page.mouse.move(300, 120); await page.waitForTimeout(550); hov.push(await page.screenshot({ clip: objectClip }));
    await writeStrip(page, hov, 4, `${OUT}/seq-hover.png`, ['rest · 02.1 active', 'hover 02.3 · +200 ms (pre-turn)', 'hover 02.3 · +600 ms (held)', 'leave · +550 ms (returns)']);

    // click full turn: 02.1 → 02.4, frames across ~1.3 s; measure selection latency
    const clk = [];
    await tab(3).click({ force: true });
    for (const t of [0, 120, 300, 550, 850, 1300]) { await page.waitForTimeout(t === 0 ? 30 : t - [0, 120, 300, 550, 850, 1300][[0, 120, 300, 550, 850, 1300].indexOf(t) - 1]); clk.push(await page.screenshot({ clip: objectClip })); }
    await writeStrip(page, clk, 6, `${OUT}/seq-click.png`, ['click 02.4 · +30 ms', '+120 ms', '+300 ms', '+550 ms', '+850 ms', '+1300 ms · settled']);
    results.latency.select = await page.evaluate(() => window.__spike.latency());

    // drag + inertia + settle: from 02.4 drag left ~320 px in 8 frames, release, settle frames
    const drg = [];
    const gx = grip.x + grip.width * 0.6, gy = grip.y + grip.height * 0.5;
    await page.mouse.move(gx, gy); await page.mouse.down();
    for (let i = 1; i <= 8; i++) { await page.mouse.move(gx - i * 40, gy, { steps: 2 }); await page.waitForTimeout(24); if (i % 2 === 0) drg.push(await page.screenshot({ clip: objectClip })); }
    await page.mouse.up();
    for (const t of [80, 250, 500, 900]) { await page.waitForTimeout(t === 80 ? 80 : t - [80, 250, 500, 900][[80, 250, 500, 900].indexOf(t) - 1]); drg.push(await page.screenshot({ clip: objectClip })); }
    await writeStrip(page, drg, 4, `${OUT}/seq-drag.png`, ['drag −80 px', 'drag −160 px', 'drag −240 px', 'drag −320 px · release', 'throw +80 ms', '+250 ms', '+500 ms', '+900 ms · settled']);
    results.latency.drag = await page.evaluate(() => window.__spike.latency());
    results.latency.activeAfterDrag = await page.evaluate(() => window.__spike.active);

    // active vs neighbour close-up (front block and the next one)
    await tab(1).click({ force: true }); await page.waitForTimeout(1400);
    await page.screenshot({ path: `${OUT}/closeup-active-neighbour.png`, clip: { x: 1000, y: 420, width: 440, height: 440 } });

    // book-match / vein variants (object crop)
    const variants = [];
    for (const [label, qs] of [['book-match on · vein on', ''], ['book-match off', '&bm=0'], ['vein off', '&vein=0']]) {
      await page.goto(`${base}?cam=eye&hud=0&dpr=1.5&tier=high${qs}`); await ready(page);
      variants.push(await page.screenshot({ clip: { x: 1000, y: 420, width: 440, height: 440 } }));
      void label;
    }
    await writeStrip(page, variants, 3, `${OUT}/variants-bookmatch-vein.png`, ['book-match on · vein on', 'book-match off', 'vein off']);
    await page.goto(`${base}?cam=eye&hud=0&dpr=1.5&tier=high`); await ready(page);
  }

  // metrics
  const fpsIdle = await measureFps(page, 2, async () => page.waitForTimeout(2000));
  const grip = await page.locator('.wheel-anchor').boundingBox();
  const fpsDrag = await measureFps(page, 3, async () => {
    const gx = grip.x + grip.width * 0.5, gy = grip.y + grip.height * 0.5;
    for (let r = 0; r < 2; r++) { await page.mouse.move(gx + 120, gy); await page.mouse.down(); for (let i = 1; i <= 12; i++) { await page.mouse.move(gx + 120 - i * 20, gy); await page.waitForTimeout(40); } await page.mouse.up(); await page.waitForTimeout(700); }
  });
  const info = await page.evaluate(() => window.__spike.info());
  const heap = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
  results.desktop[cam] = { fpsIdle, fpsDrag, info, heapMB: heap };
  await ctx.close();
}

// ---------- resize stability (eye): 1440 → 1280 → 768 → 390
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}?cam=eye&hud=0&dpr=1&tier=high`); await ready(page);
  const shots = [];
  for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [768, 1024]]) { await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(700); shots.push(await page.screenshot()); }
  const data = await page.evaluate(async ({ srcs, labels }) => {
    const imgs = await Promise.all(srcs.map((s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; })));
    const H = 420, gap = 8; const ws = imgs.map((i) => Math.round(i.naturalWidth * (H / i.naturalHeight)));
    const c = document.createElement('canvas'); c.width = ws.reduce((a, b) => a + b + gap, gap); c.height = H + 36;
    const x2 = c.getContext('2d'); x2.fillStyle = '#08140f'; x2.fillRect(0, 0, c.width, c.height);
    let x = gap; imgs.forEach((img, i) => { x2.drawImage(img, x, gap, ws[i], H); x2.fillStyle = '#98a39c'; x2.font = '12px JetBrains Mono, monospace'; x2.fillText(labels[i], x, H + 26); x += ws[i] + gap; });
    return c.toDataURL('image/png');
  }, { srcs: shots.map((b) => 'data:image/png;base64,' + b.toString('base64')), labels: ['1440 × 900', '1280 × 800', '1024 × 768', '768 × 1024 (accordion breakpoint)'] });
  writeFileSync(`${OUT}/resize-stability.png`, Buffer.from(data.split(',')[1], 'base64'));
  await ctx.close();
}

// ---------- phone: option A (cropped arc) and B (depth stack), swipe strip on A
for (const cam of ['arc', 'stack']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(`${base}?cam=${cam}&hud=0&dpr=1.25&tier=mid`); await ready(page);
  await page.locator('.wheel-anchor').scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/phone-${cam}.png` });
  const gb = await page.locator('.wheel-anchor').boundingBox();
  const grip = { x: gb.x, y: Math.max(0, gb.y), width: gb.width, height: Math.min(gb.height, 844 - Math.max(0, gb.y)) };
  const fpsIdle = await measureFps(page, 2, async () => page.waitForTimeout(2000));
  // swipe strip
  const frames = [await page.screenshot({ clip: { x: 0, y: grip.y, width: 390, height: grip.height } })];
  const gx = grip.x + grip.width * 0.7, gy = grip.y + grip.height * 0.5;
  await page.mouse.move(gx, gy); await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(gx - i * 30, gy); await page.waitForTimeout(30); if (i % 3 === 0) frames.push(await page.screenshot({ clip: { x: 0, y: grip.y, width: 390, height: grip.height } })); }
  await page.mouse.up();
  for (const t of [200, 700]) { await page.waitForTimeout(t === 200 ? 200 : 500); frames.push(await page.screenshot({ clip: { x: 0, y: grip.y, width: 390, height: grip.height } })); }
  await writeStrip(page, frames, 5, `${OUT}/phone-${cam}-swipe.png`, ['rest', 'swipe −90 px', 'swipe −180 px · release', '+200 ms', '+700 ms · settled']);
  const info = await page.evaluate(() => window.__spike.info());
  results.phone[cam] = { fpsIdle, info, cpuThrottle: '4x (CPU only)' };
  await ctx.close();
}

// ---------- CSS 3D fallback (no WebGL)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.goto(`${base}?css=1&hud=0`); await ready(page, true);
  await page.screenshot({ path: `${OUT}/fallback-css.png` });
  await page.screenshot({ path: `${OUT}/object-css.png`, clip: objectClip });
  const grip = await page.locator('.wheel-anchor').boundingBox();
  const fpsDrag = await measureFps(page, 3, async () => {
    const gx = grip.x + grip.width * 0.5, gy = grip.y + grip.height * 0.5;
    await page.mouse.move(gx + 120, gy); await page.mouse.down(); for (let i = 1; i <= 12; i++) { await page.mouse.move(gx + 120 - i * 20, gy); await page.waitForTimeout(40); } await page.mouse.up(); await page.waitForTimeout(900);
  });
  results.css = { fpsDrag };
  await ctx.close();
}

writeFileSync(`${OUT}/metrics.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 1));
await browser.close();
