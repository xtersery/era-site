// Услуги → Кейсы in the flow spike: does the pinned Услуги hand over to Кейсы
// as one page, and does Стоимость stay out of the scroll but one click away?
// Measures: the scroller is the project's (Lenis on live tiers, one instance,
// ScrollTrigger following it; native under reduced motion); the sections are
// flush; the blend spans the whole 100 vh window, its seam tone is monotone
// and the meeting line carries one tone on both sides at every position; the
// two pins are strictly sequential; the snap does not pull back past the
// release; real wheel input is monotone down and up and going back up
// re-enters the pin; the price layer opens from the header and from the
// state's own link, never moves the page, and closes by button / Esc / Back /
// its own link out. Writes stills to spikes/flow/__captures__/. Dev server
// must be up.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env['BASE'] ?? 'http://localhost:5173/spikes/flow/';
const OUT = 'spikes/flow/__captures__';
mkdirSync(OUT, { recursive: true });

// GPU=1 renders the scenes on the GPU (Metal) instead of the default software path — the same
// checks, faster and steadier when the machine is busy
const browser = await chromium.launch({ channel: 'chrome', ...(process.env['GPU'] ? { args: ['--use-angle=metal', '--ignore-gpu-blocklist'] } : {}) });
let failures = 0;
const check = (ok, label) => {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures += 1;
};

/** the document geometry of the two pinned sections */
const survey = (page) =>
  page.evaluate(() => {
    const abs = (el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top + scrollY, bottom: r.bottom + scrollY };
    };
    const sp = (el) => el.closest('.pin-spacer') ?? el;
    const svc = document.querySelector('#services');
    const cases = document.querySelector('#cases');
    const sitting = document.querySelector('#specialists');
    return {
      services: abs(sp(svc)),
      cases: abs(sp(cases)),
      sitting: abs(sp(sitting)),
      bgBody: getComputedStyle(document.body).backgroundColor,
      bgServices: getComputedStyle(svc).backgroundColor,
      vh: innerHeight,
    };
  });

/** what the viewport holds right now */
const frame = (page) =>
  page.evaluate(() => {
    const vis = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      return Math.max(0, Math.min(innerHeight, r.bottom) - Math.max(0, r.top)) / innerHeight;
    };
    // the blends' values live on the elements that paint them (never on the page root)
    const v = (sel, name) => getComputedStyle(document.querySelector(sel)).getPropertyValue(name);
    const ATM = '.flowpage .radial__exit', TOP = '.flow-cases > .flow-veil:not([class*="flow-veil--"])', FOOT = '.flow-veil--foot', HEAD = '.flow-veil--head';
    const pinned = window.__ST.getAll().filter((t) => t.pin && t.isActive).map((t) => t.trigger.id);
    return {
      services: +vis('#services').toFixed(3),
      cases: +vis('#cases').toFixed(3),
      sitting: +vis('#specialists').toFixed(3),
      k: +(+v(ATM, '--seam-k')).toFixed(3),
      reach: v(ATM, '--a-reach').trim(),
      veil: +(+v(TOP, '--b-opacity')).toFixed(2),
      k2: +(+v(FOOT, '--seam2-k')).toFixed(3),
      foot: +(+v(FOOT, '--c-opacity')).toFixed(2),
      head: +(+v(HEAD, '--d-opacity')).toFixed(2),
      headH: +(+v(HEAD, '--d-height').replace('svh', '')).toFixed(1),
      calm: +(window.__flow?.calm.current ?? 0).toFixed(2),
      pinned,
      y: Math.round(scrollY),
    };
  });

/** the pixel just above and just below the meeting line, from a screenshot */
const seam = async (page, x, sel = '#cases') => {
  const y = await page.evaluate((sel) => Math.round(document.querySelector(sel).getBoundingClientRect().top), sel);
  if (y <= 1 || y >= page.viewportSize().height - 1) return null;
  const buf = await page.screenshot({ clip: { x, y: y - 2, width: 1, height: 4 } });
  // PNG decode without a dependency: read via a canvas in the page
  const px = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 4;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, 1, 4).data;
    return [0, 1, 2, 3].map((i) => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
  }, buf.toString('base64'));
  return { y, above: px[1], below: px[2] };
};
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** an instant programmatic scroll that Lenis (when present) agrees with */
const jump = (page, y) =>
  page.evaluate((y) => {
    window.__lenis?.scrollTo(y, { immediate: true, force: true });
    scrollTo({ top: y, behavior: 'instant' });
  }, y);

