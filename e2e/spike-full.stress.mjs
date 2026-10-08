// The stress test: Hero → Манифест and back, five times, then the whole page
// down and up once. Per cycle: FPS and the worst frame, ScrollTrigger count,
// canvas count, window listener count, JS heap, the gateway's lock released.
//   BASE=http://localhost:5173/spikes/full/ node e2e/spike-full.stress.mjs [cycles]
import { chromium } from '@playwright/test';

const base = process.env['BASE'] ?? 'http://localhost:5173/spikes/full/';
const cycles = Number(process.argv[2] ?? 5);
const width = 1440, height = 900;
const browser = await chromium.launch({ channel: 'chrome', args: ['--js-flags=--expose-gc'] });
const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, locale: 'ru-RU' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('sanity')) errors.push(m.text()); });
let failures = 0;
const check = (ok, label) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failures += 1; };

await page.addInitScript(() => {
  // window listener accounting (add/remove pairs by type)
  const counts = new Map();
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) { if (this === window || this === document) counts.set(type, (counts.get(type) || 0) + 1); return add.call(this, type, fn, opts); };
  EventTarget.prototype.removeEventListener = function (type, fn, opts) { if (this === window || this === document) counts.set(type, (counts.get(type) || 0) - 1); return remove.call(this, type, fn, opts); };
  window.__listeners = () => [...counts.entries()].filter(([, n]) => n > 0).reduce((a, [, n]) => a + n, 0);
  const frames = []; let last = performance.now();
  const tick = (now) => { frames.push(now - last); last = now; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
  window.__frames = frames; window.__framesReset = () => { frames.length = 0; last = performance.now(); };
});
await page.goto(base, { waitUntil: 'load', timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3000);
await page.mouse.move(width * 0.5, height * 0.5);

const sample = () => page.evaluate(() => {
  const f = window.__frames.slice(); window.__framesReset();
  const sorted = [...f].sort((a, b) => a - b);
  window.gc?.();
  return {
    fps: f.length ? +(1000 / (f.reduce((a, b) => a + b, 0) / f.length)).toFixed(1) : 0,
    p50: +(sorted[Math.floor(sorted.length / 2)] ?? 0).toFixed(1),
    max: +(sorted[sorted.length - 1] ?? 0).toFixed(0),
    over100: f.filter((x) => x > 100).length,
    st: window.__ST.getAll().length,
    canvases: document.querySelectorAll('canvas').length,
    listeners: window.__listeners(),
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    t: window.__transition ? { status: window.__transition.status, locked: window.__transition.locked, p: +window.__transition.progress.toFixed(2) } : null,
    y: Math.round(scrollY),
    lenisStopped: !!window.__lenis?.isStopped,
    lockedClass: document.documentElement.classList.contains('is-scroll-locked'),
  };
});

const first = await sample();
console.log(`\n== stress ${cycles}× Hero ⇄ Манифест (1440×900, DPR 2) — start: ST ${first.st}, canvases ${first.canvases}, listeners ${first.listeners}, heap ${first.heap} MB`);
const rows = [];
for (let i = 1; i <= cycles; i++) {
  await page.evaluate(() => window.__framesReset());
  await page.mouse.wheel(0, 120);
  await page.waitForTimeout(7300);
  const fwd = await sample();
  await page.mouse.wheel(0, -120);
  await page.waitForTimeout(6600);
  const back = await sample();
  rows.push({ cycle: i, 'fwd fps': fwd.fps, 'fwd max ms': fwd.max, 'fwd >100': fwd.over100, 'back fps': back.fps, 'back max ms': back.max, 'back >100': back.over100, ST: back.st, canvas: back.canvases, listeners: back.listeners, 'heap MB': back.heap, landed: `${fwd.t?.status}@${fwd.t?.p} y${fwd.y}`, home: `${back.t?.status}@${back.t?.p} y${back.y}`, lock: back.t?.locked || back.lenisStopped || back.lockedClass ? 'HELD' : 'free' });
  check(fwd.t?.p === 1 && fwd.y === height && !fwd.t.locked, `cycle ${i}: landed at the manifesto, lock released`);
  check(back.t?.p === 0 && back.y === 0 && !back.t.locked && !back.lenisStopped, `cycle ${i}: home at the hero, lock released`);
  check(fwd.over100 === 0 && back.over100 === 0, `cycle ${i}: no frame over 100 ms (fwd max ${fwd.max}, back max ${back.max})`);
}
console.table(rows);
const last = rows[rows.length - 1];
check(last.ST === first.st, `ScrollTrigger count stable: ${first.st} → ${last.ST}`);
check(last.canvas === first.canvases, `canvas count stable: ${first.canvases} → ${last.canvas}`);
check(last.listeners <= first.listeners + 2, `window/document listener count stable: ${first.listeners} → ${last.listeners}`);
check(rows[cycles - 1]['fwd fps'] >= rows[0]['fwd fps'] - 5, `FPS does not degrade: ${rows[0]['fwd fps']} → ${rows[cycles - 1]['fwd fps']}`);
check(last['heap MB'] === null || last['heap MB'] <= first.heap + 40, `heap does not run away: ${first.heap} → ${last['heap MB']} MB`);

// the whole site, down and up once: the film, then the page through the
// scroller in short eased steps (the pinned rooms snap; a wheel storm would
// fight them), then the way back up to the manifesto's rest and the film home
await page.mouse.wheel(0, 120);
await page.waitForTimeout(7300);
await page.evaluate(() => window.__framesReset());
const docH = await page.evaluate(() => document.documentElement.scrollHeight);
const walk = async (from, to) => {
  const step = to > from ? 700 : -700;
  for (let y = from; step > 0 ? y < to : y > to; y += step) {
    await page.evaluate((y) => window.__lenis.scrollTo(y, { duration: 0.35 }), Math.max(0, Math.min(to, y + step)));
    await page.waitForTimeout(140);
  }
};
await walk(height, (await page.evaluate(() => document.documentElement.scrollHeight)) - height);
await page.waitForTimeout(2500);
const down = await sample();
// up to the start of Услуги (the pinned rooms' snaps settle), then onto the
// manifesto's rest as the flow's own proof does, and one wheel up plays the film home
await walk(down.y, height * 2);
await page.waitForTimeout(2500);
await page.evaluate((h) => { window.__lenis?.scrollTo(h, { immediate: true, force: true }); scrollTo({ top: h, behavior: 'instant' }); }, height);
await page.waitForTimeout(800);
await page.mouse.wheel(0, -120);
await page.waitForTimeout(6600);
const up = await sample();
console.log(`\n== the whole page: down — fps ${down.fps}, max ${down.max} ms, >100 ms ×${down.over100}, y ${down.y} · up — fps ${up.fps}, max ${up.max} ms, >100 ms ×${up.over100}, y ${up.y}`);
const docH2 = await page.evaluate(() => document.documentElement.scrollHeight);
check(down.y >= docH2 - height - 5, `reached the end of the page (y ${down.y} of ${docH2 - height})`);
check(up.y === 0 && up.t?.p === 0, `back home through the film (y ${up.y}, t ${up.t?.p})`);
check(up.st === first.st && up.canvases === first.canvases, `after the traversal: ST ${up.st}, canvases ${up.canvases}`);
check(!up.lenisStopped && !up.lockedClass && !(up.t?.locked), 'the page is not locked after the traversal');
check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
