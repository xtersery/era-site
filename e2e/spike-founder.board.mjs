// Builds the Spike D pass-19 / Spike F pass-7 review board: the passage from
// the water's light into the hero's onyx and the founder's room opening on
// it. Captures its own stills from the dev server (standalone portraits page,
// `?k=3&e=` for the passage, `?o=` for the room), embeds them as JPEG and
// writes one self-contained HTML. Dev server must be up.
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const CAP = 'spikes/founder/__captures__';
const OUT = 'docs/spikes/boards/founder-room.html';
mkdirSync(CAP, { recursive: true });
const base = 'http://localhost:5173/spikes/portraits/';
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-gl=angle', '--ignore-gpu-blocklist'] });

const shots = [];
const shot = async (ctx, url, name, opts = {}) => {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(opts.wait ?? 1100);
  const buf = await page.screenshot({ path: `${CAP}/${name}.png`, fullPage: !!opts.full });
  await page.close();
  shots.push(name);
  return buf;
};
const jpeg = async (page, buf, maxW = 1600, q = 0.84) =>
  page.evaluate(async ({ src, maxW, q }) => {
    const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const s = Math.min(1, maxW / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  }, { src: 'data:image/png;base64,' + buf.toString('base64'), maxW, q });

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const short = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 }, deviceScaleFactor: 2, hasTouch: true });
const conv = await desktop.newPage();

// the passage: e over EXIT + OPEN; t = e × 240 / 130
const passage = [
  [0.0, '05.4 at rest — the glints on the boundary, never on her face'],
  [0.16, 't 0.30 — the picture recedes; the light spreads over the view'],
  [0.28, 't 0.52 — the network over the whole wall, still moving'],
  [0.34, 't 0.63 — the cells still and gild: the light mineralises'],
  [0.4, 't 0.74 — threads of gold along the 35° flow; the stone rising inside them, veins first'],
  [0.46, 't 0.85 — the marble has risen; the gilt threads settle into its veins'],
  [0.54, 't 1.00 — the wall: the approved marble, as the founder\'s room lays it'],
];
const P = [];
for (const [e, cap] of passage) P.push([cap, await jpeg(conv, await shot(desktop, `${base}?k=3&f=0&e=${e}&diag=0`, `passage-e${e}`))]);

const opening = [
  [0.05, 'o 0.05 — Специалисты has let go of the wall; the same sheet'],
  [0.22, 'o 0.22 — she comes out of the stone along the veins\' flow'],
  [0.4, 'o 0.40 — she is here; the plate is set on the wall, the label and the name on it'],
  [0.58, 'o 0.58 — the name, the role, the statement'],
  [0.78, 'o 0.78 — the paragraphs'],
  [1, 'o 1.00 — the room at rest: facts, CTA'],
];
const O = [];
for (const [o, cap] of opening) O.push([cap, await jpeg(conv, await shot(desktop, `${base}?o=${o}`, `opening-o${o}`, { wait: 700 }))]);

const R = [
  ['1440 × 900', await jpeg(conv, await shot(desktop, `${base}?o=1`, 'room-1440', { wait: 700 }))],
  ['1280 × 720 — the short-viewport rule: the name on one line, the read denser', await jpeg(conv, await shot(short, `${base}?o=1`, 'room-1280', { wait: 700 }))],
];
const M = [
  ['390 — the first viewport: label, name, role, statement; she at its foot', await jpeg(conv, await shot(phone, `${base}?o=1`, 'room-390', { wait: 700 }), 900)],
  ['390 — the whole room: the read continues on the wall below her', await jpeg(conv, await shot(phone, `${base}?o=1`, 'room-390-full', { wait: 700, full: true }), 900)],
  ['768 × 1024', await jpeg(conv, await shot(tablet, `${base}?o=1`, 'room-768', { wait: 700 }), 1000)],
];

// Founder → Reviews: the window (from the flow page) and the room alone
const flow = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const fpg = await flow.newPage();
await fpg.goto('http://localhost:5173/spikes/flow/', { waitUntil: 'networkidle' });
await fpg.waitForTimeout(1500);
const w0 = await fpg.evaluate(() => { const sp = document.querySelector('#founder').closest('.pin-spacer'); return sp.getBoundingClientRect().bottom + scrollY - innerHeight; });
const W = [];
for (const [f, cap] of [[0.2, '+0.2 vh — the marble\'s foot in shadow, the line one tone'], [0.5, '+0.5 vh — the forest rising into the leaving marble'], [0.8, '+0.8 vh — the head of Отзывы, the shadow settling into the ground']]) {
  await fpg.evaluate((y) => { window.__lenis?.scrollTo?.(y, { immediate: true, force: true }); scrollTo(0, y); }, w0 + 900 * f);
  await fpg.waitForTimeout(700);
  const buf = await fpg.screenshot({ path: `${CAP}/window-${f}.png` });
  shots.push(`window-${f}`);
  W.push([cap, await jpeg(conv, buf)]);
}
await flow.close();
const rvBase = 'http://localhost:5173/spikes/reviews/';
const RV = [
  ['1440 — the featured voice and the index of the other four', await jpeg(conv, await shot(desktop, rvBase, 'reviews-1440', { wait: 900 }))],
];
{
  const pg = await desktop.newPage();
  await pg.goto(rvBase, { waitUntil: 'networkidle' }); await pg.waitForTimeout(800);
  await pg.click('.rv__tab:nth-child(4)'); await pg.waitForTimeout(800);
  RV.push(['1440 — 04 chosen: the words crossfade, the champagne line moves', await jpeg(conv, await pg.screenshot({ path: `${CAP}/reviews-1440-04.png` }))]);
  await pg.close();
}
const RVM = [
  ['390 — one voice, 01–05 to turn the page, a swipe', await jpeg(conv, await shot(phone, rvBase, 'reviews-390', { wait: 800, full: true }), 900)],
  ['1024 — the voice, a compact selector under it', await jpeg(conv, await shot(tablet, rvBase, 'reviews-768', { wait: 800 }), 1000)],
];