async function run({ width, height, reduced, mobile, touch = mobile, tag }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    locale: 'ru-RU',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 1 } : touch ? { hasTouch: true } : {}),
  });
  ctx.setDefaultTimeout(90000); // the full page's captures can wait on a busy compositor
  const page = await ctx.newPage();
  /** a finger on touch layouts, a mouse elsewhere — pointer capture in Услуги treats them differently */
  const press = (sel) => (touch ? page.tap(sel) : page.click(sel));
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && !m.text().includes('sanity.io') && !m.text().includes('ERR_FAILED') && errors.push(m.text()));
  if (process.env['TRACE']) {
    page.on('console', (m) => m.text().startsWith('[r]') && console.log('     ', m.text().slice(0, 200)));
    await page.addInitScript(() => {
      const iv = setInterval(() => {
        if (!window.__ST) return;
        clearInterval(iv);
        window.__ST.addEventListener('refresh', () => { const st = window.__ST.getAll().find((t) => t.pin && t.trigger?.id === 'services'); console.log('[r] refresh → services start', st ? Math.round(st.start) : '—', 'at y', Math.round(scrollY), 'stub h', document.querySelector('.flow-stub')?.getBoundingClientRect().height, 'spacer top', document.querySelector('.pin-spacer')?.getBoundingClientRect().top + scrollY, 'docH', document.documentElement.scrollHeight, performance.now() | 0); });
      }, 5);
    });
  }
  await page.goto(`${base}?hud=1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);

  const g = await survey(page);
  console.log(`\n== ${tag} (${width}x${height}${reduced ? ', reduced' : ''}${mobile ? ', touch' : ''}) ==`);
  check(Math.abs(g.cases.top - g.services.bottom) < 0.5, `sections flush: ${(g.cases.top - g.services.bottom).toFixed(1)}px between the pin-spacers`);
  check(g.bgBody === 'rgb(5, 13, 10)', `page ground is the Кейсы mineral (${g.bgBody})`);

  // --- the scroller: the project's, and ScrollTrigger follows it ---
  const sc = await page.evaluate(async () => {
    const kind = document.documentElement.dataset.scroll;
    const lenis = window.__lenis ?? null;
    const st = window.__ST.getAll().find((t) => t.pin && t.trigger?.id === 'services');
    const before = st.progress;
    // scroll only through Lenis (its own animation, no native scrollTo) and see
    // whether the pinned trigger's progress follows without a native scroll event
    if (lenis) {
      lenis.scrollTo(st.start + (st.end - st.start) * 0.5, { immediate: true, force: true });
      await new Promise((r) => setTimeout(r, 120));
    }
    const wrappers = document.querySelectorAll('.lenis-wrapper, .lenis-content, [data-scroll-container]').length;
    return { kind, hasLenis: !!lenis, followed: lenis ? Math.abs(st.progress - 0.5) < 0.05 : null, before, after: st.progress, wrappers, tickers: lenis ? 1 : 0 };
  });
  if (reduced) check(sc.kind === 'native' && !sc.hasLenis, `reduced motion: the native scroller (${sc.kind})`);
  else check(sc.kind === 'lenis' && sc.hasLenis, `scroller is the project's Lenis (${sc.kind}, one instance via ScrollProvider)`);
  if (!reduced) check(sc.followed === true, `ScrollTrigger follows Lenis: pinned Услуги progress ${sc.before.toFixed(2)} → ${sc.after.toFixed(2)} after a Lenis-only scroll to 0.5`);
  check(sc.wrappers === 0, 'no second smooth-scroll wrapper on the page');
  await jump(page, 0);
  await page.waitForTimeout(300);

  // --- the pins are strictly sequential ---
  const release = g.services.bottom - g.vh; // the Услуги pin's end
  const casesPin = g.cases.top; // the Кейсы pin's start
  check(casesPin - release >= g.vh - 1, `Услуги pin ends at ${Math.round(release)}, Кейсы pin starts at ${Math.round(casesPin)} — ${((casesPin - release) / g.vh).toFixed(2)} vh of unowned scroll between`);

  // --- the handover window, frame by frame ---
  console.log(` the window (release at y=${Math.round(release)}):`);
  const frames = [-0.2, 0, 0.1, 0.2, 0.3, 0.45, 0.6, 0.7, 0.8, 0.9, 1.0];
  let n = 0;
  let seamOk = true;
  let untouchedAtRest = true;
  let veilGone = true;
  const ks = [];
  for (const f of frames) {
    await jump(page, release + g.vh * f);
    await page.waitForTimeout(f <= 0 ? 1600 : 500); // let the snap settle at rest
    const s = await frame(page);
    const line = await seam(page, Math.round(width * 0.5));
    const step = line ? Math.abs(lum(line.above) - lum(line.below)) : null;
    if (line && step > 6) seamOk = false;
    if (f <= 0 && s.k > 0) untouchedAtRest = false;
    if (f >= 1 && s.veil > 0) veilGone = false;
    if (f >= 0) ks.push(s.k);
    console.log(
      `   +${String(f).padStart(5)}vh  услуги ${(s.services * 100).toFixed(0).padStart(3)}%  кейсы ${(s.cases * 100).toFixed(0).padStart(3)}%  tone ${s.k.toFixed(2)} reach ${s.reach.padStart(4)} veil ${s.veil}` +
        (line ? `  seam Δlum ${step.toFixed(1)} (${line.above.join(',')} | ${line.below.join(',')})` : ''),
    );
    if (!reduced) await page.screenshot({ path: `${OUT}/handoff-${tag}-${n}.png` });
    n += 1;
  }
  const monotone = ks.every((k, i) => i === 0 || k >= ks[i - 1]);
  const first = frames[ks.findIndex((k) => k > 0.02) + 1] ?? null; // frames[0] is the -0.2 sample
  const done = frames[ks.findIndex((k) => k >= 0.98) + 1] ?? null;
  check(untouchedAtRest, 'blend is inert while Услуги is pinned (seam tone = bone at and before release)');
  check(monotone && ks[0] === 0 && ks.at(-1) === 1, `seam tone is monotone bone → Кейсы across the window (${ks.map((k) => k.toFixed(2)).join(' ')})`);
  check(first !== null && done !== null && done - first >= 0.5, `the tonal shift is gradual: > 0.02 at +${first} vh, complete at +${done} vh — ${Math.round((done - first) * 100)} vh of change inside a 100 vh window`);
  check(seamOk, 'meeting line carries one tone on both sides through the window (Δ luminance ≤ 6)');
  check(veilGone, 'veil over Кейсы is gone when Кейсы pins');

  // --- does the snap fight the exit? stop just past the release and wait ---
  const exitY = release + 60;
  await jump(page, exitY);
  await page.waitForTimeout(2200);
  const afterExit = await page.evaluate(() => Math.round(scrollY));
  check(Math.abs(exitY - afterExit) < 2, `rest 60px past the release: asked ${Math.round(exitY)}, rests ${afterExit} (pull-back ${(exitY - afterExit).toFixed(0)}px)`);

  // --- real wheel input across the boundary, then back up ---
  if (!mobile) {
    await jump(page, release - 200);
    await page.mouse.move(width / 2, height / 2);
    await page.waitForTimeout(1600);
    const down = [];
    for (let i = 0; i < 14; i++) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(70);
      down.push(await page.evaluate(() => Math.round(scrollY)));
    }
    await page.waitForTimeout(2200);
    const monotoneDown = down.every((v, i) => i === 0 || v >= down[i - 1] - 1);
    check(monotoneDown, `wheel down across the boundary is monotone (${down[0]} → ${down.at(-1)})`);

    const up = [];
    for (let i = 0; i < 30; i++) {
      await page.mouse.wheel(0, -120);
      await page.waitForTimeout(70);
      up.push(await page.evaluate(() => Math.round(scrollY)));
    }
    await page.waitForTimeout(2200);
    const monotoneUp = up.every((v, i) => i === 0 || v <= up[i - 1] + 1);
    check(monotoneUp, `wheel up across the boundary is monotone (${up[0]} → ${up.at(-1)})`);
    const backInPin = await page.evaluate(() => Math.abs(document.querySelector('#services').getBoundingClientRect().top) < 2);
    const back = await frame(page);
    check(backInPin, 'scrolling back up re-enters the Услуги pin (section stuck to the top again)');
    check(back.k === 0, `blend reversed to nothing on the way back (seam tone ${back.k})`);
  }

  // ================= Кейсы → Специалисты =================
  const release2 = g.cases.bottom - g.vh;
  const sittingPin = g.sitting.top;
  console.log(` Кейсы → Специалисты (release at y=${Math.round(release2)}):`);
  check(Math.abs(g.sitting.top - g.cases.bottom) < 0.5, `sections flush: ${(g.sitting.top - g.cases.bottom).toFixed(1)}px between the pin-spacers`);
  check(sittingPin - release2 >= g.vh - 1, `Кейсы pin ends at ${Math.round(release2)}, Специалисты pin starts at ${Math.round(sittingPin)} — ${((sittingPin - release2) / g.vh).toFixed(2)} vh of unowned scroll between`);
  const amp = reduced ? 0 : width < 768 ? 0 : width < 1024 ? 0.5 : 1;
  let seam2Ok = true;
  let footOffWhilePinned = true;
  let headGone = true;
  let onePin = true;
  let calmMax = 0;
  const k2s = [];
  let portraitAt = null;
  for (const f of [-0.2, 0, 0.1, 0.2, 0.3, 0.45, 0.55, 0.65, 0.8, 0.9, 1.0]) {
    await jump(page, release2 + g.vh * f);
    await page.waitForTimeout(f <= 0 ? 1600 : 600);
    const s = await frame(page);
    // the line, sampled over the wall and over the portrait
    const l1 = await seam(page, Math.round(width * 0.2), '#specialists');
    const l2 = await seam(page, Math.round(width * 0.75), '#specialists');
    const steps = [l1, l2].filter(Boolean).map((l) => Math.abs(lum(l.above) - lum(l.below)));
    if (steps.some((d) => d > 6)) seam2Ok = false;
    if (f <= 0 && (s.foot > 0 || s.k2 > 0 || s.calm > 0)) footOffWhilePinned = false;
    if (f >= 1 && (s.head > 0 || s.headH > 0)) headGone = false;
    if (s.pinned.length > 1) onePin = false;
    if (f >= 0) k2s.push(s.k2);
    calmMax = Math.max(calmMax, s.calm);
    if (portraitAt === null && f > 0 && s.sitting >= 0.35 && s.k2 >= 0.3) portraitAt = f;
    console.log(
      `   +${String(f).padStart(5)}vh  кейсы ${(s.cases * 100).toFixed(0).padStart(3)}%  специалисты ${(s.sitting * 100).toFixed(0).padStart(3)}%  tone ${s.k2.toFixed(2)} calm ${s.calm.toFixed(2)} foot ${s.foot} head ${s.headH}svh pinned [${s.pinned}]` +
        (steps.length ? `  seam Δlum ${steps.map((d) => d.toFixed(1)).join('/')}` : ''),
    );
    if (!reduced) await page.screenshot({ path: `${OUT}/handoff2-${tag}-${n}.png` });
    n += 1;
  }
  const mono2 = k2s.every((k, i) => i === 0 || k >= k2s[i - 1]);
  check(footOffWhilePinned, 'blend is inert while Кейсы is pinned (foot veil off, tone = archive, depth uncompressed at and before release)');
  check(mono2 && k2s[0] === 0 && k2s.at(-1) === 1, `second seam tone is monotone archive → wall across the window (${k2s.map((k) => k.toFixed(2)).join(' ')})`);
  check(seam2Ok, 'meeting line carries one tone on both sides, over the wall and over the portrait (Δ luminance ≤ 6)');
  check(Math.abs(calmMax - amp) < 0.05, `depth compression reaches ${calmMax.toFixed(2)} (expected ${amp} for this layout${reduced ? ', reduced motion' : ''})`);
  check(headGone, 'veil over Специалисты is gone when Специалисты pins');
  check(onePin, 'never more than one pinned trigger active');
  check(portraitAt !== null && portraitAt <= 0.65, `the first portrait is in the viewport with the tone past 0.3 by +${portraitAt} vh — before Кейсы has left`);
  await jump(page, release2 + g.vh * 1.02);
  await page.waitForTimeout(500);
  const pinNow = await page.evaluate(() => ({ top: Math.round(document.querySelector('#specialists').getBoundingClientRect().top), fixed: getComputedStyle(document.querySelector('#specialists')).position, head: +getComputedStyle(document.querySelector('.flow-veil--head')).getPropertyValue('--d-height').replace('svh', '') }));
  check(pinNow.top === 0 && pinNow.fixed === 'fixed' && pinNow.head === 0, `Специалисты pin is active just past +1 vh (top ${pinNow.top}, ${pinNow.fixed}), veil height ${pinNow.head}`);
  await jump(page, release2 + g.vh * 0.97);
  await page.waitForTimeout(500);
  const prePin = await page.evaluate(() => getComputedStyle(document.querySelector('#specialists')).position);
  check(prePin !== 'fixed', `Специалисты is not pinned yet at +0.97 vh (${prePin})`);
  // the archive's depth compression: the docked case keeps its size, its neighbour foreshortens less
  if (amp > 0) {
    await jump(page, release2);
    await page.waitForTimeout(1600);
    const a = await page.evaluate(() => window.__ribbon.boxes.map((b) => (b ? Math.round(b.w) : null)));
    await jump(page, release2 + g.vh * 0.7);
    await page.waitForTimeout(700);
    const b = await page.evaluate(() => window.__ribbon.boxes.map((b) => (b ? Math.round(b.w) : null)));
    const dock = a.length - 1, nb = a.length - 2; // the last case is docked at the release, its neighbour behind it
    const dockDrift = Math.abs(b[dock] / a[dock] - 1);
    const nbGrow = b[nb] / a[nb] - 1;
    check(dockDrift < 0.05 && nbGrow > 0.02, `compressed: docked case width ${a[dock]} → ${b[dock]} (${(dockDrift * 100).toFixed(1)} %), its neighbour ${a[nb]} → ${b[nb]} (+${(nbGrow * 100).toFixed(0)} %, flatter)`);
  }
  // wheel across the second boundary and back
  if (!mobile) {
    await jump(page, release2 - 200);
    await page.mouse.move(width / 2, height / 2);
    await page.waitForTimeout(1600);
    const down = [];
    for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 120); await page.waitForTimeout(70); down.push(await page.evaluate(() => Math.round(scrollY))); }
    await page.waitForTimeout(2200);
    check(down.every((v, i) => i === 0 || v >= down[i - 1] - 1), `wheel down across the second boundary is monotone (${down[0]} → ${down.at(-1)})`);
    const up = [];
    for (let i = 0; i < 30; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(70); up.push(await page.evaluate(() => Math.round(scrollY))); }
    await page.waitForTimeout(2200);
    check(up.every((v, i) => i === 0 || v <= up[i - 1] + 1), `wheel up across the second boundary is monotone (${up[0]} → ${up.at(-1)})`);
    const back2 = await frame(page);
    const inCasesPin = await page.evaluate(() => Math.abs(document.querySelector('#cases').getBoundingClientRect().top) < 2);
    check(inCasesPin && back2.calm === 0 && back2.k2 === 0, `scrolling back up re-enters the Кейсы pin with its depth back (calm ${back2.calm}, tone ${back2.k2})`);
  }

  // ================= Специалисты → Основатель: the light becomes the wall, the room opens on it =================
  // the pin's last EXIT + OPEN vh, scrubbed: t over EXIT (the light → the onyx), then the founder's
  // opening over OPEN, in which Основатель — standing under the last frame — is pinned too and
  // Специалисты lets go of the wall; reversible, with one soft finish to the opened room
  {
    const EXIT = 130, OPEN = 110;
    const sp = await page.evaluate(() => { const st = window.__ST.getAll().find((t) => t.pin && t.trigger.id === 'specialists'); return { start: st.start, end: st.end }; });
    const fp = await page.evaluate(() => { const st = window.__ST.getAll().find((t) => t.pin && t.trigger.id === 'founder'); return st ? { start: st.start, end: st.end } : null; });
    const rowEnd = 300 / (300 + EXIT + OPEN);
    const rest = sp.start + (sp.end - sp.start) * rowEnd; // 05.4 at rest
    const passLen = sp.end - rest;
    const wallAt = rest + (passLen * EXIT) / (EXIT + OPEN); // the wall complete; the founder's pin begins
    check(Math.abs(passLen / g.vh - (EXIT + OPEN) / 100) < 0.02, `the passage is ${(passLen / g.vh).toFixed(2)} vh of ordinary scroll inside the pin (EXIT ${EXIT} + OPEN ${OPEN})`);
    check(fp !== null && Math.abs(fp.start - wallAt) < 2 && Math.abs(fp.end - sp.end) < 2, `Основатель pins exactly where the wall is complete (${fp && Math.round(fp.start)} = ${Math.round(wallAt)}) and for the same ${OPEN} vh (${fp && Math.round(fp.end)} = ${Math.round(sp.end)})`);
    let pinnedThrough = true, founderPinned = true;
    const wallPx = [];
    const wallF = EXIT / (EXIT + OPEN);
    for (const f of [0, 0.2, 0.35, 0.45, wallF, wallF + 0.023, 0.62, 0.72, 0.85, 0.98]) {
      await jump(page, rest + passLen * f);
      await page.waitForTimeout(f === 0 ? 1600 : 500);
      const st = await page.evaluate(() => {
        const s = document.querySelector('#specialists'), fo = document.querySelector('#founder');
        const cs = getComputedStyle(s), cf = getComputedStyle(fo);
        const k = (sel) => +getComputedStyle(document.querySelector(sel)).getPropertyValue('--k');
        return { pos: cs.position, top: Math.round(s.getBoundingClientRect().top), fade: cs.getPropertyValue('--exit-fade').trim(), hand: +cs.getPropertyValue('--hand'), op: +cs.opacity, fPos: cf.position, fTop: Math.round(fo.getBoundingClientRect().top), her: k('.founder__portrait'), name: k('.founder__name'), read: k('.founder__read') };
      });
      if (st.pos !== 'fixed' || st.top !== 0) pinnedThrough = false;
      const inOpen = f * (EXIT + OPEN) > EXIT + 1;
      if (inOpen && (st.fPos !== 'fixed' || st.fTop !== 0)) founderPinned = false;
      console.log(`   passage +${(f * (EXIT + OPEN) / 100).toFixed(2)}vh  pinned ${st.pos} top ${st.top}  words ${st.fade}  hand ${st.hand.toFixed(2)} (opacity ${st.op})  founder ${st.fPos} top ${st.fTop}  her ${st.her.toFixed(2)} name ${st.name.toFixed(2)} read ${st.read.toFixed(2)}`);
      // the wall across the hand: the same surface before (the scene's, hand 0) and after (the room's CSS, hand ≈ 0.9)
      if (f === wallF || f === wallF + 0.023) {
        const buf = await page.screenshot({ clip: { x: Math.round(width * 0.62), y: Math.round(height * 0.5), width: 12, height: 12 } });
        const px = await page.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = 12; c.height = 12; const gg = c.getContext('2d'); gg.drawImage(img, 0, 0); const d = gg.getImageData(0, 0, 12, 12).data; let r = 0, g = 0, b = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } const n = d.length / 4; return [r / n, g / n, b / n]; }, buf.toString('base64'));
        wallPx.push(px);
      }
      if (!reduced) await page.screenshot({ path: `${OUT}/passage-${tag}-${Math.round(f * 100)}.png` });
      if (f === 0.98) {
        check(st.hand === 1 && st.op === 0, `Специалисты has let go of the wall (opacity ${st.op})`);
        check(st.her > 0.99 && st.name > 0.99 && st.read > 0.99, `the room is open: she ${st.her.toFixed(2)}, the name ${st.name.toFixed(2)}, the read ${st.read.toFixed(2)}`);
        // the long read (06.10): the opened viewport shows the read beginning; her CTA ends the read, below it
        const boxes = await page.evaluate(() => { const c = document.querySelector('.founder__chapter').getBoundingClientRect(); const a = document.querySelector('.founder__primary').getBoundingClientRect(); return { chapter: Math.round(c.top), cta: Math.round(a.top) }; });
        if (width >= 1024) check(boxes.chapter < height && boxes.cta > boxes.chapter, `the read begins in the opened viewport (first chapter at ${boxes.chapter} of ${height}); the CTA ends it below (${boxes.cta})`);
      }
      if (f === 0.62 && !reduced) check(st.her > 0 && st.her < 0.5 && st.name === 0, `at the first beats she is coming out of the stone (${st.her.toFixed(2)}) before any word (${st.name.toFixed(2)})`);
    }
    check(pinnedThrough, 'Специалисты stays pinned through the whole passage — one owner, the visitor scrolling');
    check(founderPinned, 'Основатель is pinned under it for the whole opening');
    // (under reduced motion the room is already lit at the hand — the light is a beat, and every beat is at 1)
    if (wallPx.length === 2 && !reduced) {
      const d = Math.abs(lum(wallPx[0]) - lum(wallPx[1]));
      check(d < 6, `the wall is the same surface across the hand (Δlum ${d.toFixed(1)} over the same patch, before and after)`);
    }
    // past the pin: the opened room scrolls on as an ordinary section, the next room after it
    await jump(page, sp.end + 380);
    await page.waitForTimeout(800);
    const cont = await page.evaluate(() => ({ founder: Math.round(document.querySelector('#founder').getBoundingClientRect().top), pos: getComputedStyle(document.querySelector('#founder')).position }));
    check(cont.pos !== 'fixed' && cont.founder < 0 && cont.founder > -400, `after the pins the page scrolls on past the opened room (founder top ${cont.founder}, ${cont.pos})`);
    if (!reduced) await page.screenshot({ path: `${OUT}/passage-after-${tag}.png` });
    // and back: a short scroll up re-opens the room; a deliberate one closes it and the page carries the scene home
    if (!mobile && !reduced) {
      await page.mouse.move(width / 2, height / 2);
      for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(70); }
      await page.waitForTimeout(4000);
      const back = await page.evaluate(() => ({ y: Math.round(scrollY), pos: getComputedStyle(document.querySelector('#specialists')).position, fpos: getComputedStyle(document.querySelector('#founder')).position }));
      // (at exactly the pins' end both are released — that is the opened room at rest)
      check(Math.abs(back.y - sp.end) < 24, `a short wheel up re-enters the opening and the room re-opens (y ${back.y} ≈ ${Math.round(sp.end)}, ${back.pos} / ${back.fpos})`);
      for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(70); }
      await page.waitForTimeout(4200);
      const home = await page.evaluate(() => ({ y: Math.round(scrollY), pos: getComputedStyle(document.querySelector('#specialists')).position }));
      check(home.pos === 'fixed' && Math.abs(home.y - rest) < 3, `a deliberate wheel up closes the room and the page carries the scene home to 05.4 (y ${home.y} = ${Math.round(rest)})`);
    }
    // the soft finish: one deliberate scroll past AUTO_FINISH of the water stage and the page carries the
    // scene through the wall into the opened room on its own, slowly; a short one returns to the rest;
    // from the opened room, up returns
    if (!mobile && !reduced) {
      const eOf = () => page.evaluate((r) => (scrollY - r.rest) / r.passLen, { rest, passLen });
      await jump(page, rest);
      await page.waitForTimeout(1600);
      await page.mouse.move(width / 2, height / 2);
      for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 50); await page.waitForTimeout(40); }
      const t0 = Date.now();
      let finished = null;
      const eAt = [];
      for (let i = 0; i < 44; i++) { await page.waitForTimeout(150); const e = await eOf(); eAt.push(e); if (e > 0.995) { finished = (Date.now() - t0) / 1000; break; } }
      const monotone = eAt.every((e, i) => i === 0 || e >= eAt[i - 1] - 0.005);
      check(finished !== null && finished > 1.5 && finished < 6 && monotone, `one deliberate scroll (to e ≈ ${eAt[0]?.toFixed(2)}) and the page finishes the passage into the opened room itself in ${finished?.toFixed(1)} s, monotone — no snap, no winding`);
      await jump(page, rest);
      await page.waitForTimeout(1600);
      for (let i = 0; i < 2; i++) { await page.mouse.wheel(0, 50); await page.waitForTimeout(40); }
      await page.waitForTimeout(3400);
      const shortE = await eOf();
      check(Math.abs(shortE) < 0.02, `a short scroll (under AUTO_FINISH) returns to 05.4's rest (e ${shortE.toFixed(2)})`);
      await jump(page, sp.end);
      await page.waitForTimeout(1600);
      for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, -60); await page.waitForTimeout(40); }
      await page.waitForTimeout(4600);
      const backE = await eOf();
      check(Math.abs(backE) < 0.02, `from the opened room, one deliberate scroll up (past AUTO_RETURN of the opening) brings the scene back to the rest (e ${backE.toFixed(2)})`);
    }
  }

  // ================= Основатель → Отзывы: ordinary scroll, the forest rising into the marble =================
  {
    // the window opens when the founder's FOOT reaches the viewport bottom — at the pin's end on
    // desktop, later where the room is taller than a viewport (the phone's long read)
    const fp = await page.evaluate(() => { const st = window.__ST.getAll().find((t) => t.pin && t.trigger.id === 'founder'); const sp = document.querySelector('#founder').closest('.pin-spacer') ?? document.querySelector('#founder'); return { start: st.start, end: st.end, windowStart: sp.getBoundingClientRect().bottom + scrollY - innerHeight }; });
    const order = await page.evaluate(() => { const f = document.querySelector('#founder'), r = document.querySelector('#reviews'); return !!f && !!r && !!(f.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING); });
    check(order, 'Отзывы is the next section after Основатель in the document');
    const noPin = await page.evaluate(() => !window.__ST.getAll().some((t) => t.pin && t.trigger.id === 'reviews'));
    check(noPin, 'Отзывы has no pin — the page scrolls on as a document');
    const fk = () => page.evaluate(() => { const cs = getComputedStyle(document.querySelector('.flow-veil--founder')); return { k: +cs.getPropertyValue('--f-k'), reach: cs.getPropertyValue('--f-reach').trim() }; });
    await jump(page, fp.end - 40);
    await page.waitForTimeout(500);
    const inPin = await fk();
    const w0 = fp.windowStart;
    check(inPin.k === 0, `the forest veil is off while the room is pinned (--f-k ${inPin.k})`);
    const seams = [];
    for (const f of [0.12, 0.35, 0.6, 0.85]) {
      await jump(page, w0 + g.vh * f);
      await page.waitForTimeout(450);
      const st = await fk();
      const l = await seam(page, Math.round(width * 0.3), '#reviews');
      seams.push(l ? Math.abs(lum(l.above) - lum(l.below)) : null);
      console.log(`   founder → reviews +${f}vh  veil ${st.k.toFixed(2)} reach ${st.reach}  seam Δlum ${seams.at(-1)?.toFixed(1) ?? '—'}`);
      if (!reduced && f === 0.35) await page.screenshot({ path: `${OUT}/reviews-${tag}-window.png` });
    }
    check(seams.every((d) => d === null || d <= 8), `the meeting line marble/forest carries one tone across the window (Δ luminance ≤ 8: ${seams.map((d) => d?.toFixed(1) ?? '—').join(' ')})`);
    const reach = await fk();
    check(reach.k === 1 && parseFloat(reach.reach) > 60, `by the end of the window the forest reaches ${reach.reach} up the leaving marble`);
    // the room: five voices, the featured one changes by the index and the keyboard; the source is visible
    await jump(page, w0 + g.vh * 1.0);
    await page.waitForTimeout(600);
    const yBefore = await page.evaluate(() => Math.round(scrollY));
    const room = await page.evaluate(() => ({ tabs: document.querySelectorAll('.rv__tab').length, active: document.querySelector('.rv__tab[aria-selected="true"] .rv__tab-no')?.textContent, source: document.querySelector('.rv__source')?.textContent?.trim(), date: document.querySelector('.rv__date')?.textContent, rating: document.querySelector('.rv__rating')?.getAttribute('aria-label'), all: document.querySelector('.rv__all')?.textContent?.trim() }));
    check(room.tabs === 5 && room.active === '01', `five voices, 01 featured (${room.tabs}, ${room.active})`);
    const rvTitle = await page.evaluate(() => document.querySelector('.rv__title')?.textContent?.replace(/\u00a0/g, ' ').trim());
    check(rvTitle === 'Ваши отзывы.', `the title: «${rvTitle}»`);
    check(!!room.source && !!room.date && !!room.rating, `the featured voice shows its source, date and rating (${room.source} · ${room.date} · ${room.rating})`);
    check(room.all?.replace(/\u00a0/g, ' ').startsWith('Все отзывы на Яндекс Картах'), `the way out to the platform: «${room.all}»`);
    await press('.rv__tab:nth-child(3)');
    await page.waitForTimeout(700);
    const third = await page.evaluate(() => ({ active: document.querySelector('.rv__tab[aria-selected="true"] .rv__tab-no')?.textContent, no: document.querySelector('.rv__no')?.textContent, y: Math.round(scrollY) }));
    check(third.active === '03' && third.no === '03' && Math.abs(third.y - yBefore) < 2, `choosing 03 makes it the featured voice without moving the page (${third.active}/${third.no}, y ${third.y} = ${yBefore})`);
    if (!mobile) {
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(700);
      const fourth = await page.evaluate(() => ({ active: document.querySelector('.rv__tab[aria-selected="true"] .rv__tab-no')?.textContent, focused: document.activeElement?.classList.contains('rv__tab') }));
      check(fourth.active === '04' && fourth.focused === true, `the arrow key moves to 04 and keeps focus on the index (${fourth.active})`);
    }
    if (!reduced) await page.screenshot({ path: `${OUT}/reviews-${tag}.png` });
  }

  // ================= Отзывы → Адрес: ordinary scroll, the forest becoming daylight =================
  {
    const order = await page.evaluate(() => { const r = document.querySelector('#reviews'), c = document.querySelector('#contact'); return !!r && !!c && !!(r.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING); });
    check(order, 'Адрес is the next section after Отзывы in the document');
    const noPin = await page.evaluate(() => !window.__ST.getAll().some((t) => t.pin && (t.trigger.id === 'contact' || t.trigger.id === 'reviews')));
    check(noPin, 'neither Отзывы nor Адрес is pinned — the page scrolls on as a document');
    const geo = await page.evaluate(() => { const r = document.querySelector('#reviews').getBoundingClientRect(), c = document.querySelector('#contact').getBoundingClientRect(); return { flush: Math.abs(c.top - r.bottom), top: c.top + scrollY, dawn: document.querySelector('.place__dawn').getBoundingClientRect().height }; });
    check(geo.flush < 0.5, `the two sections are flush (${geo.flush.toFixed(1)}px)`);
    check(geo.dawn >= g.vh * 0.44, `the atmosphere at the head of Адрес is long (${Math.round(geo.dawn)}px of ${g.vh})`);
    // the meeting line: one tone on both sides at every position of the window
    const seams = [];
    const tones = [];
    for (const f of [0.12, 0.35, 0.6, 0.85]) {
      await jump(page, geo.top - g.vh * (1 - f));
      await page.waitForTimeout(450);
      const l = await seam(page, Math.round(width * 0.3), '#contact');
      seams.push(l ? Math.abs(lum(l.above) - lum(l.below)) : null);
      // the tone at the bottom of the viewport: it must only get lighter as the place enters
      const y = height - 3;
      const buf = await page.screenshot({ clip: { x: Math.round(width * 0.3), y, width: 1, height: 1 } });
      tones.push(await page.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = 1; c.height = 1; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; }, buf.toString('base64')));
      if (!reduced && f === 0.6) await page.screenshot({ path: `${OUT}/contact-${tag}-window.png` });
    }
    check(seams.every((d) => d === null || d <= 8), `the meeting line forest/forest carries one tone across the window (Δ luminance ≤ 8: ${seams.map((d) => d?.toFixed(1) ?? '—').join(' ')})`);
    check(tones.every((t, i) => i === 0 || t >= tones[i - 1] - 1), `the environment only lightens as Адрес enters (${tones.map((t) => t.toFixed(0)).join(' → ')})`);
    // the room: the clinic's real facts (06.10), the route, the map
    await jump(page, geo.top + geo.dawn * 0.6);
    await page.waitForTimeout(600);
    const room = await page.evaluate(() => {
      const t = (sel) => document.querySelector(sel)?.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
      const phone = document.querySelector('.place__phone');
      return {
        title: t('.place__title'), address: t('.place__street'), entrance: t('.place__entrance'),
        phoneHref: phone?.getAttribute('href'), phone: phone?.textContent, hours: document.querySelectorAll('.place__hours tr').length,
        today: document.querySelectorAll('.place__hours tr[data-today]').length, hoursText: t('.place__hours'), note: t('.place__hours-note'),
        rows: [...document.querySelectorAll('.place__row dt')].map((d) => d.textContent?.trim()),
        tg: document.querySelector('.place__messengers a:nth-child(1)')?.getAttribute('href'), wa: document.querySelector('.place__messengers a:nth-child(2)')?.getAttribute('href'),
        route: t('.place__route'), routeHref: document.querySelector('.place__route')?.getAttribute('href'),
        mapAlt: document.querySelector('.place__map-image')?.getAttribute('alt') ?? '', mapHref: document.querySelector('.place__map')?.getAttribute('href') ?? '', mapLabel: document.querySelector('.place__map')?.getAttribute('aria-label') ?? '',
        overflow: document.documentElement.scrollWidth - innerWidth,
      };
    });
    check(room.title === 'Место, кудавозвращаются', `the title: «Место, куда / возвращаются» (${room.title})`);
    check(room.address === 'Хабаровск, Госпитальный переулок, 1' && room.entrance === '1 этаж · рядом с магазином «Малыш»', `the real address (${room.address} · ${room.entrance})`);
    check(room.phoneHref === 'tel:+79147778500' && room.phone === '+7 914 777-85-00', `the clinic's phone (${room.phone} · ${room.phoneHref})`);
    check(room.hours === 1 && room.hoursText.includes('Ежедневно') && room.hoursText.includes('09:00–21:00') && room.note === 'по предварительной записи', `hours: «Ежедневно 09:00–21:00», «${room.note}»`);
    check(room.rows.join('|') === 'Телефон|Часы', `only verified rows — no Метро, no Парковка (${room.rows.join(', ')})`);
    check(room.tg === 'https://t.me/eracosmetology' && room.wa === 'https://wa.me/79147778500', `the real messengers (${room.tg} · ${room.wa})`);
    check(room.route === 'Построить маршрут →' && room.routeHref?.startsWith('https://2gis.ru/khabarovsk/directions/points/') && room.routeHref.endsWith('70000001057599223'), `the route CTA goes to the clinic on 2GIS (${room.routeHref})`);
    check(room.mapAlt.includes('Госпитальный переулок, 1') && room.mapHref === 'https://2gis.ru/khabarovsk/firm/70000001057599223' && room.mapLabel === 'Открыть расположение клиники ЭРА в 2ГИС', `the map is the approved image, a link to the clinic on 2GIS (${room.mapHref})`);
    check(room.overflow === 0, `no horizontal overflow (${room.overflow}px)`);
    const focusable = await page.evaluate(() => { const a = document.querySelector('.place__route'); a.focus({ preventScroll: true }); return document.activeElement === a; });
    check(focusable, 'the route CTA takes keyboard focus');
    if (!reduced) await page.screenshot({ path: `${OUT}/contact-${tag}.png` });
    // reverse: back up to the middle of the window — the voices are back, nothing held
    const yBack = Math.round(geo.top - g.vh * 0.5);
    await jump(page, yBack);
    await page.waitForTimeout(500);
    const back = await page.evaluate(() => ({ y: Math.round(scrollY), reviewsBottom: Math.round(document.querySelector('#reviews').getBoundingClientRect().bottom) }));
    check(Math.abs(back.y - yBack) < 2 && Math.abs(back.reviewsBottom - g.vh * 0.5) < 3, `scrolling back up returns to Отзывы freely (y ${back.y} = ${yBack}, its foot at ${back.reviewsBottom} of ${g.vh})`);
  }

  // ================= Адрес → Заявка: the corridor — the public place becoming a private conversation =================
  {
    const order = await page.evaluate(() => { const c = document.querySelector('#contact'), t = document.querySelector('#inquiry'); return !!c && !!t && !!(c.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING); });
    check(order, 'Заявка is the next section after Адрес in the document — and the last');
    const noPin = await page.evaluate(() => !window.__ST.getAll().some((t) => t.pin && (t.trigger.id === 'contact' || t.trigger.id === 'inquiry')));
    check(noPin, 'neither Адрес nor Заявка is pinned — no snap, no capture');
    const geo = await page.evaluate(() => { const c = document.querySelector('#contact').getBoundingClientRect(), t = document.querySelector('#inquiry').getBoundingClientRect(); return { flush: Math.abs(t.top - c.bottom), top: t.top + scrollY, bgT: getComputedStyle(document.querySelector('#inquiry')).backgroundColor }; });
    check(geo.flush < 0.5 && geo.bgT === 'rgb(7, 7, 7)', `the two rooms are flush; Заявка stands on black (${geo.flush.toFixed(1)}px, ${geo.bgT})`);
    const corr = () => page.evaluate(() => { const v = (sel, n) => getComputedStyle(document.querySelector(sel)).getPropertyValue(n); return { k: +(+v('.talk-walls', '--t-k')).toFixed(2), dim: +(+v('.flow-veil--place-dim', '--p-dim')).toFixed(2), dusk: +(+v('.flow-veil--place', '--p-k')).toFixed(2), reach: v('.flow-veil--place', '--p-reach').trim() }; });
    const phases = [];
    const tonesAtLine = [];
    for (const f of [0.1, 0.25, 0.5, 0.75, 1.0]) {
      await jump(page, geo.top - g.vh * (1 - f));
      await page.waitForTimeout(450);
      const c = await corr();
      phases.push({ f, ...c });
      // the meeting line: one tone, nothing painted
      const l = await seam(page, Math.round(width * 0.5), '#inquiry');
      if (l) check(Math.abs(lum(l.above) - lum(l.below)) <= 6, `at +${f}vh the line Адрес/Заявка is invisible (Δlum ${Math.abs(lum(l.above) - lum(l.below)).toFixed(1)}, lum ${lum(l.below).toFixed(0)})`);
      if (l) tonesAtLine.push(lum(l.below));
      if (!reduced && (f === 0.5 || f === 1.0)) await page.screenshot({ path: `${OUT}/inquiry-${tag}-${f}.png` });
    }
    const [a, b, c2, d, e] = phases;
    check(a.k === 0 && a.dim <= 0.02 && a.dusk <= 0.02, `at 10 %: Адрес untouched — walls ${a.k}, dim ${a.dim}, dusk ${a.dusk}`);
    check(b.dim < 0.3 && b.dusk < 0.25, `at 25 %: the light only beginning to go — dim ${b.dim}, dusk ${b.dusk}`);
    check(c2.dim > 0.4 && c2.dim < 0.85 && c2.dusk > 0.3 && c2.dusk < 0.75, `at 50 %: greige, the dusk deepening — dim ${c2.dim}, dusk ${c2.dusk}`);
    check(d.dusk > 0.75, `at 75 %: the black atmosphere already there — dusk ${d.dusk}`);
    check(e.k === 1 && e.dim === 1 && e.dusk === 1 && e.reach === '58svh', `at 100 %: Заявка established on black — walls ${e.k}, dim ${e.dim}, dusk ${e.dusk}, reach ${e.reach}`);
    check(tonesAtLine.every((t, i) => i === 0 || t <= tonesAtLine[i - 1] + 1) && tonesAtLine.at(-1) < 30, `the tone at the line only darkens, near black by 75 % (${tonesAtLine.map((t) => t.toFixed(0)).join(' → ')})`);
    // the edges calmer than the middle, but only by a little — never a vignette
    const edge = async (x) => { const buf = await page.screenshot({ clip: { x, y: Math.round(height * 0.3), width: 1, height: 1 } }); return page.evaluate(async (b64) => { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); const c = document.createElement('canvas'); c.width = 1; c.height = 1; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, 1, 1).data; return 0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]; }, buf.toString('base64')); };
    await jump(page, geo.top - g.vh * 0.4);
    await page.waitForTimeout(450);
    const lEdge = await edge(4), lMid = await edge(Math.round(width * 0.5));
    check(lMid - lEdge >= -4 && lMid - lEdge < 48, `over the leaving Адрес the edge is never lighter than the middle, and never a vignette (Δlum ${(lMid - lEdge).toFixed(0)}: edge ${lEdge.toFixed(0)}, middle ${lMid.toFixed(0)})`);
    // the header stays readable: light ink in `difference` over the bone
    const header = await page.evaluate(() => { const a = [...document.querySelectorAll('.flowbar__link, .flowbar__cta')].find((el) => el.getBoundingClientRect().width > 0); return { blend: getComputedStyle(a.closest('.flowbar')).mixBlendMode, visible: !!a }; });
    check(header.blend === 'difference' && header.visible, `the header keeps its own contrast logic over the light room (${header.blend})`);
    // the room: the wireframe's fields, the headline, the staging in order
    await jump(page, geo.top + g.vh * 0.6);
    await page.waitForTimeout(600);
    const room = await page.evaluate(() => {
      const t = (sel) => document.querySelector(sel)?.textContent?.replace(/\u00a0/g, ' ').trim() ?? '';
      const names = [...document.querySelectorAll('#inquiry form [name]')].map((el) => `${el.name}${el.required ? '*' : ''}`);
      const labels = [...document.querySelectorAll('#inquiry form label')].every((l) => l.htmlFor && document.getElementById(l.htmlFor));
      return { title: t('.talk__title'), names, labels, send: t('.talk__send'), or: t('.talk__or'), card: getComputedStyle(document.querySelector('.talk__form')).backgroundColor, input: getComputedStyle(document.querySelector('#inquiry input[name=name]')), overflow: document.documentElement.scrollWidth - innerWidth };
    });
    check(room.title === 'Начнёмс разговора.', `the headline: «Начнём / с разговора.» (${room.title})`);
    check(room.names.join(' ') === 'name* phone* procedure specialist message consent', `the wireframe's fields, in its order, with its required marks (${room.names.join(' ')})`);
    check(room.labels, 'every control has a label bound by id');
    check(room.send === 'Отправить заявку →' && room.or.startsWith('Или напишите в Telegram'), `the wireframe's button and its alternative (${room.send} · ${room.or})`);
    check(room.card === 'rgba(0, 0, 0, 0)', `the form stands on the room, not on a card (${room.card})`);
    const ink = await page.evaluate(() => ({ title: getComputedStyle(document.querySelector('.talk__title')).color, lede: getComputedStyle(document.querySelector('.talk__lede')).color, label: getComputedStyle(document.querySelector('#inquiry form label')).color, input: getComputedStyle(document.querySelector('#inquiry input[name=name]')).color, foot: getComputedStyle(document.querySelector('.talk__foot')).color }));
    check(ink.title === 'rgb(234, 230, 220)' && ink.input === 'rgb(234, 230, 220)', `the headline and the entries are ivory on the black (${ink.title})`);
    check(ink.lede === 'rgba(234, 230, 220, 0.72)' && ink.foot === ink.lede, `the support and the colophon are a warm ivory at 0.72 — 9:1 on the black (${ink.lede})`);
    check(room.overflow === 0, `no horizontal overflow (${room.overflow}px)`);
    const ks = await page.evaluate(() => [...document.querySelectorAll('#inquiry [data-reveal], #inquiry .talk__form > *')].map((el) => +(+getComputedStyle(el).getPropertyValue('--k')).toFixed(2)));
    check(ks.every((k, i) => i === 0 || k <= ks[i - 1] + 0.001), `the parts arrive in order — marker, title, support, fields, CTA — none ahead of the one before (${ks.join(' ')})`);
    // the end of the page: everything completes
    await jump(page, 1e7);
    await page.waitForTimeout(500);
    const ksEnd = await page.evaluate(() => [...document.querySelectorAll('#inquiry [data-reveal], #inquiry .talk__form > *')].map((el) => +(+getComputedStyle(el).getPropertyValue('--k')).toFixed(2)));
    check(ksEnd.every((k) => k === 1), `at the end of the page every part is fully there (${ksEnd.join(' ')})`);
    if (!reduced) await page.screenshot({ path: `${OUT}/inquiry-${tag}.png` });
    // the closing scene: the imprint at the lower left, out of the edges, faint; the colophon in one row
    const scene = await page.evaluate(() => {
      const im = document.querySelector('.talk__imprint').getBoundingClientRect();
      const title = document.querySelector('.talk__title').getBoundingClientRect();
      const lede = document.querySelector('.talk__lede').getBoundingClientRect();
      const side = document.querySelector('.talk__side').getBoundingClientRect();
      const f = document.querySelector('.talk__foot');
      const fr = f.getBoundingClientRect();
      const t = (sel) => f.querySelector(sel)?.innerText.replace(/\s+/g, ' ').trim();
      const hit = (a, b) => !(a.top > b.bottom || a.bottom < b.top || a.left > b.right || a.right < b.left);
      const emblem = getComputedStyle(document.querySelector('.talk__imprint'), '::after');
      return { imW: im.width / innerWidth, imLeft: im.left, imBottom: im.bottom - innerHeight, imOpacity: +emblem.opacity, imAsset: emblem.backgroundImage, overlapsTitle: hit(im, title), overlapsLede: innerWidth >= 768 && hit(im, lede), overlapsForm: innerWidth >= 768 && hit(im, side), footH: Math.round(fr.height), footRows: Math.round(fr.height / 20), brand: t('.talk__foot-brand'), legal: t('.talk__foot-legal'), where: t('.talk__foot-where'), footColor: getComputedStyle(f).color, footSize: parseFloat(getComputedStyle(f).fontSize) };
    });
    check((mobile ? scene.imW >= 0.7 && scene.imW <= 0.85 : scene.imW >= 0.45 && scene.imW <= 0.6) && scene.imLeft < 0 && scene.imBottom > 0, `the imprint is oversized (${(scene.imW * 100).toFixed(0)} vw) and runs out of the left and bottom edges`);
    check(/emblem(@phone)?\.webp/.test(scene.imAsset), `the imprint is the hero's emblem asset, era-logo_3 (${scene.imAsset.replace(/^.*\//, '').replace(/"\)$/, '')})`);
    check(scene.imOpacity >= 0.4 && scene.imOpacity <= 0.65, `the imprint is present on the black, still under the words (opacity ${scene.imOpacity})`);
    check(!scene.overlapsTitle && !scene.overlapsLede && !scene.overlapsForm, 'the imprint touches neither the headline, the support nor the form');
    check(scene.brand?.startsWith('© 2026 ЭРА cosmetology') && scene.legal?.includes('Политика обработки персональных данных') && scene.where?.startsWith('[Город]'), `the colophon: «${scene.brand}» · «${scene.legal}» · «${scene.where}»`);
    check((mobile ? scene.footH < 260 : width < 1024 ? scene.footH < 100 : scene.footH >= 48 && scene.footH <= 64) && scene.footSize >= 11, `the colophon is ${width < 1024 ? 'a short stack' : 'one row'} of small type (${scene.footH}px, ${scene.footSize}px)`);
    // validation: the wireframe's rules, the quiet errors, the focus landing on the first
    const yForm = await page.evaluate(() => Math.round(scrollY));
    await press('.talk__send');
    await page.waitForTimeout(250);
    const invalid = await page.evaluate(() => ({ alerts: [...document.querySelectorAll('#inquiry [role=alert]')].map((e) => e.textContent.replace(/\u00a0/g, ' ')), focused: document.activeElement?.getAttribute('name'), invalid: [...document.querySelectorAll('#inquiry [aria-invalid=true]')].map((e) => e.getAttribute('name')), y: Math.round(scrollY) }));
    check(invalid.alerts.length === 3 && invalid.invalid.join(' ') === 'name phone consent', `an empty submit: three quiet errors on name, phone, consent (${invalid.alerts.length})`);
    check(invalid.alerts[0] === 'Напишите, пожалуйста, как к вам обращаться.', `the wireframe's words (${invalid.alerts[0]})`);
    check(invalid.focused === 'name', `the focus lands on the first invalid field (${invalid.focused})`);
    check(Math.abs(invalid.y - yForm) < g.vh, `the page did not jump away (${invalid.y} vs ${yForm})`);
    const errColor = await page.evaluate(() => getComputedStyle(document.querySelector('#inquiry [role=alert]')).color);
    check(errColor === 'rgb(234, 230, 220)', `errors are ivory, never red (${errColor})`);
    // the keyboard: Tab walks the form in order
    if (!mobile) {
      await page.evaluate(() => document.querySelector('#inquiry input[name=name]').focus());
      const walked = [];
      for (let i = 0; i < 7; i += 1) { await page.keyboard.press('Tab'); walked.push(await page.evaluate(() => document.activeElement?.getAttribute('name') ?? document.activeElement?.className ?? '?')); }
      check(walked.join(' ') === 'phone procedure specialist message consent talk__send talk__or', `Tab walks phone → procedure → specialist → message → consent → send → Telegram (${walked.join(' ')})`);
    }
    // a bad phone keeps its error; a handle passes
    await page.fill('#inquiry input[name=name]', 'Анна');
    await page.fill('#inquiry input[name=phone]', '12');
    await page.check('#inquiry input[name=consent]');
    await press('.talk__send');
    await page.waitForTimeout(250);
    const bad = await page.evaluate(() => [...document.querySelectorAll('#inquiry [aria-invalid=true]')].map((e) => e.getAttribute('name')));
    check(bad.join(' ') === 'phone', `«12» is not a phone: only the phone keeps its error (${bad.join(' ') || '—'})`);
    await page.fill('#inquiry input[name=phone]', '@anna');
    await press('.talk__send');
    const sending = await page.evaluate(() => document.querySelector('.talk__send')?.textContent?.trim());
    await page.waitForTimeout(1000);
    const done = await page.evaluate(() => { const s = document.querySelector('#inquiry [role=status]'); return { status: !!s, live: s?.getAttribute('aria-live'), thanks: s?.querySelector('.talk__thanks')?.textContent, after: s?.querySelector('.talk__after')?.textContent?.replace(/\u00a0/g, ' '), time: !!s?.querySelector('time[datetime]'), form: !!document.querySelector('#inquiry form'), bg: getComputedStyle(document.querySelector('#inquiry')).backgroundColor, modal: !!document.querySelector('[role=dialog]') }; });
    check(sending === 'Отправляем…', `while sending the button says «${sending}»`);
    check(done.status && done.live === 'polite' && !done.form && !done.modal, 'the success replaces the form in place — a status, no modal');
    check(done.thanks === 'Спасибо.' && done.after === 'Мы свяжемся с вами и подберём удобное время.' && done.time, `the success line: «${done.thanks}» «${done.after}», with the time`);
    check(done.bg === 'rgb(7, 7, 7)', `the success stays in the same black room (${done.bg})`);
    if (!reduced) await page.screenshot({ path: `${OUT}/inquiry-${tag}-sent.png` });
    // reverse: back into Адрес — the corridor withdraws, the map is whole again
    await jump(page, geo.top - g.vh * 0.9);
    await page.waitForTimeout(500);
    const rev = await corr();
    const revMap = await page.evaluate(() => document.querySelector('.place__map').getBoundingClientRect().bottom > 0);
    check(rev.k === 0 && rev.dim <= 0.02 && rev.dusk <= 0.02 && revMap, `scrolling back into Адрес brings the light back (walls ${rev.k}, dim ${rev.dim}, dusk ${rev.dusk})`);
  }

  // --- resize mid-window: the pins re-measure and stay flush and sequential ---
  if (!mobile) {
    await jump(page, release + g.vh * 0.5);
    await page.setViewportSize({ width: width - 160, height: height - 60 });
    await page.waitForTimeout(700);
    const r = await survey(page);
    const rf = await frame(page);
    check(
      Math.abs(r.cases.top - r.services.bottom) < 0.5 && r.cases.top - (r.services.bottom - r.vh) >= r.vh - 1 && Math.abs(r.sitting.top - r.cases.bottom) < 0.5 && r.sitting.top - (r.cases.bottom - r.vh) >= r.vh - 1,
      `after resize to ${width - 160}×${height - 60}: all three flush, both windows still 1 vh, blend tone ${rf.k}`,
    );
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(700);
  }

  // --- Стоимость: out of the scroll, one click from the menu ---
  const mid = release + g.vh * 0.5;
  await jump(page, mid);
  await page.waitForTimeout(400);
  const y0 = await page.evaluate(() => Math.round(scrollY));
  const noPricingInFlow = await page.evaluate(() => !document.querySelector('.flowpage > #pricing, .flowpage > .pin-spacer > #pricing'));
  check(noPricingInFlow, 'no Стоимость section in the document flow');
  await press('.flowbar a[href="#pricing"]');
  await page.waitForTimeout(300);
  const open1 = await page.evaluate(() => ({
    open: !!document.querySelector('.pricelayer'),
    hash: location.hash,
    y: Math.round(scrollY),
    focusIn: document.activeElement?.closest('.pricelayer') !== null,
    locked: document.documentElement.classList.contains('is-scroll-locked'),
  }));
  check(open1.open && open1.hash === '#pricing', `menu → Стоимость opens the layer (hash ${open1.hash})`);
  check(open1.y === y0, `page did not move under the layer (${y0} → ${open1.y})`);
  check(open1.focusIn && open1.locked, 'focus is in the layer and the document is held');
  if (!reduced) await page.screenshot({ path: `${OUT}/pricing-${tag}.png` });
  // the layer scrolls on its own; the page beneath does not
  await page.mouse.move(width / 2, height / 2);
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(500);
  const scrolled = await page.evaluate(() => ({ layer: document.querySelector('.pricelayer__scroll').scrollTop, y: Math.round(scrollY) }));
  check(scrolled.layer > 200 && scrolled.y === y0, `wheel scrolls the layer (${Math.round(scrolled.layer)}px), not the page (${scrolled.y})`);
  // Esc closes, page exactly where it was
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  const closed1 = await page.evaluate(() => ({ open: !!document.querySelector('.pricelayer'), hash: location.hash, y: Math.round(scrollY), locked: document.documentElement.classList.contains('is-scroll-locked') }));
  check(!closed1.open && closed1.hash === '' && closed1.y === y0 && !closed1.locked, `Esc closes it, hash cleared, page still at ${closed1.y}, lock released`);
  // browser Back closes too
  await press('.flowbar a[href="#pricing"]');
  await page.waitForTimeout(300);
  await page.goBack();
  await page.waitForTimeout(400);
  const closed2 = await page.evaluate(() => ({ open: !!document.querySelector('.pricelayer'), y: Math.round(scrollY) }));
  check(!closed2.open && closed2.y === y0, `browser Back closes it, page still at ${closed2.y}`);
  // the layer's own link out: closes and goes to Кейсы
  await press('.flowbar a[href="#pricing"]');
  await page.waitForTimeout(300);
  await press('.pricelayer a[href="#cases"]');
  await page.waitForTimeout(reduced ? 500 : 1800);
  const left = await page.evaluate(() => ({ open: !!document.querySelector('.pricelayer'), hash: location.hash, casesTop: Math.round(document.querySelector('#cases').getBoundingClientRect().top) }));
  check(!left.open && left.hash !== '#pricing' && Math.abs(left.casesTop) < 2, `«Посмотреть результаты →» leaves the layer and lands on Кейсы (top ${left.casesTop}, hash "${left.hash}")`);
  // the state's own «Стоимость →» opens the layer too
  await jump(page, release);
  await page.waitForTimeout(1600);
  await press('.state[data-active] a[href="#pricing"]');
  await page.waitForTimeout(300);
  const open2 = await page.evaluate(() => ({ open: !!document.querySelector('.pricelayer'), y: Math.round(scrollY) }));
  check(open2.open && open2.y === Math.round(release), `the state's «Стоимость →» opens the layer, page still at ${open2.y}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // --- deep link ---
  await page.goto(`${base}#pricing`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const deep = await page.evaluate(() => !!document.querySelector('.pricelayer'));
  await press('.pricelayer__back');
  await page.waitForTimeout(300);
  const deepClosed = await page.evaluate(() => ({ open: !!document.querySelector('.pricelayer'), hash: location.hash, url: location.href }));
  check(deep && !deepClosed.open && deepClosed.hash === '' && deepClosed.url.startsWith(base), `#pricing deep link opens the layer; «Назад к сайту» closes it and stays on the page`);

  check(errors.length === 0, `no console errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

const only = process.env['ONLY'];
const runs = [
  { width: 1440, height: 900, tag: 'd1440' },
  { width: 1280, height: 800, tag: 'd1280' },
  { width: 820, height: 1180, touch: true, tag: 't820' },
  { width: 390, height: 844, mobile: true, tag: 'm390' },
  { width: 1440, height: 900, reduced: true, tag: 'reduced' },
];
for (const r of runs) if (!only || r.tag === only) await run(r);

await browser.close();
console.log(failures ? `\n${failures} check(s) FAILED` : '\nall checks passed');
process.exit(failures ? 1 : 0);
