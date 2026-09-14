// Builds the Spike C pass-7b review board (self-contained HTML, captures embedded as JPEG).
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const CAP = 'spikes/gallery/__captures__';
const OUT = 'docs/spikes/boards/cases-ribbon-turn.html';
const boxes = JSON.parse(readFileSync(`${CAP}/boxes.json`, 'utf8'));
const perf = JSON.parse(readFileSync(`${CAP}/perf.json`, 'utf8'));

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const jpeg = async (file, maxW = 1600, q = 0.82) =>
  page.evaluate(async ({ src, maxW, q }) => {
    const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const s = Math.min(1, maxW / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  }, { src: 'data:image/png;base64,' + readFileSync(file).toString('base64'), maxW, q });
const img = async (name, alt, maxW) => `<img src="${await jpeg(`${CAP}/${name}.png`, maxW)}" alt="${alt}" loading="lazy">`;

/** the annotated figure: the sheets' real projected boxes over the still */
const annotated = async (name, vw, vh, near) => {
  const src = await jpeg(`${CAP}/${name}.png`, 1600);
  const rects = boxes[name].filter((b) => b.w > 12).map((b) => {
    const isNear = b.k === near;
    return `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="none" stroke="${isNear ? '#d3b478' : '#7fb0a4'}" stroke-width="${isNear ? 3 : 1.5}" stroke-dasharray="${isNear ? '' : '8 6'}"/>
<text x="${b.x + 10}" y="${b.y + (b.y < 20 ? 40 : 26)}" font-family="JetBrains Mono,monospace" font-size="15" fill="${isNear ? '#f7e4b1' : '#a9d1c8'}">04.${b.k + 1} · ${Math.round((b.w / vw) * 100)} % · ${b.dist}</text>`;
  }).join('\n');
  return `<svg viewBox="0 0 ${vw} ${vh}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Схема расстановки: активный кейс и соседи"><image href="${src}" width="${vw}" height="${vh}"/>${rects}</svg>`;
};

const fig = (n, what, when, inner) => `<figure class="frame">${inner}<figcaption><span class="n">${n}</span><span class="what">${what}</span><span class="when">${when}</span></figcaption></figure>`;
const mid = boxes['d2-browse-mid'];
const inFrame = mid.filter((b) => b.x < 1440 && b.x + Math.abs(b.w) > 0 && b.y + b.h > 0).length;
const dock = mid.find((b) => b.k === 3);
const dists = mid.map((b) => b.dist);
const d = perf.desktop, p = perf.phone;

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Archive Turn</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Prata&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
:root{--bg:#050d0a;--ink:#eae6dc;--mute:#94a09a;--gold:#d3b478;--gold-l:#f7e4b1;--line:#16241d;--pass:#7fb0a4;--fail:#c8836a}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 Inter,system-ui,sans-serif;padding-block:0 96px;padding-inline:clamp(16px,4vw,56px)}
.wrap{max-width:1560px;margin:0 auto}
header{padding:64px 0 40px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:1fr auto;gap:28px;align-items:end}
.eyebrow{font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}
h1{font:400 clamp(30px,4vw,54px)/1.02 Prata,Georgia,serif;margin:14px 0 12px;letter-spacing:-.01em;text-wrap:balance}
h1 small{display:block;font-size:.48em;color:var(--mute);margin-top:12px;line-height:1.3}
.lede{max-width:70ch;color:var(--mute);margin:0}
.spike{border:1px solid var(--gold);padding:16px 20px;font:14px/1.5 Inter,sans-serif;max-width:330px}
.spike b{display:block;font:500 11px/1 JetBrains Mono,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
.spike code{color:var(--gold-l);font-size:12px;word-break:break-all}
section{padding:42px 0 8px;border-bottom:1px solid var(--line)}
h2{font:400 clamp(22px,2.4vw,32px)/1.15 Prata,Georgia,serif;margin:0 0 6px}
.sub{color:var(--mute);margin:0 0 22px;max-width:78ch}
.frame{margin:0 0 30px}
.frame img,.frame svg{display:block;width:100%;height:auto;background:#000;outline:1px solid var(--line)}
.frame figcaption{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:baseline;padding:12px 0 0;font:13px/1.45 JetBrains Mono,monospace;color:var(--mute)}
.frame .n{color:var(--gold)}
.frame .when{text-align:right;white-space:nowrap}
.two{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.phones{display:grid;grid-template-columns:repeat(3,minmax(0,330px));gap:22px}
@media(max-width:900px){.two,.phones{grid-template-columns:1fr}header{grid-template-columns:1fr}}
table{width:100%;border-collapse:collapse;font:14px/1.5 Inter,sans-serif;margin:8px 0 26px}
th,td{text-align:left;vertical-align:top;padding:10px 12px 10px 0;border-bottom:1px solid var(--line)}
th{font:500 11px/1.4 JetBrains Mono,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
td.k{font:500 13px/1.5 JetBrains Mono,monospace;color:var(--gold-l);white-space:nowrap}
.pass{color:var(--pass);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
.open{color:var(--gold);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
ul{padding-left:1.2em;color:var(--mute);max-width:80ch}li{margin:6px 0}li b{color:var(--ink);font-weight:500}
.mono{font:13px/1.6 JetBrains Mono,monospace;color:var(--mute)}
</style></head>
<body><div class="wrap">
<header><div><div class="eyebrow">ЭРА · Spike C · pass 7b–7c · геометрия спирали · открытый кейс</div>
<h1>The archive, as one turn<small>Направление то же — архив на рейке. Исправлена только геометрия: спираль стала тесной и читаемой, кейсы — ближе, глубина — ограничена.</small></h1>
<p class="lede">Three faults were named in the previous staging: the sheets drifted too far into the fog, the spiral read as a loose diagonal, and the composition was sparse. All three had one cause — the visitor stood outside a <b>wide</b> ring (radius 7.5, 20° between cases), so only ~60° of the helix was ever in frame, and that is a diagonal, not a turn. The fix is geometric, not a matter of scale: a tight ring of eight cases making one full turn, and a visitor who stands a little above it and looks down into the turn.</p></div>
<div class="spike"><b>The working spike</b><code>docs/spikes/boards/cases-ribbon-spike.html</code> · or <code>npm run dev</code> → <code>/spikes/gallery/</code></div></header>

<section><h2>1 · Browse — the ring in frame</h2>
<p class="sub">The docked case frontal and lit, right of centre; the next and the previous turned away on either side, one step lower and one step higher; the cases after them edge-on at the ring's extremes; and the far side of the turn showing through as dark mineral slates — the backs of plates, never a mirrored face. The rail steps level across each sheet and descends between them, so the helix is drawn as a line as well as a body. ${inFrame} of the 8 sheets are in the frame at any position; the nearest is ${dock.dist} units away, the farthest drawn ${Math.max(...dists)} — a ${(Math.max(...dists) / dock.dist).toFixed(1)}× spread, where the previous staging ran to 2.4× and beyond.</p>
${fig('1a', 'At 04.4 — the turn. Sheets in the frame: 04.3 and 04.5 turned away either side of the docked case, 04.2 and 04.6 edge-on, the backs of 04.1 and 04.7 across the ring.', '1440 × 900', await img('d2-browse-mid', 'Архив на кейсе 04.4'))}
${fig('1b', 'One scroll step, 04.3 → 04.4, in four frames: the ring rotates past the visitor. The case coming next arrives from the left and turns to face her; the one she leaves turns away to the right.', 'pos 2 · 2.33 · 2.66 · 3', await img('d7-turn', 'Поворот архива при прокрутке', 1600))}
<div class="two">
${fig('1c', 'The head of the archive: 04.1 docked, the turn continuing behind it.', 'scroll 0', await img('d1-browse-head', 'Начало архива', 1100))}
${fig('1d', 'The tail: 04.8 docked, the archive it came out of behind it.', 'scroll end', await img('d2t-browse-tail', 'Конец архива', 1100))}
</div></section>

<section><h2>2 · The spiral geometry — what changed</h2>
<p class="sub">Every number below is in scene units; the sheet is 2.4 × 3.0. Nothing is scaled to make the hierarchy: a neighbour is 0.94 of the docked sheet, and the rest is distance and angle.</p>
<table><tr><th></th><th>pass 7 (diagonal)</th><th>pass 7b (turn)</th><th>why</th></tr>
<tr><td class="k">helix radius</td><td>7.5</td><td><b>3.6</b></td><td>a sheet now wraps 38° of the ring — its curvature is visible, and the ring fits the frame</td></tr>
<tr><td class="k">angle between cases</td><td>20°</td><td><b>44°</b></td><td>8 cases ≈ one full turn (352°); the archive is literally one turn of the spiral</td></tr>
<tr><td class="k">drop per case</td><td>1.5</td><td><b>0.8</b></td><td>a turn descends 6.4 — the stair is visible, not a cliff</td></tr>
<tr><td class="k">where the visitor stands</td><td>5.2 outside, at eye height</td><td><b>8.6 outside, 1.6 above, looking 0.5 down</b></td><td>further back with a longer lens (fov 46° → <b>30°</b>): the ring is seen as a ring, not as perspective; from above, the far side shows over the dock</td></tr>
<tr><td class="k">depth spread in frame</td><td>1.1–2.4× the dock distance, and on into fog</td><td><b>1.15–1.9×</b>, clamped</td><td>fog is a linear ramp over 9 units to a ceiling of 60 %; dim is capped at 0.62; a case three steps away is still a case</td></tr>
<tr><td class="k">the far side</td><td>not in frame</td><td><b>dark slates</b></td><td>back faces render as mineral glass without the image — a body, never a mirrored face</td></tr>
<tr><td class="k">docked sheet on screen</td><td>33 % wide · 68 % tall</td><td><b>${Math.round((dock.w / 1440) * 100)} % · ${Math.round((dock.h / 900) * 100)} %</b></td><td>unchanged dominance; its neighbours are now ${Math.round((mid.find((b) => b.k === 4).w / dock.w) * 100)} % of its width instead of 60 %</td></tr>
<tr><td class="k">sheets in frame</td><td>4</td><td><b>${inFrame}</b></td><td>the composition is filled by the turn, not by more cards</td></tr></table>
${fig('2a', 'The real projected boxes, read from the running scene: the docked case, its two turned neighbours, the edge-on pair, the backs across the ring. Negative widths are back faces.', 'measured', await annotated('d2-browse-mid', 1440, 900, 3))}
</section>

<section><h2>3 · Transition — out of the turn, and the turn leaves</h2>
<p class="sub">The chosen sheet leaves the ring, travels in camera space (so it comes toward the visitor monotonically) and unrolls flat. As it arrives the archive leaves the composition: every other sheet and the rail fade to 3 % between 25 % and 80 % of the travel, and are back before the sheet has re-wrapped on the return. The open case is its own scene, not a card over the turn. Measured per animation frame at 60 fps: largest move 11 / 12 px (open / return) on desktop, 7 / 9 px on the phone, largest unfold step 0.049, monotonic — an eased travel, no cut.</p>
${fig('3a', 'The unfold in six frames: the ring is gone by the fourth.', 'u = 0 · 0.2 · 0.38 · 0.56 · 0.76 · 1', await img('d6-unfold', 'Раскрытие листа в шесть кадров', 1600))}
</section>

<section><h2>4 · Opened case — an isolated editorial scene</h2>
<p class="sub">Only the active case, its words, and one way out. The «×» hangs at the sheet's top-right corner (44 px, gold hairline, fills on hover) and is the primary close; «← Назад в архив» stays as the secondary editorial control; Escape works. On return the page is put back to the exact scroll position the case was opened from — the section is pinned, so nothing visible moves — and the archive reappears where the visitor left it: measured, pos 2.63 before, 2.63 after, with 300 px of scrolling in between; the same when a neighbour was opened directly.</p>
<div class="two">
${fig('4a', 'The open scene: the sheet at 63 % of the frame, the editorial block beside it, the close at its corner — no archive behind.', 'после', await img('d3-open', 'Открытый кейс', 1100))}
${fig('4b', '«Сравнить»: the pointer opens the earlier state as a soft field, mixed by opacity only.', 'курсор', await img('d5-open-compare', 'Сравнение до и после', 1100))}
</div></section>

<section><h2>5 · The phone — a column of the turn</h2>
<p class="sub">The frame cannot hold the ring, so it holds a column of it: the same 44° step on a radius of 3.2, a steeper drop (1.6), the visitor 8.4 out and 0.8 above. The docked case centred at 66 % width; the next case turned away at the left edge, the previous at the right.</p>
<div class="phones">
${fig('5a', 'Browsing at 04.3.', '390 × 844', await img('m1-browse', 'Архив на телефоне', 780))}
${fig('5b', 'Open — the sheet above the words, the close above its corner, no archive.', 'после', await img('m2-open', 'Открытый кейс на телефоне', 780))}
${fig('5c', 'The unfold.', 'u = 0 · 0.35 · 0.65 · 1', await img('m4-unfold', 'Раскрытие на телефоне', 780))}
</div></section>

<section><h2>6 · Verdict</h2>
<table><tr><th>asked</th><th>evidence</th><th></th></tr>
<tr><td class="k">cases closer, depth spread reduced, recession clamped</td><td>nearest ${dock.dist}, farthest drawn ${Math.max(...dists)} (${(Math.max(...dists) / dock.dist).toFixed(1)}×); fog ceiling 60 %, dim cap 0.62; neighbours ${Math.round((mid.find((b) => b.k === 4).w / dock.w) * 100)} % of the dock's width</td><td class="pass">PASS</td></tr>
<tr><td class="k">the spiral reads at first glance</td><td>radius 3.6, 44°, one full turn; sheet curvature visible; rail helix; the far side present as slates; the turn sequence 1b</td><td class="pass">PASS — judge on 1a / 1b</td></tr>
<tr><td class="k">composition tighter, not sparse</td><td>${inFrame} sheets in frame, the ring fills the right two thirds; no arbitrary scaling (neighbour 0.94)</td><td class="pass">PASS</td></tr>
<tr><td class="k">selected case comes forward naturally</td><td>per-frame max 12 px, monotonic, 0 % over 33 ms, both viewports</td><td class="pass">PASS</td></tr>
<tr><td class="k">open case isolated · «×» · same position on return</td><td>archive and rail at 3 % while open (4a); «×» at the sheet's corner; pos 2.63 → 2.63 and scrollY restored after 300 px of scrolling while open; honesty best at zero shift (${perf.honesty.perShift['0,0']} vs ${perf.honesty.perShift['1,0']} at 1 px)</td><td class="pass">PASS</td></tr>
<tr><td class="k">cost</td><td>${d.browse.medianMs} ms median, ${d.browse.drawCalls} draw calls, ${d.heapMB} MB heap on 1440 × 900 (real Chrome); ${p.browse.drawCalls} draw calls on the emulated phone</td><td class="pass">PASS</td></tr>
<tr><td class="k">real phone GPU</td><td>still emulated</td><td class="open">OPEN</td></tr></table>
<ul>
<li><b>Carried over unchanged from pass 7:</b> DOM grips (canvas takes no pointer), hover lift and lit edge, the docked sheet's own label, the rail with landings, the scroll catch-up on return, close on leaving the section, the reduced-motion still, the eight spike-only placeholder cases.</li>
<li><b>Trade-off made:</b> from just outside a tight ring the ±2 cases are inevitably edge-on and the far side shows its backs — that is what a ring looks like from outside. The backs are treated as mineral slates so they build the body rather than clutter it.</li>
</ul></section>
</div></body></html>`;
writeFileSync(OUT, html);
await browser.close();
console.log(OUT, Math.round(html.length / 1024), 'KB');
