/**
 * Spike A capture suite. Run with the dev server up:
 *   node e2e/spike-hero.capture.mjs
 * Writes stills, videos, comparison, diagnostics and metrics to spikes/hero/__captures__/.
 */
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'spikes/hero/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/hero/';
const browser = await chromium.launch({ channel: 'chrome' });

const waitReady = async (page) => {
  await page.waitForFunction(() => window.__spike?.ready === true, null, { timeout: 20000 });
  await page.waitForTimeout(900);
};

const rgbToHsl = ([r, g, b]) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b); const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min; const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
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
  return { median: q(0.5), p10: q(0.1), p90: q(0.9), samples: fps.length };
};

const drivePointer = async (page, w, h, seconds) => {
  const steps = Math.round(seconds * 30);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    await page.mouse.move(w * (0.45 + 0.28 * Math.cos(a)), h * (0.55 + 0.25 * Math.sin(a)));
    await page.waitForTimeout(1000 / 30);
  }
};

const driveTouch = async (page, w, h, seconds) => {
  const steps = Math.round(seconds * 30);
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    await page.touchscreen.tap(w * (0.5 + 0.2 * Math.cos(a)), h * (0.3 + 0.12 * Math.sin(a)));
    await page.waitForTimeout(1000 / 30);
  }
};

const results = { portrait: null, desktop: {}, mobile: {}, diag: {} };

/** Composite PNG buffers into a labelled grid with a canvas in the page. */
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

