// Builds the Spike C pass-7 review board (self-contained HTML, captures embedded as JPEG).
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const CAP = 'spikes/gallery/__captures__';
const OUT = 'docs/spikes/boards/cases-ribbon-refined.html';
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
const inFrame = mid.filter((b) => b.w > 30 && b.x < 1440 && b.x + b.w > 0).length;
const d = perf.desktop, p = perf.phone;

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Archive Refined</title>
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
.three{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.phones{display:grid;grid-template-columns:repeat(3,minmax(0,330px));gap:22px}
@media(max-width:900px){.two,.three,.phones{grid-template-columns:1fr}header{grid-template-columns:1fr}}
table{width:100%;border-collapse:collapse;font:14px/1.5 Inter,sans-serif;margin:8px 0 26px}
th,td{text-align:left;vertical-align:top;padding:10px 12px 10px 0;border-bottom:1px solid var(--line)}
th{font:500 11px/1.4 JetBrains Mono,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
td.k{font:500 13px/1.5 JetBrains Mono,monospace;color:var(--gold-l);white-space:nowrap}
.pass{color:var(--pass);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
.fail{color:var(--fail);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
.open{color:var(--gold);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
ul{padding-left:1.2em;color:var(--mute);max-width:80ch}li{margin:6px 0}li b{color:var(--ink);font-weight:500}
.mono{font:13px/1.6 JetBrains Mono,monospace;color:var(--mute)}
</style></head>
<body><div class="wrap">
<header><div><div class="eyebrow">ЭРА · Spike C · pass 7 · опыт, не архитектура</div>
<h1>The archive at full length<small>Направление утверждено: архив на рейке. Этот проход — только качество опыта: плотность, аффорданс, материал, переходы. Ничего не перестроено.</small></h1>
<p class="lede">Four things were asked of this pass, and only these: the archive must not feel empty; the visitor must find the archive without being told; the sheets must read as one designed spatial object rather than floating pages; and the two transitions must be clean on desktop and on a phone. Below, each one with the evidence.</p></div>
<div class="spike"><b>The working spike</b><code>docs/spikes/boards/cases-ribbon-spike.html</code> · or <code>npm run dev</code> → <code>/spikes/gallery/</code></div></header>

<section><h2>1 · Density — eight cases, the archive continues through the frame</h2>
<p class="sub">The prototype's four placeholder cases plus four more in the same format (spike-only, <code class="mono">spikes/gallery/cases8.ts</code>). The staging was turned so the case <b>coming next</b> rises through the lower left and the one just left leaves at the upper right — at any position the archive is a diagonal of ${inFrame} sheets through the frame, not a photograph with a fragment beside it. Same at the head and the tail.</p>
${fig('1a', 'At 04.4 — the docked case right of centre with its own label; 04.5 rising lower left; 04.6 a corner in the fog; 04.3 leaving upper right.', '1440 × 900', await img('d2-browse-mid', 'Архив на кейсе 04.4'))}
<div class="two">
${fig('1b', 'The head of the archive: even at 04.1 the visitor sees two more results waiting and a third in the fog.', 'scroll 0', await img('d1-browse-head', 'Начало архива', 1100))}
${fig('1c', 'The tail: 04.8 docked, the archive behind it at the upper right.', 'scroll end', await img('d2t-browse-tail', 'Конец архива', 1100))}
</div></section>

<section><h2>2 · Affordance — the sheet is the affordance</h2>
<p class="sub">«Открыть кейс» was carrying the whole gesture. It no longer needs to. Every sheet in view is now a real button laid over its own screen box (a DOM grip — the canvas takes no pointer, as the architecture requires); the docked case carries a fine gold edge and its own wall label «04.4 · открыть →»; hovering or keyboard-focusing any sheet lifts it 0.22 units off the rail toward the visitor and lights its edge; a neighbour's label shows its number, and the verb appears only when the pointer arrives. The boxed button became a mono link — the keyboard and screen-reader way in — so there is one primary CTA per viewport again.</p>
${fig('2a', 'Pointer on the next case: it lifts off the rail (distance 6.55 → 6.31), its edge lights, its label says «открыть →». The docked case keeps its edge and label at all times.', 'hover on 04.5', await img('d2h-hover-next', 'Наведение на следующий кейс'))}
<table><tr><th>What the visitor sees</th><th>Before this pass</th><th>Now</th></tr>
<tr><td class="k">what is interactive</td><td>nothing on the sheet; a boxed «Открыть кейс» and the index</td><td>cursor + lift + lit edge on any sheet; the docked one is labelled «открыть →»</td></tr>
<tr><td class="k">which is the current case</td><td>the biggest one</td><td>the biggest one, and the only one with a gold edge and a label at rest; the rail's glint sits under it</td></tr>
<tr><td class="k">how to open</td><td>read the hint</td><td>click the thing that lifts when you touch it; the link «Открыть кейс 04.4 →» and the index remain for keyboard and screen readers</td></tr>
<tr><td class="k">hint text</td><td>two clauses</td><td>«листайте — архив идёт вдоль рейки», bottom right, one clause</td></tr></table>
</section>

<section><h2>3 · One spatial object</h2>
<p class="sub">Three material changes make the sheets read as an archive hung on a rail rather than pages in a void. <b>The rail is real:</b> a single hairline helix that runs level across the top edge of each sheet and descends between them — the sheets hang from it, and it passes behind them. <b>Depth is on the surface:</b> the mineral dark gathers along each curved sheet with distance, so a sheet turns away into the fog rather than being uniformly dimmed; neighbours lose contrast and colour. <b>Gold is light:</b> one fine glint just inside the docked sheet's edge, brightest where the key falls, dying along the far edges — never a frame. The clipped-fragment treatment of pass 6 was dropped: a whole sheet reads as a documented result; a slice does not.</p>
${fig('3a', 'The real projected boxes of the sheets at 04.4, read from the running scene: the docked case at 33 % of the viewport width and 5.33 units; neighbours at 1.1–2.4× that distance, scaled 0.82, no silhouette touching the docked one.', 'measured', await annotated('d2-browse-mid', 1440, 900, 3))}
<table><tr><th></th><th>pass 6</th><th>pass 7</th></tr>
<tr><td class="k">helix · angle · drop</td><td>7.5 · 25° · 1.7</td><td>7.5 · 20° · 1.5 — wound the other way, so the next case comes round on the left</td></tr>
<tr><td class="k">the visitor</td><td>4.55 outside the helix, the dock 45 % wide, ~90 % tall</td><td>5.2 outside, the dock 33 % wide, 68 % tall — room for the archive around it</td></tr>
<tr><td class="k">sheets in frame</td><td>1 + a fragment</td><td>${inFrame} (at the head: 3)</td></tr>
<tr><td class="k">neighbours</td><td>clipped fragments, scaled 0.72</td><td>whole sheets, scaled 0.82, cooled and flattened, fog along the surface</td></tr>
<tr><td class="k">the rail</td><td>a vertical hairline at the helix axis, 7.5 units behind the sheets</td><td>a helix with landings through the sheets' top edges, drawn behind them, glint under the dock</td></tr>
<tr><td class="k">the docked case</td><td>only larger</td><td>larger, lit edge, its own label, the rail's glint</td></tr></table>
</section>

<section><h2>4 · Transitions — measured per frame</h2>
<p class="sub">Browse → focus: the chosen sheet leaves the rail, travels in camera space (so it approaches monotonically) and unrolls flat; the archive recedes but stays visible — a single result taken out of a collection. The words arrive at 72 % of the travel, not after it. Focus → return: the sheet re-wraps onto the rail; if the page was scrolled while the case was open the rail now catches up with a 0.7 s ease instead of jumping on the next scroll event; scrolling the section away closes the case. The browse block, index and grips fade rather than vanish.</p>
${fig('4a', 'The unfold in six frames — the sheet comes forward and flattens while the archive steps back.', 'u = 0 · 0.2 · 0.38 · 0.56 · 0.76 · 1', await img('d6-unfold', 'Раскрытие листа в шесть кадров', 1600))}
<table><tr><th>continuity (per animation frame, 60 fps)</th><th>desktop open</th><th>desktop return</th><th>phone open</th><th>phone return</th></tr>
<tr><td class="k">largest step of the unfold value</td><td>0.041</td><td>0.048</td><td>0.041</td><td>0.049</td></tr>
<tr><td class="k">largest move of the sheet</td><td>12 px</td><td>16 px</td><td>8 px</td><td>10 px</td></tr>
<tr><td class="k">largest change of width</td><td>10 px</td><td>8 px</td><td>4 px</td><td>3 px</td></tr>
<tr><td class="k">monotonic</td><td>yes</td><td>yes</td><td>yes</td><td>yes</td></tr></table>
<p class="sub">A jump would be a 50–100 px step in one frame; the largest here is 16 px on a ~400 px journey — the peak of an eased travel. Sheets do not write depth, so the travelling sheet never cuts into a neighbour.</p>
<div class="two">
${fig('4b', 'The open case: the sheet at 68 % of the frame, the editorial block beside it, the archive receded behind — still an archive.', 'после', await img('d3-open', 'Открытый кейс', 1100))}
${fig('4c', '«Сравнить»: the pointer opens the earlier state as a soft field, mixed by opacity only — nothing moves.', 'курсор', await img('d5-open-compare', 'Сравнение до и после', 1100))}
</div></section>

<section><h2>5 · The phone — its own composition</h2>
<p class="sub">The frame is too narrow for a neighbour beside the docked case, so the archive is a stack with a slight twist: the docked case in the upper half at 68 % width with its label under it, the next case rising from the lower left behind the words' scrim, the previous one leaving at the upper right under the label's scrim. Open: the sheet at 83 % width above the words, never under them. Tap the sheet, or «Открыть кейс →».</p>
<div class="phones">
${fig('5a', 'Browsing at 04.3 — the next case waits in the dark below.', '390 × 844', await img('m1-browse', 'Архив на телефоне', 780))}
${fig('5b', 'Open — the sheet above the words.', 'после', await img('m2-open', 'Открытый кейс на телефоне', 780))}
${fig('5c', 'Hold the picture — «до».', 'удержание', await img('m3-open-before', 'Кадр до на телефоне', 780))}
</div>
${fig('5d', 'The unfold on the phone in four frames.', 'u = 0 · 0.35 · 0.65 · 1', await img('m4-unfold', 'Раскрытие на телефоне', 1600))}
</section>

<section><h2>6 · Verdict</h2>
<table><tr><th>asked</th><th>evidence</th><th></th></tr>
<tr><td class="k">the archive does not feel empty</td><td>8 cases; ${inFrame} sheets in frame mid-archive, 4 at the head; «08 кейсов» in the kicker</td><td class="pass">PASS</td></tr>
<tr><td class="k">interactive · current · how to open — without instruction</td><td>lift + lit edge + cursor on any sheet; gold edge, label and glint on the docked one; hover measured 6.55 → 6.31 and back; Tab reaches the sheets</td><td class="pass">PASS</td></tr>
<tr><td class="k">a designed spatial object</td><td>the rail through the sheets' top edges with landings; fog along the surface; whole neighbours; measured gaps</td><td class="pass">PASS — judge on the board</td></tr>
<tr><td class="k">browse → focus, focus → return, no jumps, no collisions</td><td>per-frame: max 16 px, monotonic, 0 % over 33 ms; scroll catch-up 0.7 s; close on leave</td><td class="pass">PASS</td></tr>
<tr><td class="k">desktop real device</td><td>real Chrome on this Mac, 1440 × 900: ${d.browse.medianMs} ms median, ${d.browse.over33} % over 33 ms, ${d.open.drawCalls} draw calls, ${d.heapMB} MB heap</td><td class="pass">PASS</td></tr>
<tr><td class="k">mobile</td><td>emulated 390 × 844 @2× touch: ${p.browse.medianMs} ms median, ${p.browse.over33} % over 33 ms, ${p.open.drawCalls} draw calls. <b>Not a real phone GPU</b> — that test still needs a device in hand</td><td class="open">OPEN</td></tr>
<tr><td class="k">reduced motion</td><td>no drift, no lift, the case opens and returns in place; measured 0 px drift over 1 s</td><td class="pass">PASS</td></tr>
<tr><td class="k">honesty</td><td>«до» vs «после» on the open sheet: best alignment at zero shift (${perf.honesty.perShift['0,0']} vs ${perf.honesty.perShift['1,0']} at 1 px); every case «Визуализация»</td><td class="pass">PASS</td></tr></table>
<ul>
<li><b>Still stand-in:</b> the eight plates are crops of the one test portrait (four of them new; two mirrored). Real consented photography replaces them; the staging is content-agnostic.</li>
<li><b>Decided here, to be confirmed:</b> a neighbour is clickable and opens directly (the travel starts from wherever it hangs). If that feels like too much motion, the alternative is that a click on a neighbour docks it first.</li>
<li><b>For production:</b> the grips are the picking model (canvas <code class="mono">pointer-events: none</code>), the rail's parameters live in one <code class="mono">STAGING</code> object per viewport class, and the 1024 px breakpoint decides which.</li>
</ul></section>
</div></body></html>`;
writeFileSync(OUT, html);
await browser.close();
console.log(OUT, Math.round(html.length / 1024), 'KB');
