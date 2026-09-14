// Builds the Spike E board: storyboard, timeline, camera path, material logic.
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const CAP = 'spikes/mineral/__captures__';
const OUT = 'docs/spikes/boards/mineral-passage.html';
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
const path = JSON.parse(readFileSync(`${CAP}/path.json`, 'utf8'));
const fps = JSON.parse(readFileSync(`${CAP}/fps.json`, 'utf8'));

// the camera path, drawn: side view (z across, y up) and plan (z across, x up)
function pathSvg() {
  const W = 1200, H = 360, pad = 40;
  const zMin = -1, zMax = 19.5;
  const sx = (z) => pad + ((z - zMin) / (zMax - zMin)) * (W - 2 * pad);
  const view = (axis, label) => {
    const vMin = axis === 'y' ? -5.5 : -8.5, vMax = axis === 'y' ? 5.5 : 8.5;
    const sy = (v) => H - pad - ((v - vMin) / (vMax - vMin)) * (H - 2 * pad);
    const pts = path.pts.map((p) => `${sx(p.p[2]).toFixed(1)},${sy(axis === 'y' ? p.p[1] : p.p[0]).toFixed(1)}`).join(' ');
    const st = path.stone;
    const box = axis === 'y'
      ? `<rect x="${sx(st.z - st.depth / 2)}" y="${sy(st.y + st.h / 2)}" width="${sx(st.z + st.depth / 2) - sx(st.z - st.depth / 2)}" height="${sy(st.y - st.h / 2) - sy(st.y + st.h / 2)}" fill="#8f8479" opacity=".55"/>`
      : `<rect x="${sx(st.z - st.depth / 2)}" y="${sy(st.x + st.w / 2)}" width="${sx(st.z + st.depth / 2) - sx(st.z - st.depth / 2)}" height="${sy(st.x - st.w / 2) - sy(st.x + st.w / 2)}" fill="#8f8479" opacity=".55"/>`;
    const keys = [0, 0.14, 0.34, 0.46, 0.56, 0.7, 0.86, 1].map((t) => { const p = path.pts[Math.round(t * 100)]; return `<circle cx="${sx(p.p[2])}" cy="${sy(axis === 'y' ? p.p[1] : p.p[0])}" r="4" fill="#b58f47"/><text x="${sx(p.p[2]) + 6}" y="${sy(axis === 'y' ? p.p[1] : p.p[0]) - 6}" font-size="11" fill="#b58f47">${t}</text>`; }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block;background:#0b1611;margin-bottom:10px">
      <line x1="${sx(path.wallZ)}" y1="${pad}" x2="${sx(path.wallZ)}" y2="${H - pad}" stroke="#7fb0a4" stroke-width="3"/>
      <text x="${sx(path.wallZ) + 6}" y="${pad + 12}" font-size="11" fill="#7fb0a4">the wall · z ${path.wallZ}</text>
      ${box}<text x="${sx(st.z - st.depth / 2)}" y="${pad - 8}" font-size="11" fill="#d9d2c4">the stone · z ${st.z}</text>
      <polyline points="${pts}" fill="none" stroke="#eae6dc" stroke-width="1.5"/>${keys}
      <text x="${pad}" y="${H - 12}" font-size="11" fill="#5b6a62">${label} · z from ${zMin} to ${zMax} (the sitting's camera at z 18.66)</text></svg>`;
  };
  return view('y', 'side view — y up') + view('x', 'plan — x up');
}

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Passage</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Prata&family=Inter:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap">
<style>
:root{--bg:#e9ebe6;--ink:#0f1a15;--mute:#5b6a62;--gold:#b58f47;--line:#cfd5cd;--pass:#2f6b5a;--fail:#a4482d;--dark:#0b1611}
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
.concept{font:400 clamp(19px,1.6vw,23px)/1.4 Prata,Georgia,serif;max-width:60ch;margin:0 0 18px}
.frame{margin:0 0 30px}
.frame img{display:block;width:100%;height:auto;background:#000;outline:1px solid var(--line)}
.frame figcaption{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:baseline;padding:12px 0 0;font:13px/1.45 JetBrains Mono,monospace;color:var(--mute)}
.frame .n{color:var(--gold)}.frame .when{text-align:right;white-space:nowrap}
table{width:100%;border-collapse:collapse;font:14px/1.5 Inter,sans-serif;margin:8px 0 26px}
th,td{text-align:left;vertical-align:top;padding:10px 12px 10px 0;border-bottom:1px solid var(--line)}
th{font:500 11px/1.4 JetBrains Mono,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
td.k{font:500 13px/1.5 JetBrains Mono,monospace;color:var(--ink);white-space:nowrap}
.pass{color:var(--pass);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
.fail{color:var(--fail);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
.open{color:var(--gold);font:500 12px/1 JetBrains Mono,monospace;letter-spacing:.06em}
ul{padding-left:1.2em;color:var(--mute);max-width:80ch}li{margin:6px 0}li b{color:var(--ink);font-weight:500}
.dark{background:var(--dark);color:#d9dcd6;padding:28px clamp(16px,3vw,40px);margin:0 0 26px}
.dark h3{font:400 20px/1.2 Prata,Georgia,serif;margin:0 0 10px;color:#eae6dc}
.dark p{margin:0 0 10px;max-width:78ch;color:#b7c0b9}.dark code{color:#f3dfae}
.sbcap{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;font:12px/1.4 JetBrains Mono,monospace;color:var(--mute);margin:-20px 0 34px}
.sbcap b{display:block;color:var(--gold);font-weight:500}
@media(max-width:900px){header{grid-template-columns:1fr}.sbcap{grid-template-columns:1fr}}
</style></head>
<body><div class="wrap">
<header><div><div class="eyebrow">ЭРА · Spike E · Проход · storyboard + standalone spike</div>
<h1>The Passage — «I entered the crystal, and the crystal became the clinic»<small>Кинематографический переход между 05 (дымчатый кварц) и 06 (мрамор клиники): камера входит в кварц, внутри кристалл становится стеной, камера отступает — и это стена ЭРА. Не смена фона, не подмена текстуры, не кроссфейд: одна последовательность превращения материала.</small></h1>
<p class="concept">The approved quartz stays the protagonist. The camera moves toward it until its facets fill the viewport, passes through its face, and is inside: smoke, sediment-like translucent layers, faceted planes, a thickness of mineral. There — on the crystal's own far shell, on its own photograph — the transformation happens: its smoke is read as density and takes the wall's graphite and blue-grey, its facet ridges become the first pale veins, the clinic's slab crosses the surface along them, the surface polishes, and the shell settles into the plane of the wall while the camera steps back. What the camera steps back into is the marble architecture of ERA, with the crystal's place still in its graphite band. One geometry, one photograph, one material shader on the shell and on the wall; the wall is the reference at native scale, projected in world units, never stretched.</p>
<p class="lede">Deliberately absent: a fade between two backgrounds, a slide, a zoom on a picture, a transparent glass stand-in, a marble that appears behind the stone, a stretched image, any moment where the quartz is gone before the viewer is inside it.</p></div>
<div class="spike"><b>The working spike</b><code>docs/spikes/boards/mineral-passage-spike.html</code> · or <code>npm run dev</code> → <code>/spikes/mineral/</code> · one scroll plays the film (8.2 s); scroll up at the end to return · <code>?t=0…1</code> freezes a moment · <code>?d=12</code> sets the film's length</div></header>

<section><h2>1 · Storyboard — ten moments</h2>
<p class="sub">Captured from the spike at 1440 × 900. <code>t</code> is the timeline (page scroll, 0 → 1 over 700 vh). Read left to right, top row then bottom row.</p>
${fig('S1–S5', 'A · the quartz exists — the sitting, 05.4 · B · the camera moves toward it, the words leave · B · its facets fill the viewport · C · through the face: inside, looking down the crystal’s length — facets, translucent layers, smoke · C · deeper inside', 't = 0 · 0.2 · 0.34 · 0.44 · 0.54', await img('storyboard-a', 'Раскадровка 1–5', 2400))}
<div class="sbcap"><div><b>S1 · A</b>the approved stone on the boundary</div><div><b>S2 · B</b>dolly in; the label and words lift</div><div><b>S3 · B</b>facets fill the view; the glass overlay thins, the interior starts to show through</div><div><b>S4 · C</b>through the front face; the crystal's far shell and its layers</div><div><b>S5 · C</b>inside: mineral density, dark translucent planes, the smoke around the viewer</div></div>
${fig('S6–S10', 'D · the interior becomes mineral: the smoke read as density, graphite and blue-grey, the ridges as veins · D · first marble structures: the slab crossing the shell along the veins · D/E · the shell settling into the wall’s plane as the camera steps back · E · the marble architecture · E · the wall of the clinic, the founder’s words', 't = 0.64 · 0.72 · 0.8 · 0.9 · 1', await img('storyboard-b', 'Раскадровка 6–10', 2400))}
<div class="sbcap"><div><b>S6 · D</b>mixed: the crystal's smoke in the wall's palette, its fractures as pale veins</div><div><b>S7 · D</b>marble structures on the crystal's own facets; the camera turns to face them</div><div><b>S8 · D → E</b>marble dominant; the shell flattening into the wall as the camera pulls back</div><div><b>S9 · E</b>slabs, seams, depth</div><div><b>S10 · E</b>the final wall; the pale slab under the founder's words</div></div>
</section>

<section><h2>2 · Timeline — keyframes, and the film's clock</h2>
<p class="sub">The scene's timeline is <code>t</code> (0 → 1). The film plays it on its own clock — a monotone cubic through four phases, slow at the ends of each, then a held frame: <b>recognition</b> 0 – 2.1 s (t 0 → 0.44: the mineral, the push until the facets fill the view) · <b>immersion</b> 2.1 – 3.3 s (t 0.44 → 0.62: through the face and down the crystal — the push does not stop) · <b>geological transformation</b> 3.3 – 5.9 s (t 0.62 → 0.9: structure → mineral layers → veins → slab while the camera still moves; the shell settles) · <b>reveal</b> 5.9 – 7.2 s (t 0.9 → 1: the wall, the movement settling) · <b>hold</b> 7.2 – 8.2 s. Measured on the spike: 2.1 s → 0.42 · 3.5 s → 0.64 · 6.0 s → 0.90 · 7.2 s → 1.00 · released at 8.3 s. One breath: the film is 15 % shorter than before, by removing the stops between actions, not by moving the camera faster — see section 3. The phone plays it at 0.7 ×.</p>
<table><tr><th>t</th><th>phase</th><th>camera</th><th>the stone</th><th>the material</th><th>the room · words</th></tr>
<tr><td class="k">0.00</td><td>A</td><td>(0, 0, 18.66) → the sitting's own camera, looking at the wall</td><td>resident, breathing, its shadow</td><td>—</td><td>plaster, portrait; 05.4 words</td></tr>
<tr><td class="k">0.06 – 0.22</td><td>A → B</td><td>dolly begins toward the stone</td><td>breathing comes to rest by 0.34</td><td>—</td><td>words lift and fade</td></tr>
<tr><td class="k">0.14</td><td>B</td><td>(x −1.4, y −1.5, z 9.5), target the stone</td><td></td><td></td><td></td></tr>
<tr><td class="k">0.34</td><td>B</td><td>(x −1.0, y +0.3, z 3.4) — the facets fill the view</td><td>shadow gone by 0.42</td><td>glass overlay 1 → 0 over 0.36 – 0.45; the far shell fades in 0.3 – 0.42</td><td></td></tr>
<tr><td class="k">0.40 – 0.47</td><td>B → C</td><td>through the front face at z ≈ 2.15</td><td>the front surface gives way as the viewer passes it (0.86 → 0)</td><td>layers 0 → 0.5 over 0.32 – 0.46; fog 0 → 0.16 over 0.38 – 0.52</td><td>the room leaves 0.46 – 0.56 (unseen from inside); the marble wall stands where it stood</td></tr>
<tr><td class="k">0.46 – 0.56</td><td>C</td><td>inside, at the upper third, looking down the crystal's length (z 2.1 → 1.5)</td><td>the far shell: the photograph as dark mineral, lit from behind, wisps at the near scale</td><td>uBecome 0</td><td></td></tr>
<tr><td class="k">0.54 – 0.82</td><td>D</td><td>0.56 – 0.7: the camera turns to face the far shell; 0.7: (x −0.6, y −0.5, z 3.0)</td><td>the shell's smoke → mineral (graphite / blue-grey); ridges → veins</td><td>uBecome 0 → 1; layers gone 0.64 – 0.78; fog gone 0.66 – 0.84</td><td></td></tr>
<tr><td class="k">0.66 – 0.92</td><td>D</td><td>pulls back (z 3 → 5.6 at 0.86)</td><td>the shell settles into the wall's plane (flatten 0 → 0.94 over 0.68 – 0.88; a faint relief kept)</td><td>the slab crosses the shell and the wall from the stone's place along the veins (uSpread 0 → 9 world units)</td><td></td></tr>
<tr><td class="k">0.86 – 1.00</td><td>E</td><td>settles at (0.55, 0.15, 10.05) facing the wall — the view 8.6 units wide, 2.65 slabs</td><td>a form in the graphite band</td><td>the wall: lit surface, relief from its luminance, sheen, grain</td><td>06 label and the founder's line arrive 0.88 – 0.98</td></tr></table>
</section>

<section><h2>3 · Camera path</h2>
<p class="sub">One Catmull-Rom curve for the position, one for the target, through eight keys. The timeline maps to <b>arc length</b> through a monotone cubic whose tangents are never zero at a key — so the camera never stops: measured speed along the path (world units per unit t) 68 at the start · 36 at 0.2 · 10 at 0.4 · 6 at 0.5 (deepest inside) · 15 at 0.7 · 32 at 0.9 — one deceleration into the stone and one acceleration out, no stages. The camera enters the front face, curves down the crystal's length, turns without stopping and glides back out the way it came while the shell becomes the wall; the transformation begins (t 0.54) while it is still moving in. The path in side view and in plan, sampled from the running scene; gold dots are the keys.</p>
<div class="dark">${pathSvg()}</div>
</section>

<section><h2>4 · Material blending logic</h2>
<div class="dark"><h3>One shader, two meshes</h3>
<p><b>The shell.</b> The approved quartz geometry drawn a second time with <code>side: BackSide</code> — from inside, its far faces are the crystal's interior; from outside they are invisible, so the approved stone is untouched at rest. Its material is <code>becoming.frag</code>: the stone's own photograph (with alpha, ungraded) sampled by world position, reflected at the stone's box so beyond its edges the crystal continues itself as a slab is book-matched; on the flanks, read across rather than along. Inside (<code>uInside 1</code>) it is the smoke, deepened (<code>pow 1.6 × 0.7</code>), lit from behind, with wisps of noise at the scale the photograph cannot carry, and the fog of the volume around the viewer.</p>
<p><b>uBecome 0 → 1.</b> The smoke is read as density (<code>1 − smoothstep(0.18, 0.62, luminance)</code>). Where dense it keeps its graphite; where clear it takes the wall's blue-grey band; the facet ridges — baked from the geometry (<code>createRidgeMap</code>) — become pale veins with a breath of gold. Then the slab crosses the surface as a front from the stone's place (<code>uSpread</code>), its edge running ahead along the wall's veins; where the stone was, 30 % of its smoke stays as the band the wall has there. The normal goes from the geometry's to the slab's own relief (a height field from the wall's luminance); diffuse from 0.6 + 0.4 to 0.74 + 0.28; the sheen from a low broad mineral gloss to a polished stone's (pow 18 × 0.10); grain ± 1 %.</p>
<p><b>uFlatten 0 → 0.94.</b> In the vertex shader the shell's world z settles toward the wall's plane and its normals toward the wall's; the wall plane runs the same shader at flatten 1, so the two meet as one surface — the crystal's silhouette is left as a 6 % relief in the graphite band, and nothing is drawn behind the stone that the stone itself did not become.</p>
<p><b>The wall.</b> <code>docs/references/wallpapers.png</code>, its first three whole slabs (1289 × 941, to a seam) mirrored once vertically and mirror-repeated on that seam — the wall's own book-match — laid 9.25 world units wide in the scene (a slab 3.24 units; the final view holds 2.65), placed so the pale stone sits under the founder's column and the graphite band passes through the stone. It is the albedo of a lit surface, projected in world units — never a background.</p>
<p><b>Layers.</b> Six translucent slices across the crystal's length at the facets' tilts (<code>layer.frag</code>): the photograph's density at the large scale, fbm wisps at the small, 0.5 opacity, gone by 0.78; the room's key passes through each plane as a soft sheen that moves as the viewer moves. <b>Refraction.</b> Inside, each facet of the shell reads the smoke past it shifted along its own tilt (0.045 units × normal.xy) — the planes bend what lies behind them; parallax, not blur. <b>Fog:</b> <code>FogExp2</code> 0 → 0.16 → 0 in warm graphite (<code>#5a524b</code>), matched in the custom shaders.</p></div>
<table><tr><th>value</th><th></th></tr>
<tr><td class="k">scroll</td><td>assisted: one gesture plays the film — 7.2 s + 1 s held (phone 0.7 ×), the page held meanwhile — sections 2 and 4b; <code>?t=</code>; the slider on the spike</td></tr>
<tr><td class="k">stone</td><td>the approved body + glass overlay (Spike D pass 13 materials), place x 45.5 % / y 60 % / h 64 %, z 1.5, depth 1.3; the shell and six layers added</td></tr>
<tr><td class="k">cost</td><td>scrub ${fps.median} ms median · p95 ${fps.p95} ms · ${fps.over33} % over 33 ms (${fps.n} frames, 1440 × 900, Apple M4)</td></tr>
<tr><td class="k">reduced motion</td><td>the gesture lands on the end state at once — no playback</td></tr></table>
</section>

<section><h2>4b · Interaction — the assisted scroll</h2>
<p class="sub">The passage is not scrubbed. When the section fills the viewport, one intentional gesture plays it to the end while the page is held; then the page is released and scrolls on. <code>spikes/mineral/passageController.ts</code> is the single source of truth — one state, one tween at a time, no loop of its own (it writes <code>t</code>; the scene reads it on its frame).</p>
<div class="dark"><h3>State machine</h3>
<p><code>idle → armed → playing → completed → released</code> · <b>armed</b> when the section's top is within 6 px of the viewport's and t is at 0 (or at 1, for the way back) · <b>playing</b> from one gesture: wheel ticks accumulated over 220 ms past 20 px, a touch move past 20 px, or ↓ / PageDown / Space (↑ / PageUp / Home at the end); a gesture up to 48 px off alignment still plays — the lock brings the section to the top · while <b>playing</b> the document is held (wheel, touch, keys prevented; scroll pinned to the section's top); every further gesture, either way, is ignored; a wheel up cannot reverse — the passage finishes first · <b>completed</b> at t 1, then <b>released</b> 60 ms later so the finishing gesture cannot leak into the page · after release the page scrolls on into 06 normally; at the top again, a gesture up plays the passage home.</p>
<p><b>Motion.</b> One tween drives the film's clock (<code>ease: 'none'</code>); the clock maps to t through the monotone cubic of section 2, so every phase eases in and out of its own and the speed never jumps — no GSAP default, no linear scrub. 7.2 s of motion, 1 s held, 8.2 s locked; a passage resumed from the middle picks up its clock where t stands. The way back is not the film: one eased return, 4 s power2.inOut. The phone plays the film at 0.7 ×; reduced motion lands on the end state at once. <code>?d=</code> sets the whole film's length in seconds (<code>?d=12</code>), <code>?ease=</code> the return; the slider scrubs by hand and releases the lock. Noise in the playing direction is held (the page must not creep out of alignment); input the other way passes through.</p>
<p><b>Proof</b> (Playwright, real wheel and synthetic touch):</p>
<pre style="font:12px/1.5 JetBrains Mono,monospace;color:#d9dcd6;white-space:pre-wrap;margin:0">${readFileSync(`${CAP}/interact.log`, 'utf8').trim()}</pre></div>
<table><tr><th>acceptance</th><th></th><th></th></tr>
<tr><td class="k">one intentional scroll</td><td>a 120 px wheel plays; an 8 px tick does not</td><td class="pass">PASS</td></tr>
<tr><td class="k">page locks inside the transition</td><td>y stays 0 through twelve more wheels and a wheel up</td><td class="pass">PASS</td></tr>
<tr><td class="k">plays automatically · 8 – 9 s, a held frame</td><td>t reached 1 after 7.18 s, released at 8.33 s on desktop (5.0 / 5.9 s on the phone); the phases land on their keys</td><td class="pass">PASS</td></tr>
<tr><td class="k">repeated input cannot break it</td><td>status stays playing, direction stays forward</td><td class="pass">PASS</td></tr>
<tr><td class="k">normal scrolling resumes</td><td>the wheel after release moves the page; at the top, a gesture up plays home</td><td class="pass">PASS</td></tr>
<tr><td class="k">the cinematic feeling · the reveal as a reveal</td><td>the four-phase rhythm as briefed; inside, the planes now pass the room's light and the facets refract what lies past them. The pace is the thing to judge in motion — <code>?d=12</code> is one URL away</td><td class="open">JUDGE ON THE SPIKE</td></tr></table>
</section>

<section><h2>5 · The phone</h2>
<p class="sub">Not yet composed: the standalone spike keeps the desktop layout of the sitting; the passage itself (the camera path, the interior, the wall) runs the same. To be composed once the transition is approved.</p>
${fig('P', 'The passage on a 390 × 844 viewport, five moments.', 't = 0 · 0.36 · 0.54 · 0.72 · 1', await img('phone', 'Проход на телефоне', 1800))}
</section>

<section><h2>6 · Against the brief</h2>
<table><tr><th>fail condition</th><th>here</th><th></th></tr>
<tr><td class="k">marble simply appears behind the quartz</td><td>the marble forms on the quartz's own far shell, on its own photograph, and the shell settles into the wall's plane; the wall plane runs the same shader and is unseen until the viewer is inside</td><td class="pass">PASS</td></tr>
<tr><td class="k">quartz disappears before the camera enters it</td><td>the approved surface is intact until the camera reaches its face (0.4); it gives way as the viewer passes through, and the interior is already there (0.3 →)</td><td class="pass">PASS</td></tr>
<tr><td class="k">quartz becomes transparent glass</td><td>the interior is opaque mineral — smoke, layers, facets; the only transparency is the layers' translucency and the approved glass overlay, which goes first</td><td class="pass">PASS</td></tr>
<tr><td class="k">marble is a stretched image</td><td>native resolution, projected in world units at one scale on shell and wall</td><td class="pass">PASS</td></tr>
<tr><td class="k">a fade between two backgrounds</td><td>a camera move, a material state change on one geometry, a vertex settling — no opacity cross-fade of surfaces</td><td class="pass">PASS</td></tr>
<tr><td class="k">the viewer cannot understand that quartz becomes marble</td><td>S6 – S8: the marble structures appear on the facets the viewer has just been among, and the camera steps back out of the stone into the wall. To be judged in motion</td><td class="open">JUDGE ON THE SPIKE</td></tr>
<tr><td class="k">motion quality — film, not website animation</td><td>one continuous camera, eased keys, no cuts; 60 fps. The pull-back (0.7 → 0.86) is the moment to judge: the wall arrives while the view is still close, so the slab is soft for a beat before it sharpens</td><td class="open">OPEN</td></tr></table>
<ul>
<li><b>Known soft spots:</b> S3 (facets filling the view) is the photograph at 4 ×; the inside frames are the photograph at 6 – 10 × with noise for the fine structure; the wall at 0.72 – 0.8 is 3 – 4 × before the camera is back. A macro pass of the real stone (a second, closer photograph of the same quartz) would give the interior and the approach their own detail.</li>
<li><b>Not integrated:</b> the spike is standalone (the sitting's last state is rebuilt inside it); integration into <code>spikes/portraits/</code> waits for approval of the transition.</li>
</ul></section>
</div></body></html>`;
writeFileSync(OUT, html);
await browser.close();
console.log(OUT, Math.round(html.length / 1024), 'KB');