const fig = (cap, src, cls = '') => `<figure class="frame ${cls}"><img src="${src}" alt="" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Founder's room</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Prata&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
:root{--bg:#ece8df;--ink:#0d0c0b;--mute:#6a6259;--gold:#b58f47;--line:#d6d0c3}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 Inter,system-ui,sans-serif;padding:0 clamp(16px,4vw,56px) 96px}
.wrap{max-width:1560px;margin:0 auto}
header{padding:64px 0 40px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:1fr auto;gap:28px;align-items:end}
.eyebrow{font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}
h1{font:400 clamp(30px,4vw,54px)/1.02 Prata,Georgia,serif;margin:14px 0 12px;letter-spacing:-.015em;text-wrap:balance}
h1 small{display:block;font-size:.48em;color:var(--mute);margin-top:12px;line-height:1.3}
.lede{max-width:72ch;color:var(--mute);margin:0}
.spike{border:1px solid var(--gold);padding:16px 20px;font:14px/1.5 Inter,sans-serif;max-width:360px}
.spike b{display:block;font:500 11px/1 JetBrains Mono,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
.spike code{font-size:12px;word-break:break-all}
section{padding:42px 0 8px;border-bottom:1px solid var(--line)}
h2{font:400 clamp(22px,2.4vw,32px)/1.15 Prata,Georgia,serif;margin:0 0 6px}
.sub{color:var(--mute);margin:0 0 22px;max-width:78ch}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:22px 20px}
.grid.two{grid-template-columns:repeat(auto-fill,minmax(620px,1fr))}
.grid.phones{grid-template-columns:repeat(auto-fill,minmax(260px,1fr));align-items:start}
.frame{margin:0}
.frame img{display:block;width:100%;height:auto;border:1px solid var(--line)}
figcaption{font:12.5px/1.45 JetBrains Mono,monospace;color:var(--mute);margin-top:8px}
table{border-collapse:collapse;font:13px/1.5 JetBrains Mono,monospace;width:100%;max-width:1100px}
td,th{text-align:left;vertical-align:top;padding:8px 14px 8px 0;border-bottom:1px solid var(--line)}
th{font-weight:500;color:var(--mute);white-space:nowrap}
.note{max-width:78ch;margin:14px 0 0;color:var(--mute)}
</style></head><body><div class="wrap">
<header><div><p class="eyebrow">Spike D · pass 19c — Spike F · pass 8 — 18.09.2026</p>
<h1>Вода → мрамор → Основатель<small>The water's light mineralises into the clinic's approved marble, and the founder's room opens on that wall — one continuous pin, one soft finish.</small></h1>
<p class="lede">Water is light on the boundary; as the visitor scrolls it stills, its threads turn gold and become pigment in the stone, the marble rises inside them; then Специалисты lets go of the wall and 06 — Основатель is set on it: the light, her, the label, the name, the statement, the read, the CTA. Pass 19b: the wall is the approved marble again (docs/references/wallpapers.png at native scale, as in pass 18 and Spike E). Pass 19c: nothing lies over the marble any more — the words are read on one charcoal plate (rgba 9/12/11 · 0.5, 6 px backdrop blur), white; the CTA is deep green with a gold edge; a short dark band under the page's header.</p></div>
<div class="spike"><b>Live · files</b>flow: <code>https://claude.ai/artifact/9Y6Kgcw3ur4B2VppFaLE7g</code> (v7)<br>room: <code>spikes/founder/</code> · passage: <code>spikes/portraits/scene/glints.frag</code>, <code>WaterScene.tsx</code> · scroll: <code>spikes/portraits/PortraitsSpike.tsx</code> · proof 265/265 <code>e2e/spike-flow.handoff.mjs</code></div></header>

<section><h2>1 · The passage — the light becomes the material</h2><p class="sub">Standalone captures at 1440 × 900 (<code>?k=3&e=</code>). Everything is continuous in t; the visitor scrolls, and past 22 % of the water stage the page carries the scene to the opened room itself.</p>
<div class="grid">${P.map(([c, s]) => fig(c, s)).join('')}</div></section>

<section><h2>2 · The opening — the room settles on the wall</h2><p class="sub">Основатель stands under the last frame of Специалисты and is pinned for the same 110 vh; over its first beat the specialists' room lets go (opacity), then the beats stage the composition. Captured at 1440 × 900 (<code>?o=</code>).</p>
<div class="grid">${O.map(([c, s]) => fig(c, s)).join('')}</div></section>

<section><h2>3 · The room at rest</h2><p class="sub">The sheet on the viewport's width, its top 195 px down (pass 18's placement). She is the hero-stone cutout, a labelled stand-in; the paragraphs are proposed copy in her voice, named «пример» in the mono line.</p>
<div class="grid two">${R.map(([c, s]) => fig(c, s)).join('')}</div>
<div class="grid phones" style="margin-top:22px">${M.map(([c, s]) => fig(c, s)).join('')}</div></section>

<section><h2>4 · Основатель → Отзывы — ordinary scroll, and the room of voices</h2><p class="sub">No pin: the founder's room leaves over its own viewport and the forest rises into its foot — the marble, its shadow, the deep green — on within the first frames of the release and reaching 12 → 72 svh up the leaving section (<code>BLEND3</code>, FlowSpike.tsx). Отзывы: one voice set large as a page, the other four as an index at the right edge; rating as calibration ticks + the number; date; the platform named; initials, never a generated face. Data from <code>src/lib/reviews</code> (provider + the five-recent-high rule); the records are samples and the room says so.</p>
<div class="grid">${W.map(([c, s]) => fig(c, s)).join('')}</div>
<div class="grid two" style="margin-top:22px">${RV.map(([c, s]) => fig(c, s)).join('')}</div>
<div class="grid phones" style="margin-top:22px">${RVM.map(([c, s]) => fig(c, s)).join('')}</div></section>

<section><h2>5 · The parameters</h2>
<table>
<tr><th>Water stage length</th><td><code>EXIT = 130</code> vh — PortraitsSpike.tsx</td></tr>
<tr><th>Moment of mineralisation</th><td><code>draw = seg(T, 0.5, 0.8)</code>, <code>still = seg(T, 0.48, 0.84)</code>; the stone rises <code>rise = seg(T, 0.58, 0.92)</code>, its colour <code>tone 0.74–0.97</code>, the gilt threads settle <code>settle 0.8–0.97</code> — glints.frag</td></tr>
<tr><th>Soft pick-up</th><td><code>AUTO_FINISH = 0.22</code> of EXIT forward · <code>AUTO_RETURN = 0.5</code> of OPEN backward · <code>FINISH = { min 1.6, max 3.4 } s</code>, power2.inOut — PortraitsSpike.tsx (the pin's snap)</td></tr>
<tr><th>The room's opening length</th><td><code>OPEN = 110</code> vh — Founder.tsx (the specialists' pin spans it too)</td></tr>
<tr><th>Portrait's appearance</th><td><code>BEATS.portrait = [0.08, 0.5]</code> of OPEN; the wipe direction and feather in <code>.founder__portrait</code> mask (145°, 35 % feather) — founder.css</td></tr>
<tr><th>Text staging</th><td><code>BEATS</code>: plate 0.24–0.4 (and the band under the header) · label 0.3–0.42 · name 0.38–0.58 · role 0.5–0.62 · thesis 0.54–0.72 · body 0.64–0.84 · facts 0.74–0.9 · cta 0.8–0.94 — Founder.tsx</td></tr>
<tr><th>The hand-over</th><td><code>BEATS.hand = [0, 0.06]</code> → <code>--hand</code> → <code>.sitting { opacity }</code></td></tr>
<tr><th>Основатель → Отзывы</th><td><code>BLEND3 = { on 0–0.06, reach 0.06–0.85: 12 → 72 svh }</code> of the 100 vh window — FlowSpike.tsx; the veil <code>.flow-veil--founder</code> in flow.css; the head of Отзывы <code>#0f1f19 → #08140f</code> over 60 svh</td></tr>
<tr><th>Reviews — data</th><td><code>src/lib/reviews/</code>: <code>types.ts</code> (Review, ReviewsProvider) · <code>select.ts</code> (five-star newest first, fill with four-star, take 5) · <code>providers.ts</code> (local samples; yandex / 2gis reserved for official channels — no scraping) · <code>getReviews()</code></td></tr>
<tr><th>The wall</th><td><code>WALL = { aspect 1882/836, width 1 (phone 2), top 195/836 }</code> — Founder.tsx; the same in <code>.founder__wall</code>, <code>.sitting__marble</code>, <code>uSheet</code></td></tr>
</table>
<p class="note">Open for review: the founder's real portrait (a different woman, in this light, on this wall) and her text;  whether the upward return should rest at the opened room for longer than half the opening.</p></section>
</div></body></html>`;
writeFileSync(OUT, html);
console.log(OUT, Math.round(html.length / 1024), 'KB ·', shots.length, 'captures');
await browser.close();
