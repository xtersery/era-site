// Proof of the assisted scroll: one intentional gesture plays the passage,
// the page holds during playback, repeated input cannot break it, the page
// is released at the end, and scrolling up at the end plays it home.
import { chromium } from '@playwright/test';
const base = 'http://localhost:5173/spikes/mineral/';
const b = await chromium.launch({ channel: 'chrome' });
const log = (...a) => console.log(...a);
const st = (p) => p.evaluate(() => ({ ...window.__transition, y: Math.round(scrollY) }));
const fmt = (s) => `${s.status} · t ${s.progress.toFixed(2)} · locked ${s.locked} · y ${s.y}`;

for (const [label, vp, mobile] of [['desktop', { width: 1440, height: 900 }, false], ['phone', { width: 390, height: 844 }, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile });
  const p = await ctx.newPage();
  await p.goto(base + '?hud=0', { waitUntil: 'networkidle' });
  await p.waitForTimeout(2500);
  log(`${label} · at rest → ${fmt(await st(p))}`);
  // noise below the threshold
  if (!mobile) {
    await p.mouse.move(700, 450);
    await p.mouse.wheel(0, 8);
    await p.waitForTimeout(300);
    log(`${label} · wheel 8 px (noise) → ${fmt(await st(p))}`);
  }
  // one intentional gesture
  const t0 = Date.now();
  if (mobile) {
    await p.touchscreen.tap(200, 400); // focus
    await p.evaluate(() => { const e1 = new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: document.body, clientX: 200, clientY: 500 })], bubbles: true, cancelable: true }); window.dispatchEvent(e1); const e2 = new TouchEvent('touchmove', { touches: [new Touch({ identifier: 1, target: document.body, clientX: 200, clientY: 440 })], bubbles: true, cancelable: true }); window.dispatchEvent(e2); });
  } else {
    await p.mouse.wheel(0, 120);
  }
  await p.waitForTimeout(120);
  const s1 = await st(p);
  log(`${label} · one gesture → ${fmt(s1)}`);
  // hammering during playback
  for (let i = 0; i < 12; i++) { await p.mouse.wheel(0, 300); await p.waitForTimeout(60); }
  const s2 = await st(p);
  log(`${label} · 12 more wheels during playback → ${fmt(s2)}`);
  await p.mouse.wheel(0, -300);
  await p.waitForTimeout(80);
  const s3 = await st(p);
  log(`${label} · a wheel up during playback → ${fmt(s3)} (still forward: ${s3.direction === 1})`);
  // the rhythm: t sampled every half second
  const samples = [];
  let done = null, released = null;
  for (let i = 0; i < 260; i++) {
    await p.waitForTimeout(50);
    const s = await st(p); const ms = Date.now() - t0;
    if (samples.length === 0 || ms - samples[samples.length - 1].ms >= 480) samples.push({ ms, t: s.progress });
    if (done === null && s.progress >= 0.999) done = ms;
    if (s.status !== 'playing' && s.status !== 'completed' && done !== null) { released = ms; break; }
  }
  log(`${label} · rhythm: ${samples.map((x) => `${(x.ms / 1000).toFixed(1)}s→${x.t.toFixed(2)}`).join(' · ')}`);
  log(`${label} · t reached 1 after ≈ ${done} ms · released after ≈ ${released} ms (the held frame) → ${fmt(await st(p))}`);
  // the page is free: a wheel moves on
  if (mobile) { await p.evaluate(() => window.scrollBy(0, 400)); } else { await p.mouse.wheel(0, 400); }
  await p.waitForTimeout(500);
  log(`${label} · scroll after release → ${fmt(await st(p))}`);
  // back to the top and up: the passage plays home
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(300);
  log(`${label} · back at the top → ${fmt(await st(p))}`);
  if (mobile) {
    await p.evaluate(() => { const mk = (type, y) => new TouchEvent(type, { touches: [new Touch({ identifier: 2, target: document.body, clientX: 200, clientY: y })], bubbles: true, cancelable: true }); window.dispatchEvent(mk('touchstart', 400)); window.dispatchEvent(mk('touchmove', 470)); });
  } else { await p.mouse.wheel(0, -120); }
  await p.waitForTimeout(200);
  log(`${label} · gesture up at the end → ${fmt(await st(p))}`);
  for (let i = 0; i < 80; i++) { await p.waitForTimeout(100); const s = await st(p); if (s.status === 'released' || s.status === 'armed') break; }
  log(`${label} · home → ${fmt(await st(p))}`);
  await ctx.close();
}
await b.close();
