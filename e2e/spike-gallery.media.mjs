// Spike C — the real case photographs on the rail and the «до / после» divider.
//
//   node e2e/spike-gallery.media.mjs        (dev server on :5173)
//
// Proves: every asset the archive draws resolves and has its size; a single
// photograph is a photograph (no slider, no states); a pair carries one
// divider laid exactly on the open sheet, driven by pointer, touch and
// keyboard, and the scene cuts the two photographs at the same split (the
// left of the divider is the «до» frame, the right the «после» frame — a clip,
// not a mix); opening and closing keep the archive's behaviour; the phone has
// no horizontal overflow and a vertical swipe on the sheet still scrolls.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'spikes/gallery/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/gallery/';
let failures = 0;
const check = (ok, label) => { console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`); if (!ok) failures += 1; };
const browser = await chromium.launch({ channel: 'chrome' });
const hud = (p) => p.evaluate(() => document.querySelector('.hud')?.textContent ?? '');
const sheet = (p, k) => p.evaluate((k) => (window.__sheets ?? []).find((s) => s.k === k) ?? null, k);
const slider = (p) => p.evaluate(() => { const s = document.querySelector('[role=slider]'); return s ? { now: Number(s.getAttribute('aria-valuenow')), min: s.getAttribute('aria-valuemin'), max: s.getAttribute('aria-valuemax'), label: s.getAttribute('aria-label'), text: s.getAttribute('aria-valuetext') } : null; });
const split = (p) => p.evaluate(() => window.__ribbon.split);
const gotoCases = async (page) => {
  await page.goto(base + '?hud=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  const top = await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), top);
  await page.waitForTimeout(700);
};
/** the pixels of a screenshot as luminance rows, decoded in the page */
const decode = (page, png) => page.evaluate(async (src) => {
  const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data; const o = [];
  for (let i = 0; i < d.length; i += 4) o.push(Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]));
  return { w: c.width, h: c.height, l: o };
}, `data:image/png;base64,${png.toString('base64')}`);
const meanAbsDiff = (A, B, x0, x1) => { let s = 0, n = 0; for (let y = 0; y < A.h; y += 2) for (let x = x0; x < x1; x += 2) { s += Math.abs(A.l[y * A.w + x] - B.l[y * B.w + x]); n++; } return s / n; };

console.log('desktop 1440 × 900');
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await gotoCases(page);

  // 1 · the assets: every path the archive draws resolves and has its size
  const media = await page.evaluate(() => window.__media);
  const pairs = media.filter((m) => m.type === 'beforeAfter').length;
  const singles = media.filter((m) => m.type === 'single').length;
  check(media.length === 5 && pairs === 2 && singles === 3, `5 cases on the rail: ${pairs} pairs, ${singles} single photographs`);
  const urls = media.flatMap((m) => (m.type === 'single' ? [m.image] : [m.before, m.after])).flatMap((i) => [i.src, i.srcSmall].filter(Boolean));
  const sizes = await page.evaluate(async (urls) => Promise.all(urls.map((u) => new Promise((r) => { const i = new Image(); i.onload = () => r([u, i.naturalWidth, i.naturalHeight]); i.onerror = () => r([u, 0, 0]); i.src = u; }))), urls);
  check(sizes.length === 14 && sizes.every(([, w, h]) => w > 0 && h > 0), `all ${sizes.length} image paths resolve (${sizes.map(([u, w, h]) => `${u.split('/').pop().split('?')[0]} ${w}×${h}`).join(' · ')})`);
  check(sizes.filter(([u]) => !u.includes('@rail')).every(([, w]) => w >= 959), 'the open tier is at least the original width (959 px for case3, 1280 px otherwise)');
  for (const m of media.filter((m) => m.type === 'beforeAfter')) {
    const [, bw, bh] = sizes.find(([u]) => u === m.before.src); const [, aw, ah] = sizes.find(([u]) => u === m.after.src);
    check(Math.abs(bw / bh - aw / ah) < 0.005, `a pair shares one proportion: ${bw}×${bh} vs ${aw}×${ah}`);
  }
  check(media.every((m) => (m.type === 'single' ? m.image.alt : m.before.alt && m.after.alt)), 'every photograph has Russian alt text');
  check(media.every((m) => !/визуализац/i.test(JSON.stringify(m))), 'no photograph is described as a visualisation');
  const honesty = await page.evaluate(() => document.querySelector('.sheetinfo__honesty').textContent);
  check(/Реальный кейс/.test(honesty) && /\[согласие пациента/.test(honesty) && !/не реальный пациент/.test(honesty), `the honesty line is the bracketed pending state: «${honesty.trim()}»`);
  const gl = await page.evaluate(() => window.__gl);
  check(gl.textures <= 8, `rail tier only until a case is opened: ${gl.textures} textures on the GPU`);

  // 2 · browsing is unchanged: scroll walks the rail, hover lifts, the grips pick
  await page.mouse.move(1300, 800);
  for (let i = 0; i < 16; i++) { await page.mouse.wheel(0, 90); await page.waitForTimeout(24); }
  await page.waitForTimeout(700);
  const pos = Number((await hud(page)).match(/pos ([\d.]+)/)?.[1]);
  check(pos > 0.5, `scroll walks the rail: pos ${pos.toFixed(2)} after 1 440 px`);
  const near = await page.evaluate(() => Number(document.querySelector('.grip[data-near]')?.getAttribute('aria-label')?.match(/04\.(\d)/)?.[1]) - 1);
  const before = await sheet(page, near + 1);
  const nb = await page.locator(`.grip >> nth=${near + 1}`).boundingBox();
  await page.mouse.move(nb.x + nb.width / 2, nb.y + nb.height / 2);
  await page.waitForTimeout(600);
  const lifted = await sheet(page, near + 1);
  check(lifted.dist < before.dist - 0.1, `hover lifts the next sheet toward the visitor (${before.dist} → ${lifted.dist})`);
  const pairTags = await page.evaluate(() => [...document.querySelectorAll('.grip')].map((g) => !!g.querySelector('.grip__pair')));
  check(pairTags.join() === media.map((m) => m.type === 'beforeAfter').join(), `only the pairs carry «до / после» on their label: ${pairTags.map((t) => (t ? 'pair' : 'one')).join(' ')}`);
  await page.mouse.move(1300, 800);
  await page.waitForTimeout(400);

  // 3 · a single photograph opens as a photograph
  const singleK = media.findIndex((m) => m.type === 'single');
  await page.click(`.rail button >> nth=${singleK}`); await page.waitForTimeout(1900);
  check(await page.evaluate(() => !!document.querySelector('.sheetinfo[data-visible]')), `04.${singleK + 1} (single) opens`);
  check((await slider(page)) === null && (await page.evaluate(() => !document.querySelector('.sheetinfo__controls') && !document.querySelector('.sheetcompare'))), 'single: no slider, no «До · Сравнить · После», no divider');
  check((await page.evaluate(() => document.querySelector('.sheettag')?.textContent)).includes('снимок клиники'), 'single: the sheet tag says «снимок клиники»');
  check((await page.evaluate(() => [...document.querySelectorAll('.sheetinfo__meta dt')].map((d) => d.textContent))).includes('Снимок'), 'single: the metadata row is «Снимок», not «Кадр «до»»');
  await page.screenshot({ path: `${OUT}/r1-open-single.png` });
  await page.waitForTimeout(900);
  check((await page.evaluate(() => window.__gl.textures)) > gl.textures, 'the open case loaded its full-size photograph');
  await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
  check((await hud(page)).includes('focus —'), 'Escape closes it');

  // 4 · a pair opens with the divider in the middle, laid exactly on the sheet
  const pairK = media.findIndex((m) => m.type === 'beforeAfter');
  await page.click(`.rail button >> nth=${pairK}`); await page.waitForTimeout(1900);
  let s = await slider(page);
  check(s && s.now === 50 && s.min === '0' && s.max === '100' && /Сравнение до и после/.test(s.label) && /до — 50 %/.test(s.text), `pair: role=slider at 50 (${JSON.stringify(s)})`);
  const boxes = await page.evaluate(() => { const b = window.__ribbon.focusBox; const c = document.querySelector('.sheetcompare').getBoundingClientRect(); return { b, c: { x: c.x, y: c.y, w: c.width, h: c.height } }; });
  check(Math.abs(boxes.b.x - boxes.c.x) < 1.5 && Math.abs(boxes.b.y - boxes.c.y) < 1.5 && Math.abs(boxes.b.w - boxes.c.w) < 1.5 && Math.abs(boxes.b.h - boxes.c.h) < 1.5, `the divider's box is the sheet's box (${Math.round(boxes.c.x)},${Math.round(boxes.c.y)} ${Math.round(boxes.c.w)}×${Math.round(boxes.c.h)})`);
  check(await page.evaluate(() => !!document.querySelector('.sheetinfo__controls') && document.querySelector('.sheetinfo__btn[aria-pressed="true"]')?.textContent === 'Сравнить'), 'pair: «До · Сравнить · После» present, «Сравнить» pressed');
  const closeBox = await page.locator('.sheetclose').boundingBox();
  const cmp = await page.locator('.sheetcompare').boundingBox();
  check(closeBox.x >= cmp.x + cmp.width || closeBox.y + closeBox.height <= cmp.y, 'the «×» stays clear of the divider surface');
  await page.screenshot({ path: `${OUT}/r2-open-pair.png` });

  // 5 · pointer: drag the surface, the divider follows the hand; the scene follows the divider
  await page.mouse.move(cmp.x + cmp.width * 0.5, cmp.y + cmp.height * 0.56);
  await page.mouse.down();
  await page.mouse.move(cmp.x + cmp.width * 0.25, cmp.y + cmp.height * 0.56, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
  s = await slider(page);
  check(s.now === 25 && Math.abs((await split(page)) - 0.25) < 0.01, `drag to a quarter → aria-valuenow ${s.now}, scene split ${(await split(page)).toFixed(2)}`);
  check((await page.evaluate(() => document.querySelector('.sheetinfo__btn[aria-pressed="true"]')?.textContent)) === 'Сравнить', 'a divider between the two frames is «Сравнить»');
  // the surface drag starts anywhere on the sheet, not only on the ring
  await page.mouse.move(cmp.x + cmp.width * 0.8, cmp.y + cmp.height * 0.2);
  await page.mouse.down(); await page.mouse.move(cmp.x + cmp.width * 0.7, cmp.y + cmp.height * 0.2, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(200);
  check((await slider(page)).now === 70, `press anywhere on the sheet and drag → ${(await slider(page)).now}`);
  await page.screenshot({ path: `${OUT}/r3-dragged.png` });

  // 6 · keyboard
  await page.focus('[role=slider]');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(80);
  check((await slider(page)).now === 68, `ArrowLeft steps 2 % → ${(await slider(page)).now}`);
  await page.keyboard.press('Shift+ArrowRight'); await page.waitForTimeout(80);
  check((await slider(page)).now === 78, `Shift+ArrowRight steps 10 % → ${(await slider(page)).now}`);
  await page.keyboard.press('Home'); await page.waitForTimeout(80);
  check((await slider(page)).now === 0 && (await page.evaluate(() => document.querySelector('.sheetinfo__btn[aria-pressed="true"]')?.textContent)) === 'После', 'Home → 0, «После» pressed');
  await page.keyboard.press('End'); await page.waitForTimeout(320);
  check((await slider(page)).now === 100 && (await page.evaluate(() => document.querySelector('.sheetinfo__btn[aria-pressed="true"]')?.textContent)) === 'До', 'End → 100, «До» pressed');
  check(await page.evaluate(() => getComputedStyle(document.querySelector('.compare__tag--after')).opacity === '0' && getComputedStyle(document.querySelector('.compare__tag--before')).opacity === '1'), 'at the far right the «после» label steps aside');
  // the named positions travel the divider
  await page.click('.sheetinfo__btn >> nth=1'); await page.waitForTimeout(700);
  check((await slider(page)).now === 50, `«Сравнить» → ${(await slider(page)).now}`);

  // 7 · the scene cuts, it does not mix: left of the divider is the «до» frame, right is the «после» frame
  const clip = { x: Math.round(cmp.x + 4), y: Math.round(cmp.y + cmp.height * 0.1), width: Math.round(cmp.width - 8), height: Math.round(cmp.height * 0.7) };
  await page.click('.sheetinfo__btn >> nth=0'); await page.waitForTimeout(800);
  const B = await decode(page, await page.screenshot({ clip }));
  await page.click('.sheetinfo__btn >> nth=2'); await page.waitForTimeout(800);
  const A = await decode(page, await page.screenshot({ clip }));
  await page.click('.sheetinfo__btn >> nth=1'); await page.waitForTimeout(800);
  const M = await decode(page, await page.screenshot({ clip }));
  const half = Math.round(A.w / 2);
  const dBA = meanAbsDiff(A, B, 0, A.w);
  const leftIsBefore = meanAbsDiff(M, B, 0, half - 6), leftIsAfter = meanAbsDiff(M, A, 0, half - 6);
  const rightIsAfter = meanAbsDiff(M, A, half + 6, A.w), rightIsBefore = meanAbsDiff(M, B, half + 6, A.w);
  check(dBA > 4, `«до» and «после» are different photographs (mean |Δ| ${dBA.toFixed(1)})`);
  check(leftIsBefore < 1.5 && leftIsBefore < leftIsAfter / 3, `left of the divider is the «до» frame (|Δ| ${leftIsBefore.toFixed(2)} vs ${leftIsAfter.toFixed(2)} against «после»)`);
  check(rightIsAfter < 1.5 && rightIsAfter < rightIsBefore / 3, `right of the divider is the «после» frame (|Δ| ${rightIsAfter.toFixed(2)} vs ${rightIsBefore.toFixed(2)} against «до»)`);

  // 8 · close and reopen: the archive comes back, the divider starts in the middle again
  // (End on the slider is the slider's — it prevents the page's own «scroll to the end»)
  await page.focus('[role=slider]');
  await page.keyboard.press('End'); await page.waitForTimeout(150);
  check((await page.evaluate(() => window.scrollY)) < 2000 && (await hud(page)).includes('focus 1'), 'End on the slider does not scroll the page away');
  await page.click('.sheetclose'); await page.waitForTimeout(1500);
  check((await hud(page)).includes('focus —') && (await page.evaluate(() => !document.querySelector('.browse[data-hidden]') && !document.querySelector('.sheetcompare'))), '«×» closes the pair: browse block back, divider gone');
  await page.click(`.rail button >> nth=${pairK}`); await page.waitForTimeout(1900);
  check((await slider(page)).now === 50, 'reopened: the divider is back in the middle');
  await page.click('.sheetinfo__back'); await page.waitForTimeout(1500);
  check((await hud(page)).includes('focus —'), '«Назад в архив» closes it');
  // leaving the section while open still closes the case
  await page.click(`.rail button >> nth=${pairK}`); await page.waitForTimeout(1600);
  for (let i = 0; i < 60; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(16); }
  await page.waitForTimeout(1600);
  check((await hud(page)).includes('focus —') && (await page.evaluate(() => document.querySelector('#cases').getBoundingClientRect().bottom < 0)), 'open, then scroll on → the case closes and the page is not trapped');
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await ctx.close();
}

console.log('phone 390 × 844 · touch');
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await gotoCases(page);
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check((await overflow()) <= 0, `no horizontal overflow while browsing (${await overflow()} px)`);
  const media = await page.evaluate(() => window.__media);
  const pairK = media.findIndex((m) => m.type === 'beforeAfter');
  await page.tap(`.rail button >> nth=${pairK}`); await page.waitForTimeout(1900);
  const s0 = await slider(page);
  check(s0 && s0.now === 50, 'the pair opens with the divider in the middle');
  const cb = await page.locator('.sheetcompare').boundingBox();
  const closeBox = await page.locator('.sheetclose').boundingBox();
  check(closeBox.y + closeBox.height <= cb.y + 1 && closeBox.width >= 44, `the «×» sits above the sheet, 44 px (${Math.round(closeBox.x)},${Math.round(closeBox.y)})`);
  const ring = await page.locator('.compare__handle').boundingBox();
  check(ring.width >= 44 && ring.height >= 44, `the ring's touch target is ${ring.width} × ${ring.height}`);
  const cdp = await page.context().newCDPSession(page);
  const hy = cb.y + cb.height * 0.56;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cb.x + cb.width * 0.5, y: hy }] });
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cb.x + cb.width * (0.5 + 0.03 * i), y: hy }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(250);
  check((await slider(page)).now === 80 && Math.abs((await split(page)) - 0.8) < 0.01, `touch drag → ${(await slider(page)).now}, scene split ${(await split(page)).toFixed(2)}`);
  await page.screenshot({ path: `${OUT}/r4-phone-open.png` });
  const y0 = await page.evaluate(() => window.scrollY);
  await cdp.send('Input.synthesizeScrollGesture', { x: cb.x + cb.width * 0.3, y: cb.y + cb.height * 0.3, yDistance: -400, speed: 800, gestureSourceType: 'touch' });
  await page.waitForTimeout(900);
  check((await page.evaluate(() => window.scrollY)) > y0 + 200, `a vertical swipe on the sheet still scrolls the page (${y0} → ${await page.evaluate(() => window.scrollY)})`);
  check((await overflow()) <= 0, `no horizontal overflow with a case open (${await overflow()} px)`);
  await page.tap('.sheetinfo__back'); await page.waitForTimeout(1500);
  check((await hud(page)).includes('focus —'), '«Назад в архив» closes it on the phone');
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await m.close();
}
await browser.close();
console.log(failures ? `\n${failures} FAILED` : '\nall passed');
process.exit(failures ? 1 : 0);
