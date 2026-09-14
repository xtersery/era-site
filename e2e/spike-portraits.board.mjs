// Builds the Spike D pass-13 review board (self-contained HTML, captures embedded as JPEG).
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const CAP = 'spikes/portraits/__captures__';
const OUT = 'docs/spikes/boards/specialists-sitting.html';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const jpeg = async (file, maxW = 1600, q = 0.84) =>
  page.evaluate(async ({ src, maxW, q }) => {
    const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const s = Math.min(1, maxW / img.naturalWidth);
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  }, { src: 'data:image/png;base64,' + readFileSync(file).toString('base64'), maxW, q });
const img = async (name, alt, maxW) => `<img src="${await jpeg(`${CAP}/${name}.png`, maxW)}" alt="${alt}" loading="lazy">`;
const fig = (n, what, when, inner) => `<figure class="frame">${inner}<figcaption><span class="n">${n}</span><span class="what">${what}</span><span class="when">${when}</span></figcaption></figure>`;

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Sitting</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Prata&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
:root{--bg:#e9ebe6;--bg-deep:#dfe3dd;--ink:#0f1a15;--mute:#5b6a62;--gold:#b58f47;--line:#cfd5cd;--pass:#2f6b5a;--fail:#a4482d;--dark:#0b1611}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 Inter,system-ui,sans-serif;padding-block:0 96px;padding-inline:clamp(16px,4vw,56px)}
.wrap{max-width:1560px;margin:0 auto}
header{padding:64px 0 40px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:1fr auto;gap:28px;align-items:end}
.eyebrow{font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}
h1{font:400 clamp(30px,4vw,54px)/1.02 Prata,Georgia,serif;margin:14px 0 12px;letter-spacing:-.015em;text-wrap:balance}
h1 small{display:block;font-size:.48em;color:var(--mute);margin-top:12px;line-height:1.3}
.lede{max-width:70ch;color:var(--mute);margin:0}
.spike{border:1px solid var(--gold);padding:16px 20px;font:14px/1.5 Inter,sans-serif;max-width:330px}
.spike b{display:block;font:500 11px/1 JetBrains Mono,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-bottom:8px}
.spike code{color:var(--ink);font-size:12px;word-break:break-all}
section{padding:42px 0 8px;border-bottom:1px solid var(--line)}
h2{font:400 clamp(22px,2.4vw,32px)/1.15 Prata,Georgia,serif;margin:0 0 6px}
.sub{color:var(--mute);margin:0 0 22px;max-width:78ch}
.concept{font:400 clamp(19px,1.6vw,23px)/1.4 Prata,Georgia,serif;max-width:60ch;margin:0 0 18px;color:var(--ink)}
.frame{margin:0 0 30px}
.frame img{display:block;width:100%;height:auto;background:#000;outline:1px solid var(--line)}
.frame figcaption{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:baseline;padding:12px 0 0;font:13px/1.45 JetBrains Mono,monospace;color:var(--mute)}
.frame .n{color:var(--gold)}
.frame .when{text-align:right;white-space:nowrap}
.two{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.phones{display:grid;grid-template-columns:repeat(3,minmax(0,330px));gap:22px}
@media(max-width:900px){.two,.phones{grid-template-columns:1fr}header{grid-template-columns:1fr}}
table{width:100%;border-collapse:collapse;font:14px/1.5 Inter,sans-serif;margin:8px 0 26px}
th,td{text-align:left;vertical-align:top;padding:10px 12px 10px 0;border-bottom:1px solid var(--line)}
th{font:500 11px/1.4 JetBrains Mono,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
td.k{font:500 13px/1.5 JetBrains Mono,monospace;color:var(--ink);white-space:nowrap}
.pass{color:var(--pass);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
.fail{color:var(--fail);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
.open{color:var(--gold);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
ul{padding-left:1.2em;color:var(--mute);max-width:80ch}li{margin:6px 0}li b{color:var(--ink);font-weight:500}
.mono{font:13px/1.6 JetBrains Mono,monospace;color:var(--mute)}
.dark{background:var(--dark);color:#d9dcd6;padding:28px clamp(16px,3vw,40px);margin:0 0 26px}
.dark h3{font:400 20px/1.2 Prata,Georgia,serif;margin:0 0 10px;color:#eae6dc}
.dark p{margin:0 0 10px;max-width:78ch;color:#b7c0b9}
.dark code{color:#f3dfae}
</style></head>
<body><div class="wrap">
<header><div><div class="eyebrow">ЭРА · Spike D · Специалисты · pass 15 · a natural mineral becomes the architecture of ERA</div>
<h1>«Сеанс» — the sitting<small>Закреплённая портретная галерея: одна стена, один портрет в масштабе человека, одна встреча за раз. Проход 15 — выход из комнаты: дымчатый кварц не исчезает и не подменяется картинкой — тот же камень полируется, его включения прорастают в стену, и стена клиники оказывается тем же минералом, ставшим архитектурой.</small></h1>
<p class="concept">One wall of a light room. One portrait at a time, at the scale of a person. The visitor never browses a staff list — she meets a specialist and reads her label. At rest, <b>the focal line</b> — a calibration hairline — runs from the typeset name across the wall to the eyes of the woman in the portrait. Between specialists <b>a slab of smoky quartz</b> crosses the frame and is the change itself: ahead of it the portrait being left is compressed into its leading edge; inside it the arriving portrait is seen bent through the smoke; behind it the arriving portrait is drawn out of its trailing edge and settles. The seam has the stone's silhouette. Remove the stone and nothing happens. Nothing slides, nothing fades, nothing is a card.</p>
<p class="lede">Deliberately absent: cards, thumbnails, a row of faces, arrows, avatars, a grid, any carousel motion, blur, any lens on a real face. Two other directions were argued and dropped: the <i>double page</i> (name as a masthead, a page-turn between people — a slider in disguise) and a <i>focus pull</i> between two portraits at different depths (blur on a real face: an effect, and against the site's rule).</p></div>
<div class="spike"><b>The working spike</b><code>docs/spikes/boards/specialists-sitting-spike.html</code> · or <code>npm run dev</code> → <code>/spikes/portraits/</code> · <code>?k=&amp;f=</code> freezes a state · <code>?k=3&amp;e=</code> a stage of the exit</div></header>

<section><h2>0 · What changed in the layout logic (pass 2)</h2>
<p class="sub">In pass 1 each state's text block was placed from <i>that portrait's</i> eye position, so a one-line name in one state and a two-line name in the next moved the whole label — the drift you saw. The rule is now the other way round. <b>The eye line is a fixed datum of the grid</b> — 30 % down the frame — and each portrait is cropped so that her eyes land on it (the cover-fit crop slides within its vertical slack; the text never moves for a portrait). The label is two blocks on that datum: the <b>head</b> (index + name) hangs <i>upward</i> from the datum, so a name of one line or two changes nothing below it; the <b>body</b> (role → focus → sentence → facts → CTA) starts a fixed 28 px <i>below</i> the datum. Both live in one editorial column: the gutter to a 30 rem measure. The foot holds only the row of four; the count sits with the wall label. The «далее — [name] ↓» line is gone and nothing replaces it.</p>
${fig('0a', 'All four states, one grid: name bottom 268, role 298, sentence 401, focal line 270 — identical to the pixel on every state (measured); only the facts row follows the sentence\'s length.', '05.1 · 05.2 · 05.3 · 05.4', await img('d0-grid', 'Четыре состояния на одной сетке', 1600))}
<table><tr><th>element</th><th>rule</th></tr>
<tr><td class="k">datum</td><td>30 % of the frame height; the focal line lies on it; each portrait's eye is brought to it by the crop</td></tr>
<tr><td class="k">head</td><td>index + name; anchored by its <i>bottom</i> to the datum; grows upward; Prata clamp 2.6–4.9 rem, max 11ch, two lines at most</td></tr>
<tr><td class="k">body</td><td>role · focus · sentence · facts · CTA; anchored by its <i>top</i> to datum + 28 px; gaps 10 px, sentence +18 px, facts +18 px with a hairline, CTA +20 px</td></tr>
<tr><td class="k">column</td><td>from the gutter, 30 rem wide (the wall is 44 % of the viewport, so the column ends with air before the frame)</td></tr>
<tr><td class="k">foot</td><td>the row 05.1–05.4 only, at the gutter; the count lives in the wall label</td></tr>
<tr><td class="k">phone</td><td>the same order in flow: portrait 55 %, wall 45 %; head and body stack from a fixed top; the facts in a 13.5ch column; the row at the foot</td></tr></table>
</section>

<section><h2>A · Resting state — meeting 05.1</h2>
<p class="sub">The wall takes 44 % and holds the label; the frame takes 56 % and holds her, full height, bleeding off three edges. The name is set in Prata at display scale with its last baseline on her eye line; the focal line leaves the name, crosses the wall in ink, crosses onto the portrait in gold and stops short of her eye with a small ring — the instrument's mark. Below the name, in order: her role, what she works with most, her sentence in her own voice, the facts as a mono table, and one primary CTA «Записаться к …» with the route to the services beside it. At the foot: the row of four.</p>
${fig('A1', 'At rest on 05.1. Every resting state is a complete editorial page: readable without motion.', '1440 × 900', await img('d1-rest-1', 'Состояние покоя — специалист 05.1'))}
${fig('A2', 'The focal line, close: the name, the wall, the edge of the frame where ink becomes gold, the ring before her eye.', 'detail', await img('d4-focal', 'Фокальная линия — деталь', 1400))}
</section>

<section><h2>B · The mineral environment; the change comes out of the stone</h2>
<p class="sub"><b>Placement.</b> The crystal moved from the text column to the boundary: centre at 45.5 % of the width (the boundary is at 44 %), 60 % of the height, 64 % of the section tall — its left third over the wall, its right two-thirds entering from the image's edge, its top and bottom in view. It is not inside the text area; the words that cross it are the sentence's longer lines (the sentence's measure widened to 40ch) and the focal line, the name staying on the wall. The fallback photograph stands at the same place.</p>
<p class="sub"><b>Dominance.</b> The surface is now the photograph pulled toward its own shadowed taupe (22 % of <code class="mono">#8f8479</code>) with contrast 0.82 and saturation 0.82; the body's opacity 0.86 and its alpha thinning to 34 % in the clear zones; clearcoat 0.35, environment 0.7; the glass layer's roughness 0.46 and environment 0.45; the shadow at 0.3. The viewer meets the portrait first; the stone is what the light does at the edge of it.</p>
<p class="sub"><b>The environment.</b> Three fragments of the same body — the same geometry and photograph, opacity 0.62, environment 0.5 — at the extreme edges: one at the right edge half outside (26 % tall), one at the top right (18 %), one at the lower-left corner (20 %), at depths 0.3–0.55 between the picture and the crystal. Each on its own slow drift (bob and a few degrees over 33–57 s) and a slight parallax with the change. Phone: two, at the right and lower-left edges.</p>
<p class="sub"><b>The transition</b> is pass 12's, the stone staying: under the stone the field is the arriving portrait from the first moment; a front leaves the stone's edge and crosses the frame, the departing portrait compressed ahead of it and the arriving one drawn out behind it; the stone turns 7° and settles; the words lead (out over f 0 → 0.2, in from the name over 0.22 → 0.5). With the stone on the boundary the front now starts at the image's own edge: the image is revealed through the mineral, not by a crystal crossing it.</p>
${fig('B1', 'Ten frames of one scroll step, f = 0 · 0.1 · 0.2 · 0.3 · 0.42 · 0.55 · 0.68 · 0.8 · 0.9 · 1.', '05.2 → 05.3', await img('d5-transition', 'Смена выходит из минерала — десять кадров', 1600))}
${fig('B2', 'The boundary, close: at rest, the front leaving the stone, midway.', 'f = 0 · 0.3 · 0.55', await img('d6-shard', 'Граница крупно', 1600))}
<table><tr><th>layer, back to front</th><th>what</th></tr>
<tr><td class="k">0 · ground</td><td>the wall's surface (CSS) and the DOM plates in the frame — the no-WebGL state</td></tr>
<tr><td class="k">2 · the scene</td><td>the wall plane · the field plane (the portrait) · the fragments (z 0.3–0.55) · the crystal (z 1.5) with its shadow</td></tr>
<tr><td class="k">4 · the focal line</td><td>from the name to her eyes, across the stone</td></tr>
<tr><td class="k">5 · the words</td><td>the label — the sentence crossing the stone — the wall label, the row</td></tr></table>
<table><tr><th>the stone</th><th>how</th></tr>
<tr><td class="k">place</td><td>x 45.5 %, y 60 %, h 64 % of the section (phone: x 20 %, y 56 %, h 30 %); z 1.5</td></tr>
<tr><td class="k">surface</td><td>the photograph at 78 % over <code class="mono">#8f8479</code>, contrast 0.82, saturation 0.82, brightness 1.04; alpha 1 − 0.66 × clear; opacity 0.86; roughness 0.58 × map; bump 0.04; clearcoat 0.35 / 0.24; env 0.7</td></tr>
<tr><td class="k">glass</td><td>over the clear zones: transmission 0.9, thickness 1.3, ior 1.54, roughness 0.46 × map, attenuation <code class="mono">#8f847b</code> at 4, clearcoat 0.2, env 0.45</td></tr>
<tr><td class="k">fragments</td><td>same geometry and maps; opacity 0.62, env 0.5, clearcoat 0.2; no glass; positions and sizes above; drift periods 33 / 45 / 57 s; parallax (0.012 + 0.008 z) × (f − 0.5) of the width</td></tr>
<tr><td class="k">cost</td><td>60 fps median, p95 16.8 ms while scrubbing on 1440 × 900; 10 draw calls</td></tr></table>
</section>

<section><h2>C · Another resting state — 05.3</h2>
${fig('C1', 'At rest on 05.3: the stone on the boundary, the sentence crossing it, the fragments at the edges.', '1440 × 900', await img('d3-rest-3', 'Состояние покоя — специалист 05.3'))}
${fig('C2', '05.4 — a one-line role, a short sentence: the same grid.', '1440 × 900', await img('d3b-rest-4', 'Состояние покоя — специалист 05.4'))}
</section>

<section><h2>D · The phone — its own composition</h2>
<p class="sub">The portrait takes the top 57 % full-bleed, the label sits on the wall beneath it; the section label and the count are set on the portrait under a light scrim; the focal line runs from the screen's edge to her eye. The name, the role, her sentence, the facts, the CTA, and the row of four at the foot. The same shard crosses the portrait; the same masked lines set the words.</p>
<div class="phones">
${fig('D1', 'At rest on 05.1.', '390 × 844', await img('m1-rest-1', 'Телефон — состояние покоя', 780))}
${fig('D2', 'Mid-transition, f = 0.5 — the same shard, 34 % of the frame wide.', '05.1 → 05.2', await img('m2-mid', 'Телефон — середина перехода', 780))}
${fig('D3', 'At rest on 05.3 — the same panel.', '390 × 844', await img('m3-rest-2', 'Телефон — третий специалист', 780))}
</div>
${fig('D4', 'The transition on the phone in six frames.', '05.3 → 05.4', await img('m4-transition', 'Переход на телефоне', 1600))}
</section>

<section><h2>E · Interaction model and how it is driven</h2>
<div class="dark"><h3>Interaction model</h3>
<p>The section pins for (N − 1) × 100 vh. Page scroll is the only driver; nothing intercepts the wheel. Progress maps to a position <code>t</code> on the row of specialists: <code>k = ⌊t⌋</code> is the one being met, <code>f = t − k</code> the way to the next. Between whole states the transition is scrubbed by the scroll; when the scroll stops, ScrollTrigger snaps to the nearest whole state with the site's mineral ease (0.35–0.9 s), so every resting state is a complete page. Secondary control: the row 05.1–05.4 scrolls the page to a state (ScrollTo, 0.9 s); it is a real list of buttons; only the current label's CTA is in the Tab order; an <code>aria-live</code> line announces who is met.</p>
<h3>How it is driven</h3>
<p>The section is DOM and CSS; the transition object alone is WebGL, isolated in its own canvas over the frame. Four portraits are stacked <code>&lt;figure&gt;</code>s; the incoming one is revealed by a <code>mask-image</code> gradient whose edge trails the shard; the outgoing one gets a 4 % <code>translateX</code>. The labels are stacked <code>&lt;article&gt;</code>s revealed by vertical <code>mask-image</code> gradients (masked lines). During a transition the frame is drawn in a WebGL canvas over it (R3F, <code>spikes/portraits/scene/</code>): a composite plane carrying the field around the stone, and the quartz refracting a buffer of the arriving portrait; the pose comes from the same <code>apply(k, f)</code>. The CSS shard of pass 3 is the no-WebGL fallback (a plain reveal, not the field). The focal line is one element whose top/left/width come from the eye's projected position (cover-fit maths from the image's 4 : 5 and the sitter's eye fractions) and the name's measured right edge; its ink/gold split is a CSS variable set to the wall's edge. All of it is written in one <code>apply(k, f)</code> from ScrollTrigger's <code>onUpdate</code>. Reduced motion: <code>f</code> is never used — whole states at thresholds, no snap tween, no light. Measured: 60 fps median, 0 % of frames over 33 ms while scrubbing on 1440 × 900.</p>
<h3>What is real, what stands in</h3>
<p>Real: the mechanic, the driver, the snap, the row, the keyboard and touch paths, the Russian placeholder copy from <code>src/data/specialists.ts</code>. Stand-in: the four portraits are four crops and grades of the ONE generated test portrait — the same woman four times, mirrored twice — labelled «[Плейсхолдер — заменить на реальную съёмку]» on every frame; the sentence, the focus line and the facts are bracketed placeholders. Real specialists are four different women in one grade and one light; the staging is portrait-agnostic (each portrait carries only its eye position).</p></div>
</section>

<section><h2>G · Leaving the room — a natural mineral becomes the architecture of ERA (pass 15)</h2>
<p class="concept">The visitor scrolls past the last specialist and the section does not end — its material changes state. The smoky quartz stays where it is and stops being an object: its glass goes (translucent → opaque mineral), the same body on the same geometry polishes, its smoke deepens to the wall's graphite. The wall shows the structure that was always under its plaster. Then the stone's own interior — its inclusions, its fractures — expands out of it into the wall: sampled from its photograph, reflected at its silhouette the way a slab is book-matched, re-coloured into the wall's palette, its facet ridges carried along as the first pale veins. The clinic's slab arrives as a lit surface, from the stone and from the edge, and the stone is left in it as a relief in the graphite band. The founder's room stands on the same wall. Nothing is swapped: the crystal and the wall are one geology at two moments.</p>
<p class="sub">Pass 14 was rightly failed: it laid a photograph <i>under</i> the stone and cross-faded to it — a texture replacement. This pass keeps the WebGL stone system intact and builds the wall as a second material layer that the stone <i>becomes</i>. The reference is <code>docs/references/wallpapers.png</code>, the frontal view of the material; it is cut at native scale, never stretched, and lit.</p>
${fig('G0', 'The two materials at the same scale. Left: the smoky quartz — warm smoke concentrated along facets, clear zones, chipped edges, ridges catching light. Right: the window of the wall the section lays on its width — grey-beige stone, blue-grey bands, graphite bands whose interior is fractured like crushed crystal, thin pale veins, ochre inclusions, slab seams. The same geology: the raw crystal, and the crystal cut, laid and polished.', 'reference', await img('d7a-materials', 'Два материала', 1600))}
${fig('G1', 'Phase 1 · the current state — the sitting at rest, 05.4; the quartz resident on the boundary.', 'e = 0', await img('ex-0', 'Стадия 1 — состояние покоя', 1600))}
${fig('G2', 'Phases 1 – 3 · the stone stays and stops being an object: its glass gone, its surface polishing, the wall\'s structure showing in the plaster and the portrait from the stone outward (0.22) · geological transformation: its interior expanding into the wall as graphite and pale veins, the slab arriving from the stone and the right edge (0.5) · the wall as a lit surface, the stone a polished mineral in its band (0.75) · the marble architecture: slabs, seams, depth, the stone a relief in the graphite, the pale slab on the left for typography (1).', 'e = 0.22 · 0.5 · 0.75 · 1', await img('d7-exit-grid', 'Стадии выхода', 1600))}
${fig('G3', 'The stone alone, eight moments: glass first; then the polish — roughness 0.58 → 0.22, clearcoat 0.35 → 0.8, bump gone, its colour to graphite, on the photograph\'s own surface; around it its interior spreading (the crystal book-matching itself, its ridges as veins); its skin giving way to that interior; its facets kept as shading — a carved form in the slab.', 'e = 0 … 1', await img('d8-exit-stone', 'Камень: восемь моментов', 1600))}
${fig('G4', 'The entry into the next section, on the live page: the settled wall at the end of the pin, the scroll carrying on, the seam between the scene and the next section\'s own surface (the same native-scale sheet, continuing to the pixel and to the tone — measured 115.9 vs 115.7 luminance across the seam), and the founder\'s room darkening on the real material.', 'scrolled past the pin', await img('d9-entry', 'Вход в следующую секцию', 1800))}
${fig('G5', 'The phone: the same evolution; the sheet laid on twice the width, centred, so the slabs read at the scale of a wall.', 'e = 0 · 0.25 · 0.5 · 0.75 · 1', await img('m5-exit', 'Выход на телефоне', 1600))}
<div class="dark"><h3>The transformation logic</h3>
<p><b>Compared.</b> The quartz's smoke is the wall's graphite; the quartz's clear zones are the wall's blue-grey bands; the quartz's facet ridges are the wall's thin pale veins; the glints on its ridges are the wall's ochre inclusions — gold as light. What differs is state: raw, chipped, translucent, one body — against cut, laid, polished, many slabs. So the transition is a change of state, not of material.</p>
<p><b>Phase 1 — the quartz stays (0 → 0.35).</b> The geometry, the photograph on it and its place do not change. Transmission goes first (glass overlay 1 → 0 by 0.35): the stone stops letting light through and becomes opaque mineral. Its shadow lifts and its breathing comes to rest: it is no longer an object in front of the wall. The wall's veining — the reference's own luminance — appears as shading in the plaster and in the portrait, spreading out of the stone, the room's light dimming with it (a multiply pass): structure before colour, the way stone shows through a thin skin of plaster.</p>
<p><b>Phase 2 — geological transformation (0.15 → 0.75).</b> The same body polishes: roughness 0.58 → 0.22, clearcoat 0.35 → 0.8, bump 0.04 → 0, its tint from the room's warm smoke to graphite — rough edges to a polished surface, on the photograph's own pixels. Around it, the wall's albedo is the stone's interior: its photograph (with its alpha, ungraded) sampled with coordinates pulled toward the stone, expanding ×1 → ×3.6 over e, reflected at the silhouette so beyond its edges the crystal continues itself as a slab is book-matched; only its dense smoke expands (the clear zones let the wall's own stone show), re-coloured to the wall's graphite with its blue at the edges; the front face's facet ridges, baked from the geometry, ride along as thin pale veins with a breath of gold. This region spreads sideways along the band, little beyond the stone's ends, and never fully covers the wall's stone (≤ 78 %) — the two are co-present. The slab arrives as a second, later front out of the stone and in from the right edge, its edge running ahead along the veins; the typography column on the left receives it last.</p>
<p><b>Phase 3 — marble architecture (0.6 → 1).</b> The surface is lit, not pasted: a normal from the wall's luminance (its own relief), one key from the upper left, a diffuse 0.74 + 0.28, a broad soft sheen (pow 18, 0.10 — polished, not mirror), a fine grain (± 1 %), the key falling a little brighter toward the upper left. The stone's skin gives way (0.55 → 0.95) to its own expanded interior beneath; its facets remain as a multiply shading (0.66 + 0.5 · n·L) — a relief carved in the band — and the interior region settles back to 30 % so the wall's band is what carries it. Slabs and seams are the reference's; the founder's opening lays the same sheet from −(23.32 vw + 100 svh) and darkens into the site's green-black ground.</p>
<p><b>How the reference was translated.</b> Slabs in <code>wallpapers.png</code> are ≈ 452 px square (seams at x 384 · 836 · 1289, y 456). A window 836 px wide from x 784 — chosen so the graphite band passes through the stone's place (x 45 %) and the pale centre of the diamond sits under the typography column — is cut at native resolution over the full height and mirrored once vertically (the wall is book-matched), 836 × 1882. Laid on the section's width (1.72 × on 1440 — no stretch, uniform scale), the section's top 195 px down it; on the phone on twice the width, centred. No grade; average <code>#87827e</code>. It is the albedo of a lit surface, never a background.</p>
<p><b>What it is not.</b> No morph target, no texture cross-fade, no shader shapes, no glass, no CSS mask; the stone's geometry, photograph and place are untouched to the end; the marble never grows crystals — the crystal grows into the wall.</p>
<table><tr><th>value</th><th>desktop</th></tr>
<tr><td class="k">exit scroll</td><td>100 vh after the last state; no snap; <code>e</code> scrubbed · <code>?k=3&amp;e=</code></td></tr>
<tr><td class="k">words</td><td>masked lines lift 0.05 → 0.45; label, row, focal line fade 0.15 → 0.6</td></tr>
<tr><td class="k">portrait</td><td>recedes into the wall's tone 0.05 → 0.6 (a faint print of its light kept)</td></tr>
<tr><td class="k">structure (multiply)</td><td>from the stone, reach (e − 0.04) × 2.3, edge ± 0.35; vein 0.05 → 0.13, dim 0.03 → 0.12</td></tr>
<tr><td class="k">interior expansion</td><td>grow = smooth(0.12 → 0.72); expansion 1 + 2.6 · grow; region r 0.45 → 1.65 … 1 → 4 stone half-widths, sideways; weight ≤ 0.78, settling to 30 % by 1; density gate lum 0.18 → 0.62; ridges 35 %</td></tr>
<tr><td class="k">slab front</td><td>from the stone (e − 0.3) × 2.2 and from the right edge (e − 0.22) × 1.7, ± 0.3 along the veins; from 0.28</td></tr>
<tr><td class="k">stone</td><td>glass → 0 by 0.35 · polish 0.15 → 0.6 · body → 0 over 0.55 → 0.95 (depthWrite off in the exit; drawn after the field) · relief 0.4 → 0.85 · depth × 0.4, pose to rest, z 1.5 → 0.96</td></tr>
<tr><td class="k">surface</td><td>normal from luminance (×3), key (−0.5, 0.55, 0.75), diffuse 0.74 + 0.28, sheen pow 18 × 0.10, grain ± 1 %, fall 0.95 → 1.04</td></tr>
<tr><td class="k">fragments · shadow</td><td>gone by 0.5; the shadow lifts by 0.5</td></tr>
<tr><td class="k">no WebGL · reduced motion</td><td>the same sheet as a CSS layer over the section, 0 → 1 over 0.3 → 0.8 (reduced motion: whole states — the wall arrives as a cut)</td></tr>
<tr><td class="k">cost</td><td>one plane in two passes, one more stone pass; scrub 60 fps median, 0 % over 33 ms; 11 draw calls</td></tr></table>
<table><tr><th>criterion</th><th>judgement</th><th></th></tr>
<tr><td class="k">material continuity — «the crystal and the wall are the same material»</td><td>the wall around the stone is the stone's interior, in the wall's palette; the stone polishes on its own photograph; its ridges become the first veins; it ends as a relief in the band</td><td class="pass">PASS — judge in motion on the spike</td></tr>
<tr><td class="k">the stone stays, stops being an object, blends into the structure</td><td>place, geometry and photograph untouched; glass and shadow go first; the wall's structure and the stone's interior meet</td><td class="pass">PASS</td></tr>
<tr><td class="k">not a texture swap · not stretched · not a flat background</td><td>native scale, uniform 1.72 ×; albedo of a lit surface with its own relief; the stone's interior is its own source</td><td class="pass">PASS</td></tr>
<tr><td class="k">marble architecture: slabs, seams, depth, polished not mirror, imperfections</td><td>the reference's slabs and seams; luminance relief; sheen 0.10 at pow 18; grain</td><td class="pass">PASS</td></tr>
<tr><td class="k">quiet · expensive · editorial; not lobby / showroom / casino / fantasy crystal</td><td>one light, no gloss, no colour beyond the stone's; the pale slab left for typography</td><td class="pass">PASS</td></tr>
<tr><td class="k">the reflections at the silhouette</td><td>the crystal book-matching itself can crease where its edge reflects; a slow warp folds it — a small residual crease can still be found at the stone's upper left around e ≈ 0.5</td><td class="open">OPEN</td></tr>
<tr><td class="k">the settled wall's brightness</td><td>the wall keeps the reference's daylight; the darkening into 06 is the next section's gradient</td><td class="open">OPEN</td></tr></table>
</section>

<section><h2>F · Verdict against the creative goal</h2>
<table><tr><th>criterion</th><th>judgement</th><th></th></tr>
<tr><td class="k">feels premium · editorial</td><td>display serif on the eye line, the wall-label system, asymmetric split, air on the wall; no cards, no chrome</td><td class="pass">PASS</td></tr>
<tr><td class="k">feels human · one specialist at a time</td><td>one portrait at the scale of a person, her name on her eye line, her sentence in her voice; progression is only the count and the row</td><td class="pass">PASS</td></tr>
<tr><td class="k">text locked to a grid · no drift · every state equally resolved</td><td>0a: four states, identical positions to the pixel; the datum rule; «далее» removed</td><td class="pass">PASS</td></tr>
<tr><td class="k">calm and expert</td><td>the only motion is one stone turning; text never fades or slides; every rest is a full page</td><td class="pass">PASS</td></tr>
<tr><td class="k">the quartz is the mechanism, not a prop</td><td>remove it and there is no seam and no field — the frame stays on the outgoing portrait; the arriving portrait exists only inside and behind the stone (B1)</td><td class="pass">PASS</td></tr>
<tr><td class="k">«this is a smoky quartz stone» at first glance</td><td>the photograph's own surface on a body with the photograph's own silhouette; asymmetric, chipped, volumetric, dense with clear zones; a shadow on the portrait</td><td class="pass">PASS — judge in motion on the spike</td></tr>
<tr><td class="k">integrated, not pasted on</td><td>inside the frame at 86 % height, grounded by its shadow, entering and leaving fully, the field following it softly beyond its ends; the resting state untouched</td><td class="pass">PASS</td></tr>
<tr><td class="k">integrated into the panel, not floating</td><td>it lives on the seam, crosses the frame, leaves it almost completely; the resting state is clean and editorial</td><td class="pass">PASS</td></tr>
<tr><td class="k">belongs to ERA</td><td>a light room with light traces (hairline, focal line, the travelling light), gold only as light, the mono wall label — the same system as Cases and Services, a different mechanic</td><td class="pass">PASS</td></tr>
<tr><td class="k">not a team section · not a slider · not a grid · not a spinning gallery</td><td>no thumbnails, no arrows, no row of faces; the transition is a development, not a slide</td><td class="pass">PASS</td></tr>
<tr><td class="k">not the mechanic of Services or Cases</td><td>Services: pinned states of one editorial composition, 85 vh, snap. Cases: a spatial archive. Here: a pinned wall where portraits develop through light — same driver (page scroll, pin, snap), different object and transition</td><td class="pass">PASS — the driver is shared by design</td></tr>
<tr><td class="k">text secondary to spectacle?</td><td>no — the words are set first and are complete at every rest; the spectacle is one stone, gone at every rest</td><td class="pass">PASS</td></tr>
<tr><td class="k">the mid-transition frame</td><td>for a fraction of a second two faces share the frame in a soft band; with four different real women this is a double exposure, not the symmetry the stand-ins show. To be judged on real photography</td><td class="open">OPEN</td></tr>
<tr><td class="k">real device</td><td>real Chrome on this Mac; the phone is emulated</td><td class="open">OPEN</td></tr></table>
<ul>
<li><b>Decisions to confirm:</b> 100 vh per transition (Services uses 85); the datum at 30 % as the organising rule for the real shoot (eyes at 28–32 % of a 4 : 5 frame, three-quarter or frontal, one light) — the crop can absorb ±10 % of the frame height, no more.</li>
<li><b>Noted for the shoot brief:</b> 4 : 5, the head with air above, the eyes at 28–32 % of the height, the nearer eye's position recorded per frame.</li>
</ul></section>
</div></body></html>`;
writeFileSync(OUT, html);
await browser.close();
console.log(OUT, Math.round(html.length / 1024), 'KB');
