// Builds the Spike D pass-7 review board (self-contained HTML, captures embedded as JPEG).
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
<header><div><div class="eyebrow">ЭРА · Spike D · Специалисты · pass 7 · the quartz from the photograph</div>
<h1>«Сеанс» — the sitting<small>Закреплённая портретная галерея: одна стена, один портрет в масштабе человека, одна встреча за раз. Проход 7 — камень взят из референса буквально: его силуэт, его сколы, его дым внутри. Он — механизм смены: уберите камень — перехода нет.</small></h1>
<p class="concept">One wall of a light room. One portrait at a time, at the scale of a person. The visitor never browses a staff list — she meets a specialist and reads her label. At rest, <b>the focal line</b> — a calibration hairline — runs from the typeset name across the wall to the eyes of the woman in the portrait. Between specialists <b>a slab of smoky quartz</b> crosses the frame and is the change itself: ahead of it the portrait being left is compressed into its leading edge; inside it the arriving portrait is seen bent through the smoke; behind it the arriving portrait is drawn out of its trailing edge and settles. The seam has the stone's silhouette. Remove the stone and nothing happens. Nothing slides, nothing fades, nothing is a card.</p>
<p class="lede">Deliberately absent: cards, thumbnails, a row of faces, arrows, avatars, a grid, any carousel motion, blur, any lens on a real face. Two other directions were argued and dropped: the <i>double page</i> (name as a masthead, a page-turn between people — a slider in disguise) and a <i>focus pull</i> between two portraits at different depths (blur on a real face: an effect, and against the site's rule).</p></div>
<div class="spike"><b>The working spike</b><code>docs/spikes/boards/specialists-sitting-spike.html</code> · or <code>npm run dev</code> → <code>/spikes/portraits/</code> · <code>?k=&amp;f=</code> freezes a state</div></header>

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

<section><h2>B · Transition — the smoky quartz carries the next portrait</h2>
<p class="sub"><b>Pass 6's stone was a convex hull — a cut gem, not this stone.</b> Pass 7 takes the reference literally. <code class="mono">src/assets/smoky-quartz.png</code> is traced (<code class="mono">e2e/spike-portraits.quartz.mjs</code>): its silhouette row by row — the real chipped, concave flanks — and the luminance of the smoke inside. The body is a structured grid laid over that silhouette, so the outline is the photograph's; the faces swell to a thickness that tapers into the flanks (1.4 units at the fullest — a chunky stone, not a pane) and carry a relief of a few large planes meeting at ridges — a crystal's faces; four rim strips close it. The photograph itself goes <i>inside</i>: lifted, it is the tint map (the smoke as density in the glass), its luminance the roughness map (dark smoke is cloudier) and the bump map (the fractures and planes). The material is ERA Mineral Glass tuned to smoky quartz — taupe attenuation in the thickness, no dispersion, no sparkle, polished but not plastic. It keeps the photograph's proportion (0.43), stands a little taller than the frame, and turns −14° → +12° about the vertical with a slight lean forward and a hanging tilt as it crosses.</p>
<p class="sub"><b>The mechanism is unchanged from pass 6 and is the point:</b> during a transition the frame is drawn as one field around the stone — ahead of it the portrait being left, compressed toward its leading edge and softened; behind it the portrait arriving, drawn out of its trailing edge and settling; inside it the arriving portrait refracted through the smoke. The seams are the stone's own silhouette (the same trace, per row, leaned with its tilt), tucked a little inside the body so they are never seen beside it. Remove the stone and there is no seam and no field. The resting state is the clean DOM plate.</p>
${fig('B1', 'Ten frames of one scroll step, f = 0 · 0.12 · 0.24 · 0.36 · 0.46 · 0.56 · 0.66 · 0.78 · 0.9 · 1. Nothing changes until the stone arrives; the arriving face exists only inside and behind it; when it leaves, the state is clean. (Stand-ins are crops of one test face.)', '05.2 → 05.3', await img('d5-transition', 'Переход через дымчатый кварц в десяти кадрах', 1600))}
${fig('B2', 'The stone, close, at three moments: arriving — the departing face compressed into its chipped edge; mid-frame — the arriving face bent through the smoke and the fractures; leaving — the new portrait clean behind its flank.', 'f = 0.32 · 0.52 · 0.72', await img('d6-shard', 'Кварц крупно в три момента', 1600))}
<table><tr><th>the stone</th><th>how</th></tr>
<tr><td class="k">form</td><td>112 rows of left/right edge from the photograph's alpha; a 112 × 40 grid per face; thickness 0.18–1.0 × depth by distance to the flanks and ends; relief = max of 7 (front) / 6 (back) planes × 0.55 × depth; rim strips with their own normals; height 1.06 × the frame, width by the photograph's aspect × 0.92 (phone 0.8), depth 1.4 (phone 1.1)</td></tr>
<tr><td class="k">inside</td><td>the photograph's crop box as three maps: tint (36 % over <code class="mono">#efe9e0</code>), roughness (0.3 + 0.6 × (1 − luminance)), bump (luminance, scale 0.035); uv in the box, so the smoke lands where it is in the stone</td></tr>
<tr><td class="k">material</td><td>drei transmission: transmission 0.9, thickness 1.45, ior 1.54, roughness 0.56 × map, anisotropic blur 0.34 (phone 0.26), attenuation <code class="mono">#9d9189</code> at 4.8, colour <code class="mono">#ebe4da</code>, clearcoat 0.5 / 0.28, chromatic aberration 0.006, env 1.35; 6 samples at 1024 (phone 4 at 512). A first build at half the tint and a browner, denser smoke read as a dark brown slab: the reference is a light stone</td></tr>
<tr><td class="k">the field</td><td>as pass 6: ahead uv + w·0.55·amount, behind uv − w·amount, w = e<sup>−d/wake</sup>, 5-tap softening × w, wake 0.16, amount 0.05, settle over f 0.86 → 1; the edge profile is now the trace (linear-filtered), inset 22 % of the stone's half-width</td></tr>
<tr><td class="k">motion</td><td>centre 132 % → −36 % of the frame on the eased seam (it enters and leaves fully); rotateY −14° → +12°; rotateZ −5° → −2°; rotateX −3° → +2°; 3 % drift down; z 1.7</td></tr>
<tr><td class="k">cost</td><td>60 fps median, p95 16.8 ms, 1.3 % over 33 ms while scrubbing on 1440 × 900 (real Chrome, Metal) — the 112 × 40 × 2 body under 6-sample transmission; phone emulated</td></tr></table>
</section>

<section><h2>C · Another resting state — 05.3</h2>
${fig('C1', 'A tighter portrait, the same page. The focal line finds her eye at its own height; the name sits on it.', '1440 × 900', await img('d3-rest-3', 'Состояние покоя — специалист 05.3'))}
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

<section><h2>F · Verdict against the creative goal</h2>
<table><tr><th>criterion</th><th>judgement</th><th></th></tr>
<tr><td class="k">feels premium · editorial</td><td>display serif on the eye line, the wall-label system, asymmetric split, air on the wall; no cards, no chrome</td><td class="pass">PASS</td></tr>
<tr><td class="k">feels human · one specialist at a time</td><td>one portrait at the scale of a person, her name on her eye line, her sentence in her voice; progression is only the count and the row</td><td class="pass">PASS</td></tr>
<tr><td class="k">text locked to a grid · no drift · every state equally resolved</td><td>0a: four states, identical positions to the pixel; the datum rule; «далее» removed</td><td class="pass">PASS</td></tr>
<tr><td class="k">calm and expert</td><td>the only motion is one stone turning; text never fades or slides; every rest is a full page</td><td class="pass">PASS</td></tr>
<tr><td class="k">the quartz is the mechanism, not a prop</td><td>remove it and there is no seam and no field — the frame stays on the outgoing portrait; the arriving portrait exists only inside and behind the stone (B1)</td><td class="pass">PASS</td></tr>
<tr><td class="k">smoky quartz — the reference's form, material and character</td><td>its traced silhouette, its smoke and fractures inside, a thick asymmetric body with chipped flanks; taupe, cloudy, no rainbow, no sparkle, no glow</td><td class="pass">PASS — judge in motion on the spike</td></tr>
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