// ---------- desktop stills, video, metrics
for (const path of ['A', 'B', 'C']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, });
  const page = await ctx.newPage();
  await page.goto(`${base}?path=${path}&tier=high&dpr=1.5&hud=0`);
  await waitReady(page);
  await page.mouse.move(700, 400);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/still-desktop-${path}.png` });
  const fpsIdle = await measureFps(page, 2, async () => page.waitForTimeout(2000));
  const fpsPointer = await measureFps(page, 4, () => drivePointer(page, 1440, 900, 4));
  // scroll dolly
  const fpsScroll = await measureFps(page, 3, async () => { for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 40); await page.waitForTimeout(100); } });
  const info = await page.evaluate(() => window.__spike.info());
  const mem = await page.evaluate(() => (performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null));
  results.desktop[path] = { fpsIdle, fpsPointer, fpsScroll, info, jsHeapMB: mem };
  results.portrait = await page.evaluate(() => window.__spike.portrait);
  if (path === 'A') {
    // Close-up: the same skin through the glass vs. beside it, at the same scale (lens edge at x≈630 css px).
    await page.mouse.wheel(0, -4000); await page.waitForTimeout(600);
    await page.mouse.move(700, 400); await page.waitForTimeout(500);
    const inside = await page.screenshot({ clip: { x: 430, y: 430, width: 190, height: 190 } });
    const outside = await page.screenshot({ clip: { x: 640, y: 430, width: 190, height: 190 } });
    await writeStrip(page, [inside, outside], 2, `${OUT}/closeup-skin-A.png`, ['through the glass', 'outside the glass · same scale']);
    await page.screenshot({ path: `${OUT}/still-desktop-A-scrolled.png` });
    // Interaction strip: 6 pointer positions at rest scroll, then 3 scroll positions.
    await page.mouse.wheel(0, -4000); await page.waitForTimeout(600);
    const frames = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      await page.mouse.move(1440 * (0.45 + 0.28 * Math.cos(a)), 900 * (0.55 + 0.25 * Math.sin(a)));
      await page.waitForTimeout(450);
      frames.push(await page.screenshot({ clip: { x: 120, y: 260, width: 640, height: 640 } }));
    }
    for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, 260); await page.waitForTimeout(500); frames.push(await page.screenshot({ clip: { x: 120, y: 260, width: 640, height: 640 } })); }
    await writeStrip(page, frames, 3, `${OUT}/interaction-desktop-A.png`, ['pointer ←', 'pointer ↖', 'pointer ↑', 'pointer ↗', 'pointer →', 'pointer ↘', 'scroll 1', 'scroll 2', 'scroll 3 · dolly']);
  }
  await page.close();
  await ctx.close();
}

// ---------- mobile stills, video, metrics (CPU throttled 4× as a proxy)
for (const path of ['A', 'C']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(`${base}?path=${path}&tier=mid&dpr=1.25&hud=0`);
  await waitReady(page);
  await page.screenshot({ path: `${OUT}/still-mobile-${path}.png` });
  const fpsIdle = await measureFps(page, 2, async () => page.waitForTimeout(2000));
  const fpsTouch = await measureFps(page, 4, () => driveTouch(page, 390, 844, 4));
  const fpsScroll = await measureFps(page, 3, async () => { for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, 30); await page.waitForTimeout(100); } });
  const info = await page.evaluate(() => window.__spike.info());
  results.mobile[path] = { fpsIdle, fpsTouch, fpsScroll, info, cpuThrottle: '4x (CPU only; GPU is the host Mac)' };
  if (path === 'C') {
    await page.mouse.wheel(0, -4000); await page.waitForTimeout(600);
    const frames = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      await page.touchscreen.tap(390 * (0.5 + 0.22 * Math.cos(a)), 844 * (0.3 + 0.12 * Math.sin(a)));
      await page.waitForTimeout(450);
      frames.push(await page.screenshot());
    }
    for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 300); await page.waitForTimeout(500); frames.push(await page.screenshot()); }
    await writeStrip(page, frames, 6, `${OUT}/interaction-mobile-C.png`, ['touch ←', 'touch ↑', 'touch →', 'touch ↓', 'scroll 1', 'scroll 2']);
  }
  await page.close();
  await ctx.close();
}

// ---------- reduced-motion poster (still at rest, no pointer), desktop + mobile
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(`${base}?path=A&tier=high&dpr=2&poster=1&hud=0`);
  await waitReady(page);
  await page.screenshot({ path: `${OUT}/poster-desktop.png` });
  await ctx.close();
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, reducedMotion: 'reduce' });
  const mp = await m.newPage();
  await mp.goto(`${base}?path=A&tier=high&dpr=2&poster=1&hud=0`);
  await waitReady(mp);
  await mp.screenshot({ path: `${OUT}/poster-mobile.png` });
  await m.close();
}

// ---------- side-by-side comparison
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  await page.goto(`${base}?mode=compare&tier=high&dpr=1.5&hud=0`);
  await waitReady(page);
  await page.screenshot({ path: `${OUT}/compare-ABC.png` });
  await ctx.close();
}

// ---------- same-composition A/B/C strip from the desktop stills (fair material comparison)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${base}?path=A&hud=0`);
  const srcs = ['A', 'B', 'C'].map((k) => 'data:image/png;base64,' + readFileSync(`${OUT}/still-desktop-${k}.png`).toString('base64'));
  const data = await page.evaluate(async ({ srcs }) => {
    const imgs = await Promise.all(srcs.map((s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; })));
    const sx = 180 * 1.5, sy = 380 * 1.5, sw = 820 * 1.5, sh = 560 * 1.5, gap = 12, lab = 40;
    const c = document.createElement('canvas'); c.width = 3 * sw + 4 * gap; c.height = sh + lab + 2 * gap;
    const x2 = c.getContext('2d'); x2.fillStyle = '#08140f'; x2.fillRect(0, 0, c.width, c.height);
    const labels = ['A · true transmission (drei MeshTransmissionMaterial, 6 samples, 1024)', 'B · hybrid (three physical transmission + dispersion + fresnel tint)', 'C · screen-space fake refraction (FBO, custom shader)'];
    imgs.forEach((img, i) => { const x = gap + i * (sw + gap); x2.drawImage(img, sx, sy, sw, sh, x, gap, sw, sh); x2.fillStyle = '#98a39c'; x2.font = '20px JetBrains Mono, monospace'; x2.fillText(labels[i], x, gap + sh + 28); });
    return c.toDataURL('image/png');
  }, { srcs });
  writeFileSync(`${OUT}/compare-ABC-same-composition.png`, Buffer.from(data.split(',')[1], 'base64'));
  await ctx.close();
}

// ---------- diagnostics: skin-tone contamination inside vs outside the glass
for (const path of ['A', 'B', 'C']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${base}?mode=diag&path=${path}&tier=high&dpr=1&poster=1&hud=0&veil=0`);
  await waitReady(page);
  await page.waitForTimeout(300);
  const rows = await page.evaluate(() => window.__spike.sample());
  results.diag[path] = rows.map(({ inside, outside }) => {
    const hi = rgbToHsl(inside), ho = rgbToHsl(outside);
    let dh = hi[0] - ho[0]; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
    return { inside, outside, hueShift: Math.round(dh * 10) / 10, satDelta: Math.round((hi[1] - ho[1]) * 100) / 100, lumRatio: Math.round((hi[2] / Math.max(ho[2], 1e-3)) * 100) / 100 };
  });
  await page.screenshot({ path: `${OUT}/diag-${path}.png` });
  await ctx.close();
}

writeFileSync(`${OUT}/metrics.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 1));
await browser.close();
