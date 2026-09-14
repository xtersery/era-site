// Transition quality: per-frame continuity of the open and return travel — no jumps, no collisions.
import { chromium } from '@playwright/test';
const base = 'http://localhost:5173/spikes/gallery/';
const browser = await chromium.launch({ channel: 'chrome' });
const report = {};
async function run(label, viewport, opts = {}) {
  const ctx = await browser.newContext({ viewport, ...opts });
  const page = await ctx.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const top = await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y + 2 * window.innerHeight, behavior: 'instant' }), top);
  await page.waitForTimeout(900);
  // record every frame: unfold, the docked sheet's box (from the grips' boxes while on the rail, the focus box once open)
  const record = (ms) => page.evaluate((ms) => new Promise((res) => {
    const s = window.__ribbon; const out = []; let last = performance.now(); const t0 = last;
    const k = s.focus ?? Math.round(s.pos);
    const tick = (now) => {
      const b = s.focusBox ?? s.boxes[k] ?? null;
      out.push({ t: +(now - t0).toFixed(0), dt: +(now - last).toFixed(1), u: +s.unfold.toFixed(3), x: b ? +b.x.toFixed(0) : null, y: b ? +b.y.toFixed(0) : null, w: b ? +b.w.toFixed(0) : null });
      last = now;
      if (now - t0 < ms) requestAnimationFrame(tick); else res(out);
    };
    requestAnimationFrame(tick);
  }), ms);
  const analyse = (frames) => {
    const du = frames.slice(1).map((f, i) => Math.abs(f.u - frames[i].u));
    const dw = frames.slice(1).map((f, i) => (f.w !== null && frames[i].w !== null ? Math.abs(f.w - frames[i].w) : 0));
    const dx = frames.slice(1).map((f, i) => (f.x !== null && frames[i].x !== null ? Math.hypot(f.x - frames[i].x, f.y - frames[i].y) : 0));
    const mono = frames.every((f, i) => i === 0 || f.u >= frames[i - 1].u - 1e-6) || frames.every((f, i) => i === 0 || f.u <= frames[i - 1].u + 1e-6);
    return { frames: frames.length, maxDuPerFrame: +Math.max(...du).toFixed(3), maxWidthStepPx: Math.max(...dw), maxMovePx: +Math.max(...dx).toFixed(0), monotonic: mono, p95dt: [...frames.map((f) => f.dt)].sort((a, b) => a - b)[Math.floor(frames.length * 0.95)] };
  };
  // open
  const openP = record(1700);
  await page.waitForTimeout(60);
  if (opts.isMobile) await page.tap('.grip[data-near]', { force: true }); else await page.click('.grip[data-near]', { force: true });
  const openFrames = await openP;
  // return
  const closeP = record(1500);
  await page.waitForTimeout(60);
  await page.click('.sheetinfo__back');
  const closeFrames = await closeP;
  await ctx.close();
  return { open: analyse(openFrames.filter((f) => f.u > 0 && f.u < 1)), close: analyse(closeFrames.filter((f) => f.u > 0 && f.u < 1)) };
}
report.desktop = await run('desktop', { width: 1440, height: 900 });
report.phone = await run('phone', { width: 390, height: 844 }, { deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await browser.close();
console.log(JSON.stringify(report, null, 2));
